var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();

var userModel = require('./user.model')


function cleanFriend(obj) {
  var clean = {};
  clean.username = obj.username.S;
  clean.friend = obj.friend.S;
  clean.timestamp = obj.timestamp.S;
  return clean;
}

var myDB_getFriendship = async function(username, friend) {
  const friendlist = [null, null];
  // Forward friendship (u_1 -> u_2)
  var params1 = {
		KeyConditionExpression: "username = :username and friend = :friend",
		ExpressionAttributeValues: {
			":username" : {S: username},
      ":friend" : {S: friend},
		},
		TableName: "friends"
  	};

  const friendship1 = await db.query(params1).promise();

  if (friendship1.Items.length !== 0) {
    // user has sent request
    friendlist[0] = cleanFriend(friendship1.Items[0]);
  }

  // Backward friendship (u_2 -> u_1)
  var params2 = {
		KeyConditionExpression: "username = :username and friend = :friend",
		ExpressionAttributeValues: {
      ":username" : {S: friend},
      ":friend" : {S: username},

		},
		TableName: "friends"
  	};
  const friendship2 = await db.query(params2).promise();
  if (friendship2.Items.length != 0) {
     // friend has sent request
    friendlist[1] = cleanFriend(friendship2.Items[0]);
  }
  return friendlist;
}

var myDB_addFriend = async function(username, friend) {
  // Forward friendship (u_1 -> u_2)
  var params = {
    Item: {
        'username' : {S: username}, 
        'friend' : {S: friend},
        'timestamp' : {S: String(Date.now())}
    },
    TableName: 'friends'
  };
  try { // putItem doesn't return anything if successful/unsuccessful
    const friend1 = await db.putItem(params).promise();
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
  
}

var myDB_removeFriend = async function(username, friend) {
  var params1 = {
    Key: {
      username: {S: username},
      friend: {S: friend}
    },
    TableName: "friends"
  }

  var params2 = {
    Key: {
      username: {S: friend},
      friend: {S: username}
    },
    TableName: "friends"
  }

  try {
    const del1 = await db.deleteItem(params1).promise();
    const del2 = await db.deleteItem(params2).promise();
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }

  
}


var myDB_getPendingFriend = async function(currUser) {

  // fetch all possible users
  const users = await userModel.getAllUser();
  // filter users that sent friend req to currUser
  const pending_friends = [];
  for (var i = 0; i < users.length; i++) {
    const x = await myDB_getFriendship(users[i].username, currUser);
    // friend has sent req but currUser has not accepted
    if (x[0] !== null && x[1] === null) {
      pending_friends.push(users[i].username)
    }
  }
  return pending_friends;

}

var myDB_declineFriend = async function(currUser, friend) {
  // friend -> currUser
  // we wnat to delete this
  var params2 = {
    Key: {
      username: {S: friend},
      friend: {S: currUser}
    },
    TableName: "friends"
  }

  try {
    const del2 = await db.deleteItem(params2).promise();
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }

}













var myDB_sendFriendRequest = async function(userDict, friendDict) {
  var params1 = {
    Item: {
        'username' : {S: userDict.username}, 
        'friend' : {S: userDict.friend},
        'status' : {N: userDict.status},
        'timestamp' : {S: userDict.timestamp}
    },
    TableName: 'friends'
  };
  try { // putItem doesn't return anything if successful/unsuccessful
    const friend1 = await db.putItem(params1).promise();
  } catch (error) {
    console.log(error);
  }

  var params2 = {
    Item: {
        'username' : {S: friendDict.username}, 
        'friend' : {S: friendDict.friend},
        'status' : {N: friendDict.status},
        'timestamp' : {S: friendDict.timestamp}
    },
    TableName: 'friends'
  };
  try { // putItem doesn't return anything if successful/unsuccessful
    const friend2 = await db.putItem(params2).promise();
    return true;
  } catch (error) {
    console.log(error);
    return false;
  }
}

var myDB_updateFriendship = async function(friendList) {
  var user = friendList[0];
  var tofriend = friendList[1];
  var params1 = {
    Key: {
        username: {S: user.username},
        friend: {S: user.friend},
    },
    UpdateExpression : 'SET status :status, timestamp :time',
    ExpressionAttributeValues: {
        ':status' : user.status,
        ':time' : user.timestamp
    },
    TableName: 'friends',
    ReturnValues: 'ALL_NEW'
  };

  var params2 = {
    Key: {
        username: {S: tofriend.username},
        friend: {S: tofriend.friend},
    },
    UpdateExpression : 'SET status :status, timestamp :time',
    ExpressionAttributeValues: {
        ':status' : tofriend.status,
        ':time' : tofriend.timestamp
    },
    TableName: 'friends',
    ReturnValues: 'ALL_NEW' 
  };
  const data1 = await db.updateItem(params1).promise();
  const data2 = await db.updateItem(params2).promise();

  if (data1 && data2) {
    return true;
  } else {
    return false;
  }
}

var myDB_getAllFriends = async function(username){ 
    var params = {
      KeyConditionExpression: "username = :k",
      ExpressionAttributeValues: {
        ":k" : {S: username}
      },
      TableName: "friends"
  	};
    const data = await db.query(params).promise();
    const users = []
    // fetch all possible friends
    for (var i = 0; i < data.Items.length; i++) {
      users.push(data.Items[i].friend.S)
    }
    // fetch confirmed friends
    const friends = []
    for (var i = 0; i < users.length; i++) {
      const x = await myDB_getFriendship(users[i], username);
      if (x[0] !== null && x[1] !== null) {
        const friendData = await userModel.getUser(users[i]);
        friends.push(friendData)
      }
    }
    return friends;
}


var myDB_removeFriendships = async function(user, otherFriend) {
  var params1 = {
    Key: {
      username: {S: user},
      friend: {S: otherFriend}
    },
    TableName: "friends"
  }

  var params2 = {
    Key: {
      username: {S: otherFriend},
      friend: {S: user}
    },
    TableName: "friends"
  }

  try {
    const del1 = await db.deleteItem(params1).promise();
    const del2 = await db.deleteItem(params2).promise();
  } catch (err) {
    console.log(err);
    return false;
  }

}

var database = { 
    getFriendship : myDB_getFriendship,
    sendFriendRequest : myDB_sendFriendRequest,
    updateFriends : myDB_updateFriendship,
    getAllFriends : myDB_getAllFriends,
    removeFriendship : myDB_removeFriendships,
    addFriend: myDB_addFriend,
    removeFriend: myDB_removeFriend,
    getPendingFriends: myDB_getPendingFriend,
    declineFriend: myDB_declineFriend
  };
  
  module.exports = database;