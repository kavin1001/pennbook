import { AiOutlineHome, AiOutlineMessage } from 'react-icons/ai'
import {CgProfile} from "react-icons/cg"
import {TbVectorTriangle, TbNews} from "react-icons/tb";
import axios from "axios";

import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  useLocation,
  useNavigate
} from "react-router-dom";

import { UserStore } from "../context/UserStore";

function Navbar() {
    const navigate = useNavigate();
    const { userData, logout } = UserStore();

    const [allUsers, setAllUsers] = useState([]);

    const getUsers = async () => {
      const res = await axios.get("http://localhost:8080/api/user/getAllUsers");
      if (res.data.users.length > 0) {
        setAllUsers(res.data.users);
      } else {
        setAllUsers([]);
      }
    }
  
    useEffect(() => {
      getUsers();
    }, []);


    // home page navbar
    const submitLogout = async() => {
      await logout(userData.username);
      navigate("/login");

    }

    const [suggestions, setSuggestions] = useState([]);

    const getSuggestions = (value) => {
      return allUsers?.filter(user => user.username.toLowerCase().indexOf(value.toLowerCase()) !== -1)
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

      

    const location = useLocation();
    if (location.pathname !== "/login" && location.pathname !== "/signup") {
      return (
        <div className="flex px-4 py-2 items-center justify-between">
            <div className='flex justify-center items-center'>
                <Link to="/" className='flex justify-center items-center gap-x-1'>
                    <h1 className="text-3xl font-bold mr-20">
                        PennBook
                    </h1>
                </Link>
                <div className="flex flex-col mt-3">
                  <div className='flex'>
                    <div className="input-group relative flex w-full mb-4">
                      <input type="search" className="form-control relative flex-auto min-w-0 block w-96 px-3 py-1.5 text-base font-normal text-gray-700 bg-white bg-clip-padding border border-solid border-gray-300 rounded" placeholder="Find Users..." onChange={(e) => onSearch(e)}/>
                      </div>
                  </div>
                  <ul className={`flex flex-col space-y-1`}>
                    {suggestions !== [] && suggestions.map((suggestion) => (
                      <a onClick={() => {window.location.href=`/user/${suggestion.username}`}}>
                        <div className='border border-solid border-gray-300 rounded hover:cursor-pointer hover:bg-sky-400'>
                            {suggestion.username}
                        </div>
                      </a>
                     
                    ))}
                  </ul>
                   
                </div>
            </div>
            
            <div className='flex gap-x-8'>
                <Link to="/" className='flex justify-center items-center gap-x-1'>
                  <div><AiOutlineHome/></div>
                  <p>Home</p>  

                </Link>

                <Link to="/news" className='flex justify-center items-center gap-x-1'>
                  <div><TbNews/></div>
                  <p>News Feed</p>  

                </Link>

                <Link to="visualizer" className='flex justify-center items-center gap-x-1'>
                  <div><TbVectorTriangle/></div>
                  <p>Visualizer</p>  

                </Link>
                <Link to="/chat/000" className='flex justify-center items-center gap-x-1'>
                  <div><AiOutlineMessage/></div>
                  <p>Chat</p>  

                </Link>
                <Link to="/profile" className='flex justify-center items-center gap-x-1'>
                  <div><CgProfile/></div>
                  <p>My Profile</p>  

                </Link>
                  <button className='bg-indigo-500 px-4 py-2 rounded-xl' onClick={submitLogout}>
                      Logout
                  </button>
                
            </div>
        </div>
        
    );
    } else {
      return (<div></div>)
    }
    
  }
  
export default Navbar;
  