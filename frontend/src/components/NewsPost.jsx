import {BiLike} from "react-icons/bi"
import { FiArrowUpRight } from "react-icons/fi"

import { useState, useEffect } from "react";

import { UserStore } from "../context/UserStore";
import axios from "axios";

function NewsPost({ data }) {
  const { userData } = UserStore();
  const username = userData.username;
  const [numLiked, setNumLiked] = useState(0);
  const [liked, setLiked] = useState(false);

  useEffect(() => {
    const likes = data.likes;
    
    if (likes.includes(username)) {
      setLiked(true);
    }

    setNumLiked(likes.length);
  }, [])

  const likeNews = async () => {
    const body = {
      username: username,
      article_id: data.id,
    }
    const res = await axios.post("http://localhost:8080/api/feed/like-article",  body);
    setLiked(res.data.like);
    if (res.data.like) {
      setNumLiked(numLiked + 1);
    } else {
      setNumLiked(numLiked - 1);
    }
  }

  return ( 
    <div className="bg-white my-4 w-full flex flex-col items-center p-6">
        <div className="flex justify-between w-full hover:cursor-pointer">
            <h1 className="text-xl font-bold">{data.headline}</h1>
            <a href={data.link} target="_blank">
              <FiArrowUpRight />
            </a>
        </div>
        <div className="flex justify-start w-full">
            <h1 className="text-sm text-slate-500 italic">{data.authors}</h1>
        </div>

        <div className="my-4 flex justify-start w-full">
            <h1 className="text-md ">{data.description}</h1>
        </div>


        <div className="flex items-center justify-between w-full gap-x-2">
          <div className="flex items-center gap-x-2 ">
            {numLiked} <BiLike className={`${liked && "text-blue-500"} hover:text-blue-500 hover:cursor-pointer`} onClick={likeNews}/> 
          </div>

          <div className="flex items-center gap-x-2 ">
            <p className="text-sm border border-solid border-sky-600 bg-sky-300 rounded-xl px-3 py-1">{data.category}</p>
            <p className="text-sm">{data.date}</p>
          </div>
        </div>



        
    </div>
    
  );
}

export default NewsPost;
