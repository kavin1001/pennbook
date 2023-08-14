var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();

function cleanPosts(obj) {
    var cleaned = {};
    cleaned.post_id = obj.post_id.S;
    cleaned.username = obj.username.S;
    cleaned.poster = obj.poster.S;
    cleaned.caption = obj.caption.S;
    cleaned.date = obj.date.S;
    cleaned.title = obj.title.S;
    const list = [];
    for (var i = 0; i <  obj.likes.L.length; i++) {
        list.push( obj.likes.L[i].S)
    }
    cleaned.likes = list;
    return cleaned;
}

function cleanComments(obj) {
    var cleaned = {};
    cleaned.post_id = obj.post_id.S;
    cleaned.username = obj.username.S;
    cleaned.post_wall = obj.post_wall.S;
    cleaned.comment = obj.comment.S;
    cleaned.date = obj.date.S;
    cleaned.comment_id = obj.comment_id.S;
    return cleaned;
}

var myDB_fetchPosts = async function(friend) {
    var params = {
		KeyConditionExpression: "username = :k",
		ExpressionAttributeValues: {
			":k" : {S: friend}
		},
		TableName: "posts"
  	};
    const posts = await db.query(params).promise();
    if (posts.Items.length == 0) {
        return null;
    } else {
        var postList = [];
        for (var i = 0; i < posts.Items.length; i++) {
            postList[i] = cleanPosts(posts.Items[i]);
        }

        return postList;
    }
}

var myDB_fetchComments = async function(id) {
    var params = {
		KeyConditionExpression: "post_id = :k",
		ExpressionAttributeValues: {
			":k" : {S: id}
		},
		TableName: "comments"
  	};
    const comments = await db.query(params).promise();

    if (comments.Items.length == 0) {
        return null;
    } else {
        var commentList = [];
        for (var i = 0; i < comments.Items.length; i++) {
            commentList[i] = cleanComments(comments.Items[i]);
        }
        return commentList;
    }
}

var myDB_createPost = async function(postDict) {
    var params = {
        Item: {
            'post_id' : {S: postDict.post_id}, 
            'username' : {S: postDict.username},
            'poster' : {S: postDict.poster},
            'caption' : {S: postDict.caption},
            'date' : {S: postDict.posted_at},
            'title': {S: postDict.title},
            'likes' : {L: postDict.likes}
        },
        TableName: 'posts'
    };
    try { // putItem doesn't return anything if successful/unsuccessful
        const data = await db.putItem(params).promise();
        const new_post = {
            'post_id' : postDict.post_id,
            'username' : postDict.username,
            'poster' : postDict.poster,
            'caption' : postDict.caption,
            'date' : postDict.posted_at,
            'likes' : postDict.likes,
            'title' : postDict.title
        }
        return new_post;
    } catch (error) {
        console.log(error);
        return false;
    }
}

var myDB_getPost = async function(username, post_id) {
    var params = {
		ExpressionAttributeValues:  {
            ":username" : {
                S: username
              }, 
            ":post_id" : {
                S: post_id
              }
        },
        KeyConditionExpression: "username = :username AND post_id = :post_id", 
		TableName: "posts"
  	};
    
      
    const post = await db.query(params).promise();
    if (post.Items.length == 0) {
        return null;
    } else {
        return cleanPosts(post.Items[0]);
    }
}

var myDB_updatePost = async function(id, postDict) {
    // transform new like list into this format
    // [
    //     {
    //       "S": "one"
    //     },
    //     {
    //       "S": "two"
    //     }
    //   ]
    const new_list = []
    for (var i = 0; i < postDict.likes.length; i++) {
        new_list.push({"S": postDict.likes[i]})
    }
    var params = {
        Key: {
            "username": {S: postDict.username},
            "post_id" : {S: id},
        },
        UpdateExpression : 'set likes = :likes',
        TableName: 'posts',
        ReturnValues: 'ALL_NEW', // should return dict of all attributes of item, may need to double check what is returned
        ExpressionAttributeValues: {
            ":likes": {
                "L": new_list
            }
        },
    }
    const data = await db.updateItem(params).promise();
   
    if (data.Attributes) {
        const x = data.Attributes
        return cleanPosts(x);
    } else {
        return null;
    }
}

var myDB_createComment = async function(commentDict) {
    var params = {
        Item: {
            'post_id' : {S: commentDict.post_id}, 
            'username' : {S: commentDict.username},
            'post_wall' : {S: commentDict.post_wall},
            'comment' : {S: commentDict.comment},
            'date' : {S: commentDict.date},
            "comment_id" : {S: commentDict.comment_id},
        },
        TableName: 'comments'
    };
    try { // putItem doesn't return anything if successful/unsuccessful
        const data = await db.putItem(params).promise();
        return commentDict;
    } catch (error) {
        console.log(error);
        return false;
    }

}

var myDB_deletePost = async function(username, post_id) {
    var params1 = {
        Key: {
           username: {S: username}, 
           post_id: {S: post_id},
        },
        TableName: "posts"
      }


    try {
    const del1 = await db.deleteItem(params1).promise();
    
    return true;
    } catch (err) {
    console.log(err);
    return false;
    }

}

var myDB_deleteComments = async function(post_id) {
    
    var params2 = {
		KeyConditionExpression: "post_id = :k",
		ExpressionAttributeValues: {
			":k" : {S: post_id}
		},
		TableName: "comments"
  	};

    try {
        const data = await db.query(params2).promise();
        var comments = [];
        for (var i = 0; i < data.Items.length; i++) {
            comments.push(cleanComments(data.Items[i]));
        }
        
        // delete individiually messages
        for (var i = 0; i < comments.length; i++) {
            var params3 = {
                Key: {
                    post_id: {S: post_id},
                    comment_id: {S: comments[i].comment_id},
                },
                TableName: "comments"
            }
            await db.deleteItem(params3).promise();
        }

        return true;
    } catch (err) {
        console.log(err);
        return false;
    }

}




var database = { 
    fetchPosts : myDB_fetchPosts,
    fetchComments : myDB_fetchComments,
    createPost : myDB_createPost,
    getPost : myDB_getPost,
    updatePost : myDB_updatePost,
    createComment : myDB_createComment,
    deletePost: myDB_deletePost,
    deleteComments: myDB_deleteComments
  };

  module.exports = database;