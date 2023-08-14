import { BiLike } from "react-icons/bi"
import { MdCancel } from "react-icons/md" 
import { useState } from "react";

import { UserStore } from "../context/UserStore";
import { useEffect } from "react";

import axios from "axios";

function HomePost({ post }) {
  const { userData } = UserStore();
  const username = userData.username;
  const [comment, setComment] = useState("");
  const [comments, setComments] = useState([]);
  const [numComments, setNumComments] = useState(0);
  const [numLiked, setNumLiked] = useState(0);
  var d = new Date(parseInt(post.date)).toISOString().split('T')[0];

  const onFormSubmit = async (e) => {
    e.preventDefault();
    if (comment.length === 0) {
      alert("Empty comment");
      return;
    }
    const body = {
      username: username,
      post_wall: post.username,
      post_id: post.post_id,
      comment: comment,
    }
    const res = await axios.post("http://localhost:8080/api/posts/comment-post",  body);
    if (res.status === 200) {
      if (comments === []) {
        setComments([res.data.post]);
      } else {
        setComments([ ...comments, res.data.comment]);
      }
      
      setComment("")
    } else {
      alert("Comment failed!")
    }
    // send state to server with e.g. `window.fetch`
  }

  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const likes = post.likes;
    
    if (likes.includes(username)) {
      setLiked(true);
    }
    setNumLiked(likes.length);
  }, [])

  const likePost = async () => {
    const body = {
      username: username,
      post_id: post.post_id,
      poster: post.username,
    }
    const res = await axios.post("http://localhost:8080/api/posts/like-post",  body);
    setLiked(res.data.like);
    if (res.data.like) {
      setNumLiked(numLiked + 1);
    } else {
      setNumLiked(numLiked - 1);
    }
  }

  const getComments = async () => {
    const post_id = post.post_id;
    const res = await axios.get("http://localhost:8080/api/posts/getComments",  {
      params: {
        post_id: post_id,
      }
    },
    {withCredentials: true}
    );
    if (res.data.comments) {
      setNumComments(res.data.comments.length)
      setComments(res.data.comments);
    }
   
  }

  const MINUTE_MS = 5000;

  useEffect(() => {
    getComments();
    const interval = setInterval(() => {
      getComments();
    }, MINUTE_MS);
  
    return () => clearInterval(interval);
  }, []);

  const deletePost = async () => {
    const body = {
      username: userData.username,
      post_id: post.post_id
    }
    const res = await axios.post("http://localhost:8080/api/posts/deletePost", body);
    if (res.status === 200) {
      alert("Post Deleted");
      window.location.reload(false);
    }
  }

  return ( 
    <div className="bg-white my-4 w-full flex flex-col items-center p-6">
        <div className="flex justify-between items-center w-full">
            <h1 className="text-xl font-bold">{post.title}</h1>
            {post.title.split(" > ")[0] === username && 
              <div onClick={deletePost} className="hover:cursor-pointer">
                <MdCancel size={16} />
              </div>
            }
            
        </div>
        <div className="flex justify-start w-full">
            <h1 className="text-sm text-slate-500">{d.toString()}</h1>
        </div>

        <div className="my-4 flex justify-start w-full">
            <h1 className="text-md ">{post.caption}</h1>
        </div>


        <div className="flex items-center justify-between w-full gap-x-2">
          <div className="flex items-center gap-x-2">
            {numLiked} <BiLike className={`${liked && "text-blue-500"} hover:text-blue-500 hover:cursor-pointer`} onClick={likePost}/> 
          </div>
          <div className="flex items-center gap-x-2">
            {numComments} Comments
          </div>
        </div>

        <div className="w-full border border-solid border-gray-200"/>

        <ul className="w-full mt-2 space-y-2">
          {comments && comments.map((comment) => (
            <li className="flex justify-between" key={comment.comment_id}>
              <div>
                <p className="text-sm mr-2">{comment.username}</p>
                <p className="text-xs text-slate-500">{new Date(parseInt(comment.date)).toISOString().split('T')[0]}</p>
              </div>
              <div>
                <p className="text-sm break-all">{comment.comment}</p>
              </div>
            </li>
          ))}
          
        </ul>

        <form onSubmit={onFormSubmit} className="mt-4 flex justify-start w-full">
            <input type="text" className="text-md w-full border border-solid border-gray-400 rounded-xl py-2 px-1" placeholder="Write a comment..." value={comment} onChange={e => setComment(e.target.value)}/>
        </form>
        

        
    </div>
    
  );
}

export default HomePost;
