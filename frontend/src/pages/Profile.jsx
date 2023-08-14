import { CgProfile } from "react-icons/cg" 
import { AiOutlineEdit } from "react-icons/ai"
import Multiselect from 'multiselect-react-dropdown';
import HomePost from "../components/HomePost";

import { useState, useEffect } from "react";
import axios from "axios";
import { Link } from "react-router-dom";

import { UserStore } from "../context/UserStore";

function Profile() {
    const { userData, updateUserData } = UserStore();

  const options = [
    "POLITICS",
    "WELLNESS",
    "ENTERTAINMENT",
    "TRAVEL",
    "STYLE & BEAUTY",
    "PARENTING",
    "HEALTHY LIVING",
    "QUEER VOICES",
    "FOOD & DRINK",
    "BUSINESS",
    "COMEDY",
    "SPORTS",
    "BLACK VOICES",
    "HOME & LIVING",
    "PARENTS"
  ]
  

  const [originalTags, setOriginalTags] = useState(userData.interests)
  const [userSelectedTags, setUserSelectedTags] = useState(userData.interests)



  const changeSelection = (e) => {
    setUserSelectedTags(e);
  }

  const submitTagChange = async () => {
    const body = {
        username: userData.username,
        tags: userSelectedTags
    }
    const res = await axios.post("http://localhost:8080/api/user/updateTags", body);
    if (res.data.success) {

        const username = userData.username;
        await updateUserData(username);
        const body1 = {
            username: username,
            caption: username + " is now interest in " + userSelectedTags.join(', ') + "!",
            friend: username,
        }
        const res = await axios.post("http://localhost:8080/api/posts/create-post", body1);
        if (res.status === 200) {
            if (posts === []) {
                setPosts([res.data.post]);
            } else {
                setPosts([ res.data.post, ...posts]);
            }
        
        } else {
            alert("Post failed!")
        }
        setOriginalTags(userSelectedTags);
    }
  }

  const [changeAffliation, setChangeAffliation] = useState(false);
  const [newAffliation, setNewAffliation] = useState("")
  const [currAfflication, setCurrAffliation] = useState(userData.affiliation)

  const submitNewAffliation = async () => {
    if (newAffliation === "") {
        alert("New Affiliation must not be empty");
        setChangeAffliation(false)
        return;
    }
    const body = {
        username: userData.username,
        affiliation: newAffliation
    }
    const res = await axios.post("http://localhost:8080/api/user/updateAffiliation", body);
    if (res.data.success) {
        const username = userData.username;
        await updateUserData(username);
        const body1 = {
        username: username,
        caption: username + " is now affiliated with " + newAffliation + "!",
        friend: username,
        }
        const res = await axios.post("http://localhost:8080/api/posts/create-post", body1);
        if (res.status === 200) {
            if (posts === []) {
                setPosts([res.data.post]);
            } else {
                setPosts([ res.data.post, ...posts]);
            }
        
        } else {
            alert("Post failed!")
        }
        setCurrAffliation(newAffliation)
        setNewAffliation("")
        setChangeAffliation(false)

    } else {
        alert("Failed to change affiliation")
    }
    
  }

  const [changeEmail, setChangeEmail] = useState(false);
  const [newEmail, setNewEmail] = useState("")
  const [currEmail, setCurrEmail] = useState(userData.email)


  const submitNewEmail = async () => {
    if (newEmail === "") {
        alert("New Email must not be empty");
        setChangeEmail(false)
        return;
    }
    const body = {
        username: userData.username,
        email: newEmail
    }
    const res = await axios.post("http://localhost:8080/api/user/updateEmail", body);
    if (res.data.success) {
        await updateUserData(userData.username);
        setCurrEmail(newEmail);
        setNewEmail("")
        setChangeEmail(false)
    } else {
        alert("Failed to change email")
    }
    
  }

  const [changePassword, setChangePassword] = useState(false);
  const [newPassword, setNewPassword] = useState("")

  const submitNewPassword = async () => {
    if (newPassword === "") {
        alert("New Email must not be empty");
        setChangePassword(false)
        return;
    }
    const body = {
        username: userData.username,
        password: newPassword
    }
    const res = await axios.post("http://localhost:8080/api/user/updatePassword", body);
    if (res.data.success) {
        updateUserData(userData.username);
        setNewPassword("")
        setChangePassword(false)
        alert("Password changed successfully")
    } else {
        alert("Failed to change password")
    }
    
    
  }

  const [caption, setCaption] = useState("");

const submitPost = async () => {
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


    const [posts, setPosts] = useState([]);
    const getPosts = async () => {
        const username = userData.username;
        
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

    const [friends, setFriends] = useState([])
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
        setFriends(allFriends);
      }

    const MINUTE_MS = 5000;
    useEffect(() => {
      getPosts();
      getActiveFriends();
      const interval = setInterval(() => {
        getPosts();
        getActiveFriends();
      }, MINUTE_MS);
    
      return () => clearInterval(interval);
    }, []);
  
  return (
    <div className="bg-sky-500 min-h-screen w-full flex flex-col items-center">
        <div className="bg-sky-400 min-h-screen w-full items-center">
        <div className="grid grid-cols-2 gap-7 w-full items-center place-items-center">
            <div className="mt-24 w-full flex flex-col items-center">
                <div className="bg-white w-1/2 flex flex-col items-center">
                    <div className="mt-8">
                        <CgProfile size={60}/>
                    </div>
                    <h1 className="mt-8 text-3xl font-bold">{userData.first + " " + userData.last}</h1>

                    <h3 className="mt-8 text-2xl font-bold">{userData.username}</h3>

                    {changeAffliation ? 
                    (
                        <div className="mt-8 flex items-center gap-x-2 text-xl w-2/3">
                            <input type="text" className="text-md w-full border border-solid border-gray-400 rounded-xl py-2 px-1" placeholder="Enter New Affliation" value={newAffliation} onChange={e => setNewAffliation(e.target.value)}/>
                            <button className="text-sm bg-sky-400 py-1 px-2 rounded-xl" onClick={() => { submitNewAffliation() }}>Change Affliation</button>
                            {/* <AiOutlineEdit className="hover:cursor-pointer" onClick={() => { setChangeEmail(!changeEmail)}}/> */}
                        </div>
                    ) : (
                        <div className="mt-8 flex items-center gap-x-2 text-xl">
                            Affiliation: {currAfflication} <AiOutlineEdit className="hover:cursor-pointer" onClick={() => { setChangeAffliation(!changeAffliation)}}/>
                        </div>
                    )}


                    {changeEmail ? 
                    (
                        <div className="mt-8 flex items-center gap-x-2 text-xl w-2/3">
                            <input type="text" className="text-md w-full border border-solid border-gray-400 rounded-xl py-2 px-1" placeholder="Enter New Email" value={newEmail} onChange={e => setNewEmail(e.target.value)}/>
                            <button className="text-sm bg-sky-400 py-1 px-2 rounded-xl" onClick={() => { submitNewEmail() }}>Change Email</button>
                            {/* <AiOutlineEdit className="hover:cursor-pointer" onClick={() => { setChangeEmail(!changeEmail)}}/> */}
                        </div>
                    ) : (
                        <div className="mt-8 flex items-center gap-x-2 text-xl">
                            Email: {currEmail} <AiOutlineEdit className="hover:cursor-pointer" onClick={() => { setChangeEmail(!changeEmail)}}/>
                        </div>
                    )}

                    <div className="mt-8 flex items-center gap-x-2 text-2xl ">
                    Tags:
                    <Multiselect
                        isObject={false}
                        options={options} // Options to display in the dropdown
                        selectedValues={userSelectedTags} // Preselected value to persist in dropdown
                        showCheckbox
                        placeholder=""
                        onSelect={(e) => {changeSelection(e)}}
                        onRemove={(e) => {changeSelection(e)}}
                    />
                    {originalTags !== userSelectedTags && <button onClick={submitTagChange} className={`bg-sky-400 py-1 px-2 rounded-xl`}>Submit tags</button>}
                    
                </div>

                {changePassword ? 
                (
                    <div className="my-8 flex items-center gap-x-2 text-xl w-2/3">
                        <input id="password" type="password" className="text-md w-full border border-solid border-gray-400 rounded-xl py-2 px-1" placeholder="Enter New Password" value={newPassword} onChange={e => setNewPassword(e.target.value)}/>
                        <button className="text-sm bg-sky-400 py-1 px-2 rounded-xl" onClick={() => { submitNewPassword() }}>Change Password</button>
                        {/* <AiOutlineEdit className="hover:cursor-pointer" onClick={() => { setChangeEmail(!changeEmail)}}/> */}
                    </div>
                ) : (
                    <div className="my-8 flex items-center gap-x-2 text-xl">
                        Change Password <AiOutlineEdit className="hover:cursor-pointer" onClick={() => { setChangePassword(!changePassword)}}/>
                    </div>
                )}

                <div className="mb-8 flex items-center gap-x-2 text-md">
                Birthday: {userData.birth}
                    </div>

                    
                </div>
                <div className="w-1/2 bg-white mt-8 text-center p-4">
                    <h1 className="text-2xl font-bold mb-2">Friends List</h1>
                    <ul className="space-y-2">
                    {friends && friends.map((user) => (
                        <li key={user.username}>
                        <Link to={`/user/${user.username}`} className="text-xl text-sky-600">
                            {user.username}
                        </Link>
                    </li>
                    ))}

                    </ul>
                </div>
            </div>
            
            <div className="flex w-2/3 flex-col">
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
    </div>
    
  );
}

export default Profile;
