import { useState, useEffect } from "react";
import { useParams } from "react-router-dom";
import { CgProfile } from "react-icons/cg" 
import HomePost from "../components/HomePost";
import { UserStore } from "../context/UserStore";

import axios from "axios";


function User() {
  let params = useParams();
  
  const [posts, setPosts] = useState([]);
  const [friends, setFriends] = useState(0);
  const [pageUser, setPageUser] = useState(null);
  const [sameChat, setSameChat] = useState(false);

  const { userData, updateUserData } = UserStore();

  const getPosts = async () => {
    const username = params.username;
    const res = await axios.get("http://localhost:8080/api/posts/getPostsByUser",  
    {
      params: {
        username: username,
      }
    });
    if (res.data.posts.length > 0) {
      setPosts(res.data.posts);
    } else {
      setPosts([]);
    }
    
  }

  const getUserData = async () => {
    const username = params.username;
    const res = await axios.get("http://localhost:8080/api/user/getUser",  
    {
      params: {
        username: username,
      }
    });
    setPageUser(res.data.user);
  }

  const checkFriends = async() => {
    const currUser = userData.username;
    const friend = params.username;
    if (currUser === friend) {
      setFriends(-1);
      return
    } else {
      const res = await axios.get("http://localhost:8080/api/friends/checkFriend",  
      {
        params: {
          currUser: currUser,
          friend: friend
        }
      });
      setFriends(res.data.message)
    
    }
  }

  const checkChats = async() => {
    const currUser = userData.username;
    const friend = params.username;
    const username = params.username;
    const res = await axios.get("http://localhost:8080/api/user/getUser",  
    {
      params: {
        username: username,
      }
    });
    for (var i = 0; i < res.data.user.chats.length; i++) {
      for (var j = 0; j < userData.chats.length; j++) {
        if (res.data.user.chats[i] === userData.chats[j]) {
          const res1 = await axios.get("http://localhost:8080/api/chat/get-channel-info",  
          {
            params: {
              channel_id: res.data.user.chats[i],
            }
          });
          
          if (res1.data.channel.users.length == 2) {
            setSameChat(true);
            return;
          }
          
        }
      }
    }

    // check invite
    const res2 = await axios.get("http://localhost:8080/api/chat/get-invites",  
      {
        params: {
          user: friend,
        }
    });
    if (res2.data.invites) {
      const invites = res2.data.invites;
      for (var i = 0; i < invites.length; i++) {
        if (invites[i]["inviter"] === currUser) {
          setSameChat(true);
          break;
        }
      }
    }
    
  }

  const submitFriendReq = async () => {
    // removing a friend person
    const currUser = userData.username;
    const friend = params.username;
    if (friends === 3) {
      const res = await axios.get("http://localhost:8080/api/friends/removeFriend",  
      {
        params: {
          currUser: currUser,
          friend: friend
        }
      });
      setFriends(0)
    } else {
      const res = await axios.get("http://localhost:8080/api/friends/addFriend",  
      {
        params: {
          currUser: currUser,
          friend: friend
        }
      });
      if (friends === 0) {
        setFriends(1);
      // accepting a friend request
      } else if (friends == 2) {
        setFriends(3);
      }
    }
  }

  const declineFriendReq = async () => {
    // removing a friend person
    const currUser = userData.username;
    const friend = params.username;
   
    const res = await axios.get("http://localhost:8080/api/friends/declineFriend",  
    {
      params: {
        currUser: currUser,
        friend: friend
      }
    });
    setFriends(0)
    
    
  }
  const MINUTE_MS = 5000;

  useEffect(() => {
    getUserData();
    checkFriends();
    getPosts();
    checkChats();

    const interval = setInterval(() => {
      checkFriends();
      getPosts();
    }, MINUTE_MS);
  
    return () => clearInterval(interval);
    
  }, [friends]);

  const [caption, setCaption] = useState("");
    const submitPost = async () => {
      if (friends !== 3) {
        alert("Must be friends to post on wall")
      } else {
        if (caption.length === 0) {
          alert("Empty Post");
          return
        } 
    
        if (caption.length > 500) {
          alert("Caption too long");
          return;
        }

        const username = userData.username;
        const body = {
          username: params.username,
          caption: caption,
          friend: username,
        }
        const res = await axios.post("http://localhost:8080/api/posts/create-post", body);
        if (res.status === 200) {
          if (posts === []) {
            setPosts([res.data.post]);
          } else {
            setPosts([ res.data.post, ...posts]);
          }
        }
        setCaption("")
      }
        
    }
    const sendChatInvite = async () => {
      const currUser = userData.username;
      const friend = params.username;
      const body = {
        inviter: currUser,
        invitee: friend,
      }
      const res = await axios.post("http://localhost:8080/api/chat/send-invite", body);
      setSameChat(true);
      await updateUserData(currUser);
    }

  return (
    <div className="bg-sky-400 min-h-screen w-full  items-center">
        <div className="grid grid-cols-2 gap-7 w-full items-center place-items-center">
            <div className="bg-white mt-24 w-1/2 flex flex-col items-center">
                <div className="mt-8">
                    <CgProfile size={60}/>
                </div>
                <h1 className="mt-8 text-3xl font-bold">{pageUser && pageUser.first + " " + pageUser.last}</h1>

                <h3 className="mt-8 text-2xl font-bold">Username: {params.username}</h3>

                <div className="mt-8 flex items-center gap-x-2 text-2xl">
                  Affiliation: {pageUser && pageUser.affiliation}
                </div>

                <div className="mt-8 flex items-center gap-x-2 text-2xl">
                  Email: {pageUser && pageUser.email}
                </div>

                <div className="my-8 flex items-center gap-x-2 text-2xl">
                {pageUser && pageUser.birth}
                </div>

                {/* not friends */}
                {friends === 0 && 
                  <button className="mb-4 bg-blue-500 px-4 py-1 rounded-xl" onClick={submitFriendReq}>
                    Add Friend
                  </button>
                }

                {/* pending friend request - already sent friend request */}
                {friends === 1 && 
                  <button className="mb-4 bg-green-500 px-4 py-1 rounded-xl">
                   Friend Request Sent
                  </button>
                } 

                {/* pending friend request from friend */}
                {friends === 2 && 
                  <div className="flex gap-x-2">
                    <button className="mb-4 bg-blue-500 px-4 py-1 rounded-xl" onClick={submitFriendReq}>
                    Accept Friend Request
                    </button>
                    <button className="mb-4 bg-red-500 px-4 py-1 rounded-xl" onClick={declineFriendReq}>
                    Decline Friend Request
                    </button>
                  </div>
                } 

                {/* already friends request */}
                {friends === 3 && 
                  <div className="flex flex-col">
                    <button className="mb-4 bg-red-500 px-4 py-1 rounded-xl" onClick={submitFriendReq}>
                      Remove Friend
                    </button>
                    {!sameChat && 
                    <button className="mb-4 bg-green-500 px-4 py-1 rounded-xl" onClick={sendChatInvite}>
                      Send Chat Invite
                    </button>}
                    
                  </div>
                  
                } 
                
                
            
            </div>
            <div className="flex w-2/3 flex-col items-center">
                <div className=" w-full bg-white mt-8  flex flex-col items-center">
                    <textarea className="mt-8 w-11/12 border border-solid border-gray-300 rounded" placeholder="What's on your mind?" value={caption} onChange={e => setCaption(e.target.value)}/>
                    <div className="flex justify-end w-full ">
                        <span className="mr-7 text-slate-500">{caption.length}/500</span>
                    </div>
                    <div className="flex justify-start w-full ">
                        <button className="ml-6 mb-4 bg-blue-500 px-4 py-1 rounded-xl" onClick={submitPost}>
                            Post
                        </button>
                    </div>
                </div>

                <div className="w-full mt-8 ">
                    {posts && posts.map((post) => ( 
                        <HomePost post={post} key={post.post_id} />
                    ))
                    }
                </div>
            </div>

        </div>
       
          
    </div>
    
  );
}

export default User;
