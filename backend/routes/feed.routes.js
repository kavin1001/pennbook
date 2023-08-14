const { Router } = require("express");
const feedRouter = Router();
const { stemmer } = require('porter-stemmer')
const feedModel = require("../models/feed.model");

// check for user session on every request to friend route
feedRouter.use((req,res,next) => {
    if (!req.session.user) {
        next();
    } else {
        res.status(403);
    }
})

feedRouter.get("/search", async (req, res) => { 
    const { wordStream } = req.query;
    var words = wordStream.split(" ");
    var cleanedWords = [];
    for (let word of words) {
        var currWord = word.trim().toLowerCase();
        var checkStop = currWord == "a" || currWord == "all" || currWord == "any" || currWord == "but" || currWord == "the";
        if (!checkStop) {
            var cleanedWord = stemmer(currWord);
            cleanedWords.push(cleanedWord);
        }
    }
    const idSet = await feedModel.getArticleIDsFromWords(cleanedWords);
    const articles = await feedModel.getArticlesFromID(idSet);

    // filter out future articles
    const filteredArticles = []
    for (var i = 0; i < articles.length; i++) {
        const [year, month, day] = articles[i].date.split('-');
        const article_date = new Date(+year, month - 1, +day);
        if (Date.parse(article_date) <= Date.now()) {
            filteredArticles.push(articles[i]);
        }
    }
    filteredArticles.sort(function(a,b) {
        return new Date(b.date.replace(/-/g,'/')) - new Date(a.date.replace(/-/g,'/')) 
    });
    res.status(200).json({articles: filteredArticles});
    
});

feedRouter.post("/like-article", async (req, res) => { 
    const { username, article_id } = req.body;
    if (username && article_id) {
        const articleDict = await feedModel.getArticle(article_id);
        const array = articleDict['likes'];
        const index = array.indexOf(username);
        let like = true;
        if (index > -1) { // only splice array when item is found
            array.splice(index, 1); // 2nd parameter means remove one item only
            like = false;
        } else {
            array.push(username);
        }
        articleDict['likes'] = array;
        const result = feedModel.likeArticle(username, articleDict);
        if (result) {
            res.status(200).json({like: like});
        } else {
            res.status(400);
        }
    }
});


feedRouter.get("/get-recommendations", async (req, res) => {
    const { username } = req.query;
    if (username) {
        const idSet = await feedModel.getRecommendations(username);
        const articles = await feedModel.getArticlesFromID(idSet);
        
        console.log(username + " has " + articles.length + " articles to choose from");
        // chooses 10 articles based on the distribution of the articles during adsorption algo
        const selectArticles = await feedModel.getArticlesFromDistribution(articles, 10, username); 
        selectArticles.sort(function(a,b) {
            return new Date(b.date.replace(/-/g,'/')) - new Date(a.date.replace(/-/g,'/')) 
        });
        res.status(200).json({ articles: selectArticles });
    } else {
        res.status(400);
    
    }

});




module.exports = { feedRouter };