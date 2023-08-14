const e = require("express");
const { Router } = require("express");
const postsRouter = Router();
var postModel = require('../models/posts.model')
var friendModel = require('../models/friends.model')
const uuid = require('uuid');

// check for user session on every request to friend route
postsRouter.use((req,res,next) => {
    if (!req.session.user) {
        next();
    } else {
        res.status(403);
    }
})

postsRouter.get('/getAllposts', async (req,res) => {
    // optionally pass in friend to filter posts, else return all of friends posts (ordered time) (terms of time)
    const user_session = req.session.user;
    const { username } = req.query;        
    const friends = await friendModel.getAllFriends(username);
   
    let posts = [];
    var user_posts = await postModel.fetchPosts(username); // done - jeremy
    if (user_posts !== null) {
        posts = [...posts, user_posts];
    }

    for (var i = 0; i < friends.length; i++) {
        const f_posts = await postModel.fetchPosts(friends[i].username);
        posts = [...posts, f_posts];
        
    }
    // flatten posts
    const all_posts = [];
    for (var i = 0; i < posts.length; i++) {
        if (posts[i] !=  null) {
            for (var j = 0; j < posts[i].length; j++) {
                all_posts.push(posts[i][j])
            }
        }
    }

    if (all_posts.length === 0) {
        res.status(200).json({posts: []});
        return;
    }
    // sort posts and return in rev-chron order
    all_posts.sort(function(a,b) {
        return parseInt(b.date) - parseInt(a.date)
    });
    
    res.status(200).json({posts: all_posts});
}); 

postsRouter.get("/getPostsByUser", async (req, res) => {
    const user_session = req.session.user;
    const { username } = req.query;
    let posts = [];
    var user_posts = await postModel.fetchPosts(username); // done - jeremy
   
    if (user_posts !== null) {
        for (const post of user_posts) {
            const comments = await postModel.fetchComments(post.post_id); // done - jeremy
            if (comments !== null) {
                post['comments'] = comments; 
            }
        }
        posts = [...posts, user_posts]; 
    }
    if (posts.length === 0) {
        res.status(200).json({posts: []});
        return;
    }
    const result = posts[0]
    // sort posts and return in rev-chron order
    result.sort(function(a,b) {
        return parseInt(b.date) - parseInt(a.date)
    });
    res.status(200).json({posts: result});

})

postsRouter.post('/create-post', async (req,res) => {
    const user_session = req.session.user;
    // create uuid for post id, use post sender and post for (can be diff since you can post on your own)
    const { friend, caption, username } = req.body;
    
    // TODO: generate uuid for post_id... might be a db function 
    // (searched up no dynamodb function, think need use npm uuid module) - jeremy
    let title = "";
    if (username === friend) {
        title = friend
    } else {
        title = friend + " > " + username
    }
    

    const postVals = {
        post_id: uuid.v4(),
        username: username, // current person who is posting
        poster: friend,     // wall post will live on;; if empty, then poster = username
        caption: caption,
        posted_at: String(Date.now()),
        likes: [],
        title: title
    }

    

    const result = await postModel.createPost(postVals); // done (so username is the wall ur posting to? poster/friend is the person who 
                                                                 //   created the post?) - jeremy
    if (result) {
        res.status(200).json({post: result});
    } else {
        res.status(400);
    }
});


postsRouter.post('/like-post', async (req,res) => {
    const user_session = req.session.user;

    // like/unlike post and add username to the liekd array
    // return array of who currently likes the post
    const { post_id, poster, username } = req.body; 

    const postVals = await postModel.getPost(poster, post_id); // done - jeremy
    const array = postVals['likes'];
    const index = array.indexOf(username);
    let like = true;
    if (index > -1) { // only splice array when item is found
        array.splice(index, 1); // 2nd parameter means remove one item only
        like = false;
    } else {
        array.push(username);
    }
    postVals['likes'] = array;
    const result = await postModel.updatePost(post_id, postVals);
    if (result) {
        res.status(200).json({postVals, like: like});
    } else {
        res.status(400);
    }
    res.status(200);

});

postsRouter.post('/comment-post', async (req,res) => {
    const user_session = req.session.user;
    // add comment in db (by post id and username)
    // note: username is the user whose post we are commenting on and friend is the person who is commenting.
    const { post_id, comment, post_wall, username } = req.body;
    const commentVals = {
        post_id: post_id,
        comment_id: uuid.v4(),
        username: username,
        post_wall: post_wall,
        comment: comment,
        date: Date.now().toString()
    }
    const result = await postModel.createComment(commentVals); // done - jeremy
    if (result) {
        res.status(200).json({comment: result});
    } else {
        res.status(400);
    }

});

postsRouter.get('/getComments', async (req,res) => {
    const user_session = req.session.user;
    // add comment in db (by post id and username)
    // note: username is the user whose post we are commenting on and friend is the person who is commenting.
    const { post_id } = req.query;


    const result = await postModel.fetchComments(post_id); // done - jeremy
    if (result) {
        result.sort(function(a,b) {
            return parseInt(a.date) - parseInt(b.date)
        });
    }
    res.status(200).json({comments: result});

});

postsRouter.post('/deletePost', async (req,res) => {
    const user_session = req.session.user;
    // add comment in db (by post id and username)
    // note: username is the user whose post we are commenting on and friend is the person who is commenting.
    const { username, post_id } = req.body;


    const r = await postModel.deletePost(username, post_id); 
    //delete all comments
    await postModel.deleteComments(post_id)
    res.status(200);

});


module.exports = { postsRouter };