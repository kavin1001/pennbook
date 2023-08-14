import { useEffect, useState } from "react";
import { UserStore } from "../context/UserStore";
import {
    useNavigate
  } from "react-router-dom";

import axios from "axios";

function ChatMembers({ channel_id }) {
    const { userData, updateUserData } = UserStore()
    const navigate = useNavigate();

    const [members, setMembers] = useState([])
    const [showFriends, setShowFriends] = useState(false)


    const getMembers = async () => {
        const res = await axios.get("http://localhost:8080/api/chat/get-channel-info", {params: {channel_id: channel_id}});
        setMembers(res.data.channel.users);
    }


    const leaveChat = async () => {
        const body = {
            channel_id: channel_id,
            username: userData.username
        }
        const res = await axios.post("http://localhost:8080/api/chat/leave-channel", body);
        if (res.data.success) {
            updateUserData(userData.username);
            navigate("/chat/000");
        }

    }

    const [allFriends, setAllFriends] = useState([]);

    // fetches all friends for suggestions
    const getFriends = async () => {
      const res = await axios.get("http://localhost:8080/api/friends/getFriends", {params: {currUser: userData.username}});
      if (res.data.friends.length > 0) {
        setAllFriends(res.data.friends);
      } else {
        setAllFriends([]);
      }
    }

    useEffect(() => {
        getFriends();
      }, []);

    const [suggestions, setSuggestions] = useState([]);

    const getSuggestions = (value) => {
      return allFriends?.filter(user => user.username.toLowerCase().indexOf(value.toLowerCase()) !== -1 && !members.includes(user.username))
    }

    const onSearch = async (e) => {
      const value = e.target.value;
      if (value.length > 0) {
        const predictions = getSuggestions(value)
        setSuggestions(predictions)
      } else {
        setSuggestions([])
      } 
      
    }

    const [channelName, setChannelName] = useState("");
    const fetchName = async () => {
        const res = await axios.get("http://localhost:8080/api/chat/get-channel-info", {params: {channel_id: channel_id}});
        setChannelName(res.data.channel.channel_name)
    }

    

    const MINUTE_MS = 5000;
    useEffect(() => {
      if (channel_id !== '000') {
        getMembers()
        fetchName();
        const interval = setInterval(() => {
          getMembers()
          fetchName();
        }, MINUTE_MS);
        
        return () => clearInterval(interval);
      }
      
    }, [channel_id]);

    const sendGroupInvite = async (invitee) => {
      const body = {
        channel_id: channel_id,
        groupName: channelName,
        invitee: invitee
      }
      await axios.post("http://localhost:8080/api/chat/send-group-invite", body);
      alert(`Invite sent to ${invitee}`);
      setShowFriends(false);
    } 

  return ( 
    <div className="mr-2 col-span-2 w-full text-2xl border border-solid border-gray-300 rounded p-4 text-center">
        <h1 className="font-bold mb-2">Members</h1>
        <ul className="space-y-2 mb-2">
            {members.map((member) => (
                <li>
                    {member}
                </li>
            ))}
        </ul>
        <div className="flex flex-col w-full space-y-2">
            {
                showFriends && 
                <div className="input-group relative flex flex-col w-full mb-4">
                    <input type="search" className="form-control relative flex-auto min-w-0 block w-96 px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded" placeholder="Find Friend..." onChange={(e) => onSearch(e)}/>
                     <ul className={`flex flex-col space-y-1`}>
                        {suggestions !== [] && suggestions.map((suggestion) => (
                          <div className='border border-solid border-gray-300 rounded hover:cursor-pointer hover:bg-sky-400' onClick={() => sendGroupInvite(suggestion.username)}>
                              {suggestion.username}
                          </div>
                        ))}
                  </ul>
                </div>
            }
            <button className="bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded px-6 py-2.5" onClick={() => setShowFriends(!showFriends)}>
                {showFriends ? ("Finished adding users") : ("Add Users")}
            </button>
            <button className="bg-red-600 text-white font-medium text-xs leading-tight uppercase rounded px-6 py-2.5" onClick={leaveChat}>
                Leave chat
            </button>
        </div>
        
    </div>
  );
}

export default ChatMembers;
