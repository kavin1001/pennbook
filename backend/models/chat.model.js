var AWS = require('aws-sdk');
AWS.config.update({region:'us-east-1'});
var db = new AWS.DynamoDB();
const userModel = require('./user.model')


// Channel DB methods
function cleanChannel(obj) {
    var cleaned = {};
    cleaned['channel_id'] = obj.channel_id.S;
    cleaned['channel_name'] = obj.channel_name.S;
    const users = []
    for (var i = 0; i < obj.users.L.length; i++) {
        users.push(obj.users.L[i].S)
    }
    cleaned['users'] = users;
    cleaned['changedName'] = obj.changedName.S;
    return cleaned;
}

function cleanInvites(obj) {
    var cleaned = {};
    cleaned['channel_id'] = obj.channel_id.S;
    cleaned['inviter'] = obj.inviter.S;
    cleaned['invitee'] = obj.invitee.S;
    return cleaned;
}

function cleanChat(obj) {
    var cleaned = {};
    cleaned['channel_id'] = obj.channel_id.S;
    cleaned['user'] = obj.user.S;
    cleaned['message'] = obj.message.S;
    cleaned['timestamp'] = obj.timestamp.N;
    return cleaned;
}

// Do I need utf-8-validate package?
var myDB_createChannel = async function(channel_id, users) {
    const new_list = []
    for (var i = 0; i < users.length; i++) {
        new_list.push({"S": users[i]})
    }
    var params = {
        Item: {
            "channel_id": {S: channel_id},
            "users": {L: new_list},
            "channel_name": {S: users[0]},
            "changedName": {S: "0"}
        },
        TableName: "channels"
    };
    const data = await db.putItem(params).promise();
    if (data.Items && data.Items.length > 0) {
        return cleanChannel(data.Items);
    } else {
        return null;
    }
}

// create channel DB function
var myDB_joinChannel = async function(username, channel_id) {
    const channel = await myDB_getChannel(channel_id);
    const new_list = [{"S": username}]
    for (var i = 0; i < channel.users.length; i++) {
        new_list.push({"S": channel.users[i]})
    }

    var params = {
        Key: {
            "channel_id": {S: channel_id},
        },
        UpdateExpression : 'SET #u = :users',
        TableName: 'channels',
        ReturnValues: 'ALL_NEW',
        ExpressionAttributeValues: {
            ":users": {
                "L": new_list
            }
        },
        ExpressionAttributeNames: {
            "#u": "users"
        }
    }
    const data = await db.updateItem(params).promise();
    if (data) {
        var obj = data.Attributes;
        return cleanChannel(obj);
    } else {
        return null;
    }


}

var myDB_leaveChannel = async function(channel_id, user) {
    // Not the most efficient way to do this because we are rewriting all of the users?
    // Any other ways to delete one particular user from a list of users
    const channel = await myDB_getChannel(channel_id);
    const new_list = []
    for (var i = 0; i < channel.users.length; i++) {
        if (channel.users[i] !== user) {
            new_list.push({"S": channel.users[i]})
        }
        
    }
    var params = {
        Item: {
            "channel_id": {S: channel_id},
            "users": {L: new_list},
        },
        TableName: "channels"
    };
    const data = await db.putItem(params).promise();

    const userData = await userModel.getUser(user);
    const new_chat_list = []
    for (var i = 0; i < userData.chats.length; i++) {
        if (userData.chats[i] !== channel_id) {
            new_chat_list.push({"S": userData.chats[i]})
        }
        
    }
    var params2 = {
        Key: {
            "username": {S: user},
        },
        UpdateExpression : 'SET chats = :chats',
        TableName: 'users',
        ReturnValues: 'ALL_NEW',
        ExpressionAttributeValues: {
            ":chats": {
                "L": new_chat_list
            }
        },
    }
    const data2 = await db.updateItem(params2).promise();
    return {"new_users": new_list, "new_chat_list": new_chat_list};
}

var myDB_getChannel = async function(channel_id) {
    var params = {
		KeyConditionExpression: "channel_id = :k",
		ExpressionAttributeValues: {
			":k" : {S: channel_id}
		},
		TableName: "channels"
  	};
    
    const data = await db.query(params).promise();
    if (data.Items.length == 0) {
        return null;
    } else {
        var obj = data.Items[0];
        console.log(obj);
        var cleaned = cleanChannel(obj);
        return cleaned;
    }
    
}

var myDB_deleteChannel = async function(channel_id) {
    var params1 = {
        Key: {
            channel_id: {S: channel_id},
        },
        TableName: "channels"
    }

    // delete all chats
    var params2 = {
		KeyConditionExpression: "channel_id = :k",
		ExpressionAttributeValues: {
			":k" : {S: channel_id}
		},
		TableName: "chats"
  	};


    
    try {
        const del1 = await db.deleteItem(params1).promise();
        const data = await db.query(params2).promise();
        var messages = [];
        for (var i = 0; i < data.Items.length; i++) {
            messages.push(cleanChat(data.Items[i]));
        }
        
        // delete individiually messages
        for (var i = 0; i < messages.length; i++) {
            var params3 = {
                Key: {
                    channel_id: {S: channel_id},
                    timestamp: {N: messages[i].timestamp}
                },
                TableName: "chats"
            }
            await db.deleteItem(params3).promise();
        }

        return true;
    } catch (err) {
        console.log(err);
        return false;
    }
}

