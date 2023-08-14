var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();

function cleanedArticle(obj) {
    var cleaned = {};
    cleaned.id = obj.id.N.toString();
    cleaned.authors = obj.authors.S;
    cleaned.category = obj.category.S;
    cleaned.date = obj.date.S;
    cleaned.description = obj.description.S;
    cleaned.headline = obj.headline.S;
    const list = [];
    for (var i = 0; i <  obj.likes.L.length; i++) {
        list.push( obj.likes.L[i].S)
    }
    cleaned.likes = list;
    cleaned.link = obj.link.S;
    return cleaned;
}


var myDB_getArticleIDsFromWords = async function(keyWords) {
    var articleIDs = new Set();
    for (let word of keyWords) {
        var params = {
            KeyConditionExpression: "keyword = :k",
            ExpressionAttributeValues: {
                ":k" : {S: word}
            },
            TableName: "inverted"
        };
        const data = await db.query(params).promise();
        if (data.Items.length !== 0) {
            for (const item of data.Items) {
                articleIDs.add(item.id.N); 
            }
        }
    }
    return articleIDs;
}

var myDB_getRecommendations = async function(username) {
    var params = {
        KeyConditionExpression: "username = :k",
        ExpressionAttributeValues: {
        ":k" : {S: username}
        },
        TableName: "recommendations"
    };
    const data = await db.query(params).promise();
    var articleIDs = new Set();
    if (!data.Items.length !== 0) {
        for (const item of data.Items) {
            if (item.seen.N == 0) {
                articleIDs.add(item.article_id.N);
            }
        }
    }
    return articleIDs;
}

var myDB_getArticlesFromID = async function(idSet) {
    const articles = [];
    for (let id of idSet) {
        var params = {
            KeyConditionExpression: "id = :k",
            ExpressionAttributeValues: {
            ":k" : {N: id}
            },
            TableName: "news"
        };
        const data = await db.query(params).promise();
        if (data.Items.length !== 0) {
            const curr = data.Items[0];
            result = {};
            result['id'] = curr.id.N;
            result['authors'] = curr.authors.S;
            result['category'] = curr.category.S;
            result['date'] = curr.date.S;
            result['description'] = curr.description.S;
            result['headline'] = curr.headline.S;
            result['link'] = curr.link.S;
            const list = [];
            for (var i = 0; i <  curr.likes.L.length; i++) {
                list.push( curr.likes.L[i].S)
            }
            result['likes'] = list;
            articles.push(result);
        }
    }
    
    return articles;
}

var myDB_getArticle = async function(id) {
   
    var params = {
        KeyConditionExpression: "id = :k",
        ExpressionAttributeValues: {
        ":k" : {N: id}
        },
        TableName: "news"
    };
    const data = await db.query(params).promise();
    if (!data.Items.length !== 0) {
        const curr = data.Items[0];
        result = {};
        result['id'] = curr.id.N;
        result['authors'] = curr.authors.S;
        result['category'] = curr.category.S;
        result['date'] = curr.date.S;
        result['description'] = curr.description.S;
        result['headline'] = curr.headline.S;
        result['link'] = curr.link.S;
        const list = [];
        for (var i = 0; i <  curr.likes.L.length; i++) {
            list.push( curr.likes.L[i].S)
        }
        result['likes'] = list;
        return result;
    }
    return [];
    
}

var myDB_getArticlesFromDistribution = async function(articles, num, username) {
    articles.sort(() => 0.5 - Math.random());
    const selectArticles = articles.slice(0, num);
    for (const article of selectArticles) {
        var params = {
            Key: {
                "username" : {S: username},
                "article_id" : {N: article.id},
            },
            UpdateExpression : 'set seen = :seen',
            TableName: 'recommendations',
            ReturnValues: 'ALL_NEW', 
            ExpressionAttributeValues: {
                ":seen": {
                    "N": "1"
                }
            },
        }
        const data = await db.updateItem(params).promise();
    }
    return selectArticles;
}


var myDB_likeArticle = async function(username, articleDict) {
    const new_list = []
    for (var i = 0; i < articleDict.likes.length; i++) {
        new_list.push({"S": articleDict.likes[i]})
    }
    var params = {
        Key: {
            "id" : {N: articleDict.id},
        },
        UpdateExpression : 'set likes = :likes',
        TableName: 'news',
        ReturnValues: 'ALL_NEW', 
        ExpressionAttributeValues: {
            ":likes": {
                "L": new_list
            }
        },
    }
    const data = await db.updateItem(params).promise();
    

    var paramsSeen = {
        Item: {
            'username' : {S: username}, 
            'article_id' : {N : articleDict.id},
            'seen': {N: "1"}
        },
        TableName: 'recommendations',
    };
    try { // putItem doesn't return anything if successful/unsuccessful
        const seen = await db.putItem(paramsSeen).promise();
    } catch (error) {
        console.log(error);
        return false;
    }

    if (data.Attributes) {
        const x = data.Attributes
        return cleanedArticle(x);
    } else {
        return null;
    }
}

var database = { 
    getArticleIDsFromWords: myDB_getArticleIDsFromWords,
    getArticlesFromID: myDB_getArticlesFromID,
    likeArticle: myDB_likeArticle,
    getArticle: myDB_getArticle,
    getRecommendations: myDB_getRecommendations,
    getArticlesFromDistribution: myDB_getArticlesFromDistribution
  };
  
  module.exports = database;