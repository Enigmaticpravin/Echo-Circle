import React from 'react';
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import Login from './component/Login';
import Dashboard from './component/Dashboard';
import UserProfileComponent from './component/user-profile-component';
import NotificationsComponent from './component/NotificationsComponent';

function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<Login />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/user-profile" element={<UserProfileComponent />} />
        <Route path='/notifications' element={<NotificationsComponent/>}/>
      </Routes>
    </Router>
  );
}

export default App;