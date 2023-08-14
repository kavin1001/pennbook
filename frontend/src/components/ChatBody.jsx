
import { io } from "socket.io-client";
import { UserStore } from "../context/UserStore";
import { useEffect, useState } from "react";
import axios from "axios";
import { FiEdit } from "react-icons/fi"


const socket = io("http://localhost:8080/");
function ChatBody({ channel_id }) {
    const { userData } = UserStore();
    const [message, setMessage] = useState("")
    const [messages, setMessages] = useState([])
    const [isConnected, setIsConnected] = useState(socket.connected);

    const [channelName, setChannelName] = useState("");
    const [newChannelName, setNewChannelName] = useState("");
    const [changeName, setChangeName] = useState(false);


    const fetchMessages = async () => {
        const res = await axios.get("http://localhost:8080/api/chat/get-messages", {params: {channel_id: channel_id}});
        setMessages(res.data.messages);
    }

    const fetchName = async () => {
        const res = await axios.get("http://localhost:8080/api/chat/get-channel-info", {params: {channel_id: channel_id}});
        setChannelName(res.data.channel.channel_name)
    }


    

    const MINUTE_MS = 5000;
    useEffect(() => {
        if (channel_id !== "000") {
            fetchMessages();
            fetchName();

            const interval = setInterval(() => {
                fetchName();
            }, MINUTE_MS);
            
            return () => clearInterval(interval);
        }
        
    }, [channel_id]);



    useEffect(() => {
        socket.on('messageResponse', (data) => setMessages([...messages, data]));
      }, [socket, messages]);

    useEffect(() => {
        socket.on("connect", () => {
            setIsConnected(true);
        });
        socket.on("disconnect", () => {
            setIsConnected(false);
        });

        return () => {
            socket.off('connect');
            socket.off('disconnect');
            socket.off('message');
          };
    }, []);

    const sendMessage = async (e) => {
        e.preventDefault();
        socket.emit('message', {
            message: message,
            user: userData.username,
            id: `${socket.id}${Math.random()}`,
            socketID: socket.id,
            timestamp: Date.now()
          });


        const username = userData.username;
        const body = {
            channel_id: channel_id,
            message: message,
            username: username
        }

        await axios.post("http://localhost:8080/api/chat/send-chat", body);
        setMessage("")
      }

      const submitChangeName = async () => {
        const body = {
            channel_id: channel_id,
            new_name: newChannelName
        }
        await axios.post("http://localhost:8080/api/chat/change-channel-name", body);
        setChannelName(newChannelName);
        setChangeName(false)
      }

  return ( 
    <div className="col-span-7 w-full text-2xl border border-solid border-gray-300 rounded p-4 flex flex-col justify-between">
    
            {
                changeName ? 
                (
                    <div className="flex justify-between space-x-2">
                        <input type="text" className="text-md w-full border border-solid border-gray-400 rounded-xl py-2 px-1" name="newchannelname" value={newChannelName} onChange={e => setNewChannelName(e.target.value)}/>
                        <button className="bg-blue-600 text-white font-medium text-xs leading-tight uppercase rounded px-4 py-2.5" onClick={() => submitChangeName()}>
                            Change Name
                        </button>
                    </div>
                ) 
                : 
                (
                    <div className="flex justify-between" >
                        <h1 className="font-bold text-4xl">{channelName}</h1>
                        <button onClick={() => setChangeName(true)}>
                            <FiEdit />
                        </button>
                    </div>
                    
                )
            }
            
        <div className="col-span-7 w-full text-2xl rounded p-4 flex flex-col justify-between">
            <ul className="flex flex-col">
            {messages.map((m) => {
                if (m.user === userData.username) {
                    return (
                        <li className="self-end my-1">
                            <p className="text-sm text-slate-600 text-right">{m.user}</p>
                            <p className="bg-sky-400 max-w-fit px-2 py-1 rounded-xl">{m.message}</p>
                            <p className="text-sm text-slate-600 text-right">{new Date(parseInt(m.timestamp)).toISOString().split('T')[0]}</p>
                        </li>
                    )
                } else {
                    return (
                        <li className="self-start my-1">
                            <p className="text-sm text-slate-600">{m.user}</p>
                            <p className="bg-slate-400 max-w-fit px-2 py-1 rounded-xl">{m.message}</p>
                            <p className="text-sm text-slate-600">{new Date(parseInt(m.timestamp)).toISOString().split('T')[0]}</p>
                        </li>
                    )
                }
            })}
            </ul>
        </div>

        

        <div>
            <form onSubmit={sendMessage} className="mt-4 flex justify-start w-full">
                <input type="text" className="text-md w-full border border-solid border-gray-400 rounded-xl py-2 px-1" placeholder="Write a message..." name="msg" value={message} onChange={e => setMessage(e.target.value)}/>
            </form>
        </div>
        
    </div>
  );
}

export default ChatBody;
