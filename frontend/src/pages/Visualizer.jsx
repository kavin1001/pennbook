
import Graph from "react-graph-vis";
import { useState, useEffect } from "react";
import axios from "axios";

import { UserStore } from "../context/UserStore"

function randomColor() {
  const red = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  const green = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  const blue = Math.floor(Math.random() * 256).toString(16).padStart(2, '0');
  return `#${red}${green}${blue}`;
}

function Visualizer() {
  const { userData } = UserStore();
  const [friends, setFriends] = useState([])
  const [nodes_list, setNodes] = useState([])
  const [edges_list, setEdges] = useState([])
  const [users_list, setUsersList] = useState([]);

  const getAllUsers = async () => {
    const res = await axios.get("http://localhost:8080/api/user/getAllUsers");

    return res.data.users;
  }

  const buildInitialGraph = async () => {
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

      const temp_nodes = []
      const temp_edges = []
      const temp_users = []
      const userNode = {
        id: username,
        label: username
      }
      temp_users.push(username);
      temp_nodes.push(userNode);

      for (var i = 0; i < allFriends.length; i++) {
        const n = {
          id: allFriends[i].username,
          label: allFriends[i].username,
        }
        temp_users.push(allFriends[i].username)
        temp_nodes.push(n);
        const e1 = {
          from: username,
          to: allFriends[i].username,
        }
        temp_edges.push(e1)
      }

      const users = await getAllUsers();
      users.forEach(user => {
        if (user.affiliation === userData.affiliation && user.username !== username && !temp_users.includes(user.username)) {
            const n = {
              id: user.username,
              label: user.username
            }
            temp_users.push(user.username);
            temp_nodes.push(n);
            const e1 = {
              from: username,
              to: user.username,
              color: "#FF0000",
              label: user.affiliation,
            }
            temp_edges.push(e1)
          }
      });
      console.log(temp_users);
      setFriends(allFriends);
      setNodes(temp_nodes);
      setEdges(temp_edges);
      setUsersList(temp_users);
    }


    useEffect(() => {
      buildInitialGraph();
    },[])

    const graph = {
        nodes: nodes_list,
        edges: edges_list,
      };
    
      const options = {
        layout: {
          hierarchical: true
        },
        edges: {
          color: "#000000"
        },
        height: "800px",
      };

      const updateGraph = async (friendUsername) => {
        if (friendUsername === "" || friendUsername === null || !friendUsername) {
          alert("Click on Node");
          return;
        }
        const color = randomColor();
        const res = await axios.get("http://localhost:8080/api/friends/getFriends",  
          {
            params: {
              currUser: friendUsername,
            }
          },
          {withCredentials: true}
        );
        const allFriends = res.data.friends;


        const temp_nodes = []

        for(var i = 0; i < nodes_list.length; i++) {
          temp_nodes.push(nodes_list[i]);
        }
        const temp_edges = [];
        

        for(var i = 0; i < edges_list.length; i++) {
          temp_edges.push(edges_list[i]);
        }


        const temp_users = [];
        for(var i = 0; i < users_list.length; i++) {
          temp_users.push(users_list[i]);
        }

        for (var i = 0; i < allFriends.length; i++) {
          const label = allFriends[i].username
          const n = {
              id: label,
              label: label,
            }
          let found = false;
          for (var j = 0; j < nodes_list.length; j++) {
            if (nodes_list[j].label === label && nodes_list[j].id === label) {
              found = true;
              break 
            }
          }

          if (!found) {
            temp_nodes.push(n);
              const e1 = {
              from: friendUsername,
              to: label,
              color: color
            }
            temp_edges.push(e1)
          }
          
         
        }
        
        setNodes(temp_nodes)
        setEdges(temp_edges)
        setUsersList(temp_users)
      } 
      
      const events = {
         select: async ({ nodes, edges }) => {
          await updateGraph(nodes[0]);
        },
      };


  return (
    <div className="bg-sky-500 min-h-screen w-full flex flex-col items-center">
        <h1 className="text-6xl font-bold mt-6">Visualizer</h1>
        <div className="mt-8">
            <Graph
                graph={graph}
                options={options}
                events={events}
            />
        </div>
    </div>
    
  );
}

export default Visualizer;