// Chat methods

var myDB_sendChat = async function(channelID, timestamp, user, message) {
    var params = {
        Item: {
            "channel_id": {S: channelID.toString()},
            "timestamp": {N: timestamp.toString()},
            "user": {S: user},
            "message": {S: message}
        },
        TableName: "chats"
    };
    const data = await db.putItem(params).promise();
    return data;
}

// send channel invite DB function
var myDB_sendInvite = async function(channel_id, invitee, inviter) {
    var params = {
        Item: {
            "channel_id": {S: channel_id},
            "invitee": {S: invitee},
            "inviter": {S: inviter},
        },
        TableName: "chat_invites"
    };
    const data = await db.putItem(params).promise();
    return data.Items && data.Items.length > 0;
}


// retrieve chat invites DB function
var myDB_getInvites = async function(user) {
    var params = {
		KeyConditionExpression: "invitee = :k",
		ExpressionAttributeValues: {
			":k" : {S: user}
		},
		TableName: "chat_invites"
  	};
    
    const data = await db.query(params).promise();
    if (data.Items.length == 0) {
        return null;
    } else {
        var invites = [];
        for (var i = 0; i < data.Items.length; i++) {
            invites.push(cleanInvites(data.Items[i]));
        }
        return invites;
    }
}

// delete channel invites (upon rejection)
var myDB_deleteInvite = async function(inviter, invitee) {
  var params1 = {
    Key: {
       inviter: {S: inviter},
       invitee: {S: invitee}
    },
    TableName: "chat_invites"
  }


  try {
    const del1 = await db.deleteItem(params1).promise();
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }

}


//Returns a list of chats. Are these chats sorted by order?
var myDB_getChats = async function(channelID) {
    // Use the query method to complete with channelID as the hashkey
    
    var params = {
        KeyConditionExpression: "channel_id = :k",
        ExpressionAttributeValues: {
            ":k": {S: channelID}
        },
        TableName: "chats"
    };
    const data = await db.query(params).promise();
    if (data.Items.length == 0) {
        return null;
    } else {
        var messages = [];
        for (var i = 0; i < data.Items.length; i++) {
            messages.push(cleanChat(data.Items[i]));
        }
        return messages;
    }
}

// get users who are in the channel
var myDB_getChannelsUser = async function(username) {
    const user = await userModel.getUser(username);
    
    const channels = [];
    for (var i = 0; i < user.chats.length; i++) {
        const x = await myDB_getChannel(user.chats[i]);
        channels.push(x);
    }
    return channels;
}

// rename channel name
var myDB_changeChannelName = async function(channel_id, new_name) {
    var params = {
        Key: {
            channel_id : {S: channel_id},
        },
        UpdateExpression : 'SET channel_name = :channel_name, changedName = :changed_name',
        ExpressionAttributeValues: {
            ':channel_name' : {S: new_name},
            ":changed_name": {S: "1"},
        },
        TableName: 'channels',
        ReturnValues: 'ALL_NEW' // should return dict of all attributes of item, may need to double check what is returned
    }
    const data = await db.updateItem(params).promise();
    if (data) {
        var obj = data.Attributes;
        return cleanChannel(obj);
    } else {
        return null;
    }
}

var myDB_changeChannelName2 = async function(channel_id, new_name) {
    var params = {
        Key: {
            channel_id : {S: channel_id},
        },
        UpdateExpression : 'SET channel_name = :channel_name, changedName = :changed_name',
        ExpressionAttributeValues: {
            ':channel_name' : {S: new_name},
            ":changed_name": {S: "0"},
        },
        TableName: 'channels',
        ReturnValues: 'ALL_NEW' // should return dict of all attributes of item, may need to double check what is returned
    }
    const data = await db.updateItem(params).promise();
    if (data) {
        var obj = data.Attributes;
        console.log(obj);
        return cleanChannel(obj);
    } else {
        return null;
    }
}

var database = {
    createChannel: myDB_createChannel,
    joinChannel: myDB_joinChannel,
    leaveChannel: myDB_leaveChannel,
    getChannel: myDB_getChannel,
    deleteChannel: myDB_deleteChannel,
    sendChat: myDB_sendChat,
    getChats: myDB_getChats,
    sendInvite: myDB_sendInvite,
    getInvites: myDB_getInvites,
    deleteInvite: myDB_deleteInvite,
    getChannels: myDB_getChannelsUser,
    changeChannelName: myDB_changeChannelName,
    defaultNameChange: myDB_changeChannelName2
}

module.exports = database;