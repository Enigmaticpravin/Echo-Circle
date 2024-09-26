import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './component/Login';
import Dashboard from './component/Dashboard';
import VideoChat from './component/CallsComponent';
import UserProfileComponent from './component/user-profile-component';
import NotificationsComponent from './component/NotificationsComponent';
import CallsComponent from './component/CallsComponent';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<VideoChat />} />
        <Route path="/user-profile/:userId" element={<UserProfileComponent />} />
        <Route path='/notifications' element={<NotificationsComponent/>}/>
      </Routes>
    </Router>
  );
}

export default App;