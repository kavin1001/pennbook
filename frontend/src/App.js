// eslint-disable-next-line
import Home from "./pages/Home";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import News from "./pages/News";
import User from "./pages/User";
import Chat from "./pages/Chat"
import Visualizer from "./pages/Visualizer";
import PageNotFound from "./pages/PageNotFound";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate
} from "react-router-dom";


import Navbar from "./components/Navbar";
import Signup from "./pages/Signup";
import { UserStore } from "./context/UserStore";
import uuid from 'react-uuid';





function App() {
  const { userData } = UserStore()
  
  return (
    <Router>

      <Navbar />
      <Routes forceRefresh={true}>
          <Route path="/" element={userData === null ? <Navigate to="/login" />  : <Home />} />
          <Route path="/login" element={userData !== null ? <Navigate to="/" />  : <Login />}  />
          <Route path="/profile" element={userData === null ? <Navigate to="/login" />  : <Profile />} />
          <Route path="/news" element={userData === null ? <Navigate to="/login" />  : <News />} />
          <Route path="/signup" element={userData !== null ? <Navigate to="/" />  : <Signup />} />
          <Route path="/visualizer" element={userData === null ? <Navigate to="/login" />  : <Visualizer />} />
          <Route 
            path="/chat/:channel_id"   
            loader={({ params }) => {
            }}
            action={({ params }) => {}}
            element={userData === null ? <Navigate to="/login" />  : <Chat key={uuid()}/>}
          />
          <Route 
            path="/user/:username"   
            loader={({ params }) => {
            }}
            action={({ params }) => {}}
            element={userData === null ? <Navigate to="/login" />  : <User key={uuid()}/>}
          />
          {/* 👇️ only match this when no other routes match */}
          <Route path="*" element={<PageNotFound />} />
        </Routes>
    </Router>
    
  );
}

export default App;
