import { FiEdit } from "react-icons/fi"
import { useState, useEffect } from "react";
import { UserStore } from "../context/UserStore";
import { useParams } from "react-router-dom";
import { Link } from "react-router-dom";

import ChatMembers from "../components/ChatMembers";
import ChatBody from "../components/ChatBody";


import axios from "axios";


function Chat() {
    let params = useParams();
    const { userData } = UserStore();
    const [channels, setChannels] = useState([]);

    const fetchChannels = async () => {
        const res = await axios.get("http://localhost:8080/api/chat/get-channels", {params: {username: userData.username}});
        setChannels(res.data.channels);
    }

    const MINUTE_MS = 5000;
    useEffect(() => {
        fetchChannels();

        const interval = setInterval(() => {
            fetchChannels();
        }, MINUTE_MS);
        
        return () => clearInterval(interval);
    }, [params]);

        
  return (
   
    <div className="grid grid-cols-12 w-full gap-x-12 min-h-fit">
        <div className="ml-2 col-span-3 w-full border border-solid border-gray-300 rounded p-2">
            <div className="flex items-center justify-between">
                <h1 className="font-bold text-3xl p-2">Chats</h1>
            </div>
            {channels.length === 0 && 
                <div className="p-2 text-center">
                    No chat channels. Create one today!
                </div> 
            }
            {channels.map((channel) => {
                return (
                    <div className="p-2">    
                        <ul className="space-y-2 mt-2">
                            <Link to={`/chat/${channel.channel_id}`}>
                                <li className={`border border-solid border-gray-300 p-2 cursor-pointer ${channel.channel_id === params.channel_id && "bg-sky-200"}`}>
                                    <div className="flex text-sm justify-between items-center">
                                        <p>
                                            {channel.channel_name}
                                        </p>
                                    </div>
                                    
                                </li>
                            </Link>
                        </ul>
                    </div>
                )
                
            })}

            
            
           
        </div>
        {params.channel_id === '000' ? 
        
            <div className="col-span-7 w-full text-2xl border border-solid border-gray-300 rounded p-4 flex flex-col justify-between items-center">
                Click on a channel to view messages
            </div> 
        
        
        : 
            <ChatBody channel_id={params.channel_id} />
        }
        
        {params.channel_id === "000" ? 
            <div>
                <div className="mr-2 col-span-2 w-full text-2xl border border-solid border-gray-300 rounded p-4 text-center">
                    <h1 className="font-bold mb-2">Members</h1>
                    <p>No channel opened</p>
                </div>
            </div> 
        : 
            <ChatMembers channel_id={params.channel_id} />
        }
    </div>
  );
}

export default Chat;
