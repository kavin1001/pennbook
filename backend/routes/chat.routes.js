const { Router } = require("express");
const chatRouter = Router();
const chatModel = require("../models/chat.model");
const userModel = require('../models/user.model')
const uuid = require('uuid');
const { LexRuntime } = require("aws-sdk");

// check for user session on every request to friend route
chatRouter.use((req,res,next) => {
    if (!req.session.user) {
        next();
    } else {
        res.status(403);
    }
})


chatRouter.post("/create-channel", async (req, res) => {
    const { channel_id, users, username } = req.body;

    // Pushing the channel to the creator's list of channels
    const user = await userModel.addChannel(username, channel_id);

    // Pushing the channel to all of the users' list of channels
    for (let i = 0; i < users.length; i++) {
        const user = await userModel.addChannel(users[i], channel_id);
    }

    // Creating the channel
    const channel = await chatModel.createChannel(channel_id, users);
    if (channel) {
        res.status(200).json({success: true});
    } else {
        res.status(400).json({success: false});
    }

});

chatRouter.post("/change-channel-name", async (req, res) => {
    const { channel_id, new_name } = req.body;
    const channel = await chatModel.changeChannelName(channel_id, new_name);
    if (channel) {
        res.status(200).json({success: true});
    } else {
        res.status(400).json({success: false});
    }
});

chatRouter.post("/send-invite", async (req, res) => {
    const { inviter, invitee } = req.body;

    // Pushing the channel to the creator's list of channels
    const channel_id = uuid.v4();
    const channel = await chatModel.createChannel(channel_id, [inviter]);
    const user = await userModel.addChannel(inviter, channel_id);
    const invite = await chatModel.sendInvite(channel_id, invitee, inviter);
    if (invite) {
        res.status(200).json({success:true})
    } else {
        res.status(200).json({success:false})
    }
    
});

chatRouter.post("/send-group-invite", async (req, res) => {
    const { channel_id, groupName, invitee } = req.body;
    const invite = await chatModel.sendInvite(channel_id, invitee, groupName);
    if (invite) {
        res.status(200).json({success:true})
    } else {
        res.status(200).json({success:false})
    }
});

chatRouter.get("/get-invites", async (req, res) => {
    const { user } = req.query;

    const invites = await chatModel.getInvites(user);
    res.status(200).json({invites: invites})
        
});

chatRouter.post("/decline-invite", async (req, res) => {
    const { channel_id, inviter, invitee } = req.body;
    const channel = await chatModel.getChannel(channel_id);
    const delete_invite = await chatModel.deleteInvite(inviter, invitee);
    if (channel.users.length > 1) {

    } else {
        const delete_channel = await chatModel.deleteChannel(channel_id);
        const remove_channel = await userModel.removeChannel(inviter, channel_id);
    }


    res.status(200).json({success: true})
        
});

chatRouter.post("/accept-invite", async (req, res) => {
    const { channel_id, inviter, invitee } = req.body;

    const cc = await chatModel.getChannel(channel_id);
    // delete invite
    await chatModel.deleteInvite(inviter, invitee);
    // add channel id to invitee chat list
    await userModel.addChannel(invitee, channel_id);
    // change the channel name to include the added user

    if (cc.changedName === "0") {  
        await chatModel.defaultNameChange(channel_id, invitee + ", " + inviter);
    }
   

    // add invite to channel user list
    const channel = await chatModel.joinChannel(invitee, channel_id);
    res.status(200).json({channel: channel})
        
});

chatRouter.post("/join-channel", async (req, res) => {
    const { channel_id, username } = req.body;

    // Pushing the channel to the user's list of channels
    const user = await userModel.addChannel(username, channel_id);

    // Joining the channel
    const channel = await chatModel.joinChannel(channel_id, username);
    if (channel) {
        res.status(200).json({success: true});
    } else {
        res.status(400).json({success: false});
    }
});

// Removes the channel from the user's list of channels
chatRouter.post("/leave-channel", async (req, res) => {
    const { channel_id, username } = req.body;

    const channel1 = await chatModel.getChannel(channel_id);

    const users = channel1.users;
    const x = []
    for (let i = 0; i < users.length; i++) {
        if (username !== users[i]) {
            x.push(users[i])
        }
       
    }

    const defaultName = x.join(",")

    // remove the user from the channel
    // remove chat from user.chat list
    const {new_users, new_chat_list} = await chatModel.leaveChannel(channel_id, username);

    // change the channel name
    const channel = await chatModel.defaultNameChange(channel_id, defaultName);

    if (new_users.length === 0) {
        await chatModel.deleteChannel(channel_id);
    } 

    res.status(200).json({success: true});
});

// Deletes the channel and removes it from all of the users' list of channels
chatRouter.post("/delete-channel", async (req, res) => {
    const { channel_id } = req.body;

    // Removing all of the channels from the users' list of channels
    const channel1 = await chatModel.getChannel(channel_id);
    const users = channel1.Item.users.L;
    for (let i = 0; i < users.length; i++) {
        const user = await userModel.removeChannel(users[i], channel_id);
    }

    // Deleting the channel
    const channel = await chatModel.deleteChannel(channel_id);
    if (channel) {
        res.status(200).json({success: true});
    } else {
        res.status(400).json({success: false});
    }

});

// Gets all of the channels that the user is in and returns them
chatRouter.get("/get-channels", async (req, res) => {
    const { username } = req.query;
    const channels = await chatModel.getChannels(username);
    if (channels) {
        res.status(200).json({channels: channels});
    } else {
        res.status(400).json({success: false});
    }
});

// Gets all of the channels that the user is in and returns them
chatRouter.get("/get-channel-info", async (req, res) => {
    const { channel_id } = req.query;
    const channel = await chatModel.getChannel(channel_id);
    if (channel) {
        res.status(200).json({channel: channel});
    } else {
        res.status(400).json({success: false});
    }
});

// Gets all of the messages in the channel
chatRouter.get("/get-messages", async (req, res) => {
    const { channel_id } = req.query;
    const messages = await chatModel.getChats(channel_id);
    
    if (messages) {
        messages.sort(function(a,b) {
            return parseInt(a.timestamp) - parseInt(b.timestamp)
        });
        res.status(200).json({messages: messages});
    } else {
        res.status(200).json({success: false, messages: []});
    }
});

// Sends a message to the channel
chatRouter.post("/send-chat", async (req, res) => {
    const { channel_id, message, username } = req.body;
    const time = Date.now();

    // Sending the message
    const chat = await chatModel.sendChat(channel_id, time, username, message);
    if (chat) {
        res.status(200).json({success: true});
    }
    else {
        res.status(400).json({success: false});
    }
});

module.exports = { chatRouter };