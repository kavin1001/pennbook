const { Router } = require("express");
const friendsRouter = Router();
var userModel = require("../models/user.model");
var friendModel = require('../models/friends.model');

// check for user session on every request to friend route
friendsRouter.use((req,res,next) => {
    if (!req.session.user) {
        next();
    } else {
        res.send(403);
    }
})


// this route is to accept a friend request or to make one if it doesn't exist
friendsRouter.post("/make-friend", async(req,res) => {
    const user_session = req.session.user;
    const { friend } = req.body;
    const username = req.session.user.username;
    // returns list of entries from friends table, ordered with the "username" entry first, then "friend" entry
    /// in other words, if we call this on (u1, u2), we should get u1 as pk first, and then u2
    existingfriendReq = await friendModel.getFriendship(username, friend); // done - jeremy
    if (existingfriendReq.length == 2) {
        if (existingfriendReq[0].status == 0) {
            res.send(409).json({message: "Friendship request already sent!"});
        } else if (existingfriendReq[0].status == -1) {
            // u1 has an active request from u2, so we accept the friendship!
            existingfriendReq[0].status = 1;
            existingfriendReq[0].timestamp = Date.now();
            existingfriendReq[1].status = 1;
            existingfriendReq[1].timestamp = Date.now(); // added this - jeremy
            const res = await friendModel.updateFriends(existingfriendReq); // done - jeremy
            res.send(200).json({message: "Friendship accepted successfully!"});
        } else {
            // status must equal 1 -> they are already friends
            res.send(400).json({message: "Friendship already exists!"});
        }
    } else {
        // create the friend request!

        const usernameVals = {
            username: username,
            friend: friend,
            status: 0,
            timestamp: Date.now()
        };
        const friendVals = {
            username: friend,
            friend: username,
            status: -1, // changed from 0 to -1, friend should be receiving - jeremy
            timestamp: Date.now() // added this
        }
        const res = await friendModel.sendFriendRequest(usernameVals, friendVals); // done - jeremy
    }
});

friendsRouter.get("/get-friends", async(req,res) => {
    const user_session = req.session.user;
    const username = req.session.user.username;
    const friends = await friendModel.getAllFriends(username); // done - jeremy
    res.send(200).json({friends: friends});
});

// note - this is the same route to delete a friend request, reject a request, or remove a friend
friendsRouter.post("/remove-friend", async(req,res) => {
    const user_session = req.session.user;
    const { friend } = req.body;
    const username = req.session.user.username;
    existingfriendReq = await friendModel.getFriendship(username, friend);
    if (existingfriendReq) {
        const res = await friendModel.removeFriendship(username, friend); // done - jeremy
    } else {
        res.send(400).json({message: "Friendship does not exist!"})
    }
});

// check if friends
friendsRouter.get("/checkFriend", async(req,res) => {
    const user_session = req.session.user;
    const { currUser, friend } = req.query;
    const existingfriendReq = await friendModel.getFriendship(currUser, friend);
    // neither person has sent a friend req
    if (existingfriendReq[0] === null && existingfriendReq[1] === null) {
        res.status(200).json({message: 0});
    // user has sent friend req but friend has not accepted
    } else if (existingfriendReq[0] !== null && existingfriendReq[1] === null) {
        res.status(200).json({message: 1});
    // friend has sent friend req but user has not accepted    
    } else if (existingfriendReq[0] === null && existingfriendReq[1] !== null) {
        res.status(200).json({message: 2});
     // already friends
    } else if (existingfriendReq[0] !== null && existingfriendReq[1] !== null) {
        res.status(200).json({message: 3});
    }
});

// add friend
friendsRouter.get("/addFriend", async(req,res) => {
    const user_session = req.session.user;
    const { currUser, friend } = req.query;
    const response = await friendModel.addFriend(currUser, friend);
    if (response) {
        console.log("here");
        res.status(200).json({success: true})
    } else {
        res.status(404).json({success: false})
    }
});

// remove friend
friendsRouter.get("/removeFriend", async(req,res) => {
    const user_session = req.session.user;
    const { currUser, friend } = req.query;
    const response = await friendModel.removeFriend(currUser, friend);
    if (response) {
        console.log("here");
        res.status(200).json({success: true})
    } else {
        res.status(404).json({success: false})
    }
});

// get pending friends
friendsRouter.get("/getPendingFriends", async(req,res) => {
    const user_session = req.session.user;
    const { currUser } = req.query;
    const response = await friendModel.getPendingFriends(currUser);
    
    res.status(200).json({pending_friends: response})
    
});

// get all friends
friendsRouter.get("/getFriends", async(req,res) => {
    const user_session = req.session.user;
    const { currUser } = req.query;
    const response = await friendModel.getAllFriends(currUser);
    res.status(200).json({friends: response})
    
});

// decline friend req
friendsRouter.get("/declineFriend", async(req,res) => {
    const user_session = req.session.user;
    const { currUser, friend } = req.query;
    const response = await friendModel.declineFriend(currUser, friend);
    
    res.status(200).json({pending_friends: response})
    
});

module.exports = { friendsRouter };