import { useState, useEffect } from "react";
import { Link } from "react-router-dom";

import HomePost from "../components/HomePost";
import { UserStore } from "../context/UserStore";

import axios from "axios";


function Home() {
  const { userData } = UserStore();
  const [posts, setPosts] = useState([]);
  const [pendingFriends, setPendingFriends] = useState([]);
  const [friends, setFriends] = useState([]);
  const [pendingChat, setPendingChat] = useState([]);

  const getPosts = async () => {
    const username = userData.username;
    const res = await axios.get("http://localhost:8080/api/posts/getAllposts",  
    {
      params: {
        username: username,
      }
    },
    {withCredentials: true}
    );
    if (res.data.posts.length > 0) {
      setPosts(res.data.posts);
    } else {
      setPosts([]);
    }
  }

  const getPendingFriendReq = async () => {
    const username = userData.username;
    const res = await axios.get("http://localhost:8080/api/friends/getPendingFriends",  
    {
      params: {
        currUser: username,
      }
    },
    {withCredentials: true}
    );
    setPendingFriends(res.data.pending_friends);
  }

  const getActiveFriends = async () => {
    const username = userData.username;
    const res = await axios.get("http://localhost:8080/api/friends/getFriends",  
    {
      params: {
        currUser: username,
      }
    },
    {withCredentials: true}
    );
    const allFriends = res.data.friends;
    const activeFriends = []
    for (var i = 0; i < allFriends.length; i++) {
      const f = allFriends[i];

      if (f.last_login !== '0') {
        activeFriends.push(f.username)
      }
    }
    setFriends(activeFriends);
  }

  const getPendingChats = async () => {
    const username = userData.username;
    const res = await axios.get("http://localhost:8080/api/chat/get-invites",  
    {
      params: {
        user: username,
      }
    },
    {withCredentials: true}
    );
    setPendingChat(res.data.invites);
  }

  const MINUTE_MS = 5000;
  useEffect(() => {
    getPendingFriendReq();
    getPosts();
    getActiveFriends();
    getPendingChats();

    const interval = setInterval(() => {
      getPendingFriendReq();
      getPosts();
      getActiveFriends();
      getPendingChats();
    }, MINUTE_MS);
    
    return () => clearInterval(interval);
  }, []);

 

  const [caption, setCaption] = useState("");
  const submitPost = async () => {
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
      username: username,
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
      
      alert("Post created!")
      setCaption("")
    } else {
      alert("Post failed!")
    }
  }

  const acceptChat = async (invite) => {
    const body = invite;
    await axios.post("http://localhost:8080/api/chat/accept-invite", body);
    const new_list = pendingChat.filter(x => x.channel_id !== invite.channel_id);

    setPendingChat(new_list);
  }

  const declineChat = async (invite) => {
    const body = invite;
    await axios.post("http://localhost:8080/api/chat/decline-invite", body);
    const new_list = pendingChat.filter(x => x.channel_id !== invite.channel_id);
    setPendingChat(new_list);
  }

  return (
    <div className="relative bg-sky-400  w-full min-h-screen items-center">
      <div className="z-50 grid grid-cols-3 gap-7 w-full">
        <div className="col-span-1 flex flex-col justify-center mt-8 ml-16 w-full h-64">
            <div className="w-1/2 bg-white text-center p-4">
                <h1 className="text-2xl font-bold mb-2">Pending Friend Requests</h1>
                <ul className="space-y-2">
                  {pendingFriends && pendingFriends.map((user) => (
                     <li key={user}>
                      <Link to={`/user/${user}`} className="text-xl text-sky-600">
                        {user}
                      </Link>
                   </li>
                  ))}
                </ul>
            </div>
            <div className="w-1/2 bg-white text-center p-4 mt-2">
                <h1 className="text-2xl font-bold mb-2">Chat Invites</h1>
                <ul className="space-y-2">
                  {pendingChat && pendingChat.map((invite) => (
                     <li key={invite.channel_id}>
                      <div className="flex items-center justify-between">
                        <Link to={`/chat/${invite.channel_id}`} className="text-xl">
                          {invite.inviter}
                        </Link>
                        <div className="flex space-x-2">
                          <p className="text-green-500 hover:cursor-pointer" onClick={() => acceptChat(invite)}>accept</p>
                          <p className="text-red-500 hover:cursor-pointer" onClick={() => declineChat(invite)}>decline</p>
                        </div>
                        
                      </div>
                       
                      </li>
                  ))}
                </ul>
            </div>
          </div>
          <div className="flex w-full flex-col items-center col-span-1 mt-8">
            <div className=" w-full bg-white flex flex-col items-center">
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

            <div className="w-full mt-8">
                {posts && posts.map((post) => ( 
                  <HomePost post={post} key={post.post_id} />
                ))
                }
            </div>
          </div>
        <div className="col-span-1 flex h-64">
            <div className="w-1/2 bg-white mt-8 text-center p-4">
                <h1 className="text-2xl font-bold mb-2">Active Friends</h1>
                <ul className="space-y-2">
                  {friends && friends.map((user) => (
                     <li key={user}>
                      <Link to={`/user/${user}`} className="text-xl text-sky-600">
                        {user}
                      </Link>
                   </li>
                  ))}


                </ul>
            </div>
          </div>
        </div>
        
    </div>
    
  );
}

export default Home;
