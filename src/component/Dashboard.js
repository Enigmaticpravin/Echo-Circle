import React, { useEffect, useState } from 'react';
import { auth, db, doc, getDoc} from '../firebase';
import { useNavigate } from 'react-router-dom';
import Chat from './Chat'; // Import the new Chat component
import VideoChat from './VideoChat';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [showChat, setShowChat] = useState(false); // State to toggle between profile and chat view
  const [showVideoChat, setShowVideoChat] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser({ ...userSnap.data(), uid: currentUser.uid });
        }
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSignOut = () => {
    auth.signOut();
    navigate('/');
  };

  if (!user) return <div>Loading...</div>;

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-lg">
        <div className="p-6">
          <h2 className="text-3xl font-semibold text-blue-700">Dashboard</h2>
        </div>
        <nav className="mt-8">
          <button onClick={() => setShowChat(false)} className="flex items-center p-3 text-gray-700 hover:bg-gray-200 w-full text-left">
            <span className="ml-4">Home</span>
          </button>
          <button onClick={() => setShowChat(false)} className="flex items-center p-3 text-gray-700 hover:bg-gray-200 w-full text-left">
            <span className="ml-4">Profile</span>
          </button>
          <button onClick={() => setShowChat(false)} className="flex items-center p-3 text-gray-700 hover:bg-gray-200 w-full text-left">
            <span className="ml-4">Settings</span>
          </button>
          <button onClick={() => { setShowChat(true); setShowVideoChat(false); }} className="flex items-center p-3 text-gray-700 hover:bg-gray-200 w-full text-left">
            <span className="ml-4">Messages</span>
          </button>
          <button onClick={() => { setShowVideoChat(true); setShowChat(false); }} className="flex items-center p-3 text-gray-700 hover:bg-gray-200 w-full text-left">
            <span className="ml-4">Video Chat</span>
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Top Bar */}
        <div className="p-8 pb-0">
          <div className="flex justify-between items-center mb-8">
            <div className="relative w-1/2">
              <input 
                type="text" 
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-full shadow-sm focus:outline-none focus:border-blue-500"
                placeholder="Search for friends, groups, pages"
              />
              <svg className="absolute left-3 top-2.5 w-5 h-5 text-gray-400" fill="currentColor" viewBox="0 0 24 24">
                <path d="M10,17A7,7,0,1,0,3,10,7,7,0,0,0,10,17Zm0-2A5,5,0,1,1,15,10,5,5,0,0,1,10,15Zm10.707.707L18.414,14.414A1,1,0,0,1,19.828,13l2.293,2.293a1,1,0,0,1-1.414,1.414Z" />
              </svg>
            </div>
            <div className="flex items-center">
              <button className="mr-4">
                <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12,21A9,9,0,1,0,3,12,9,9,0,0,0,12,21ZM12,2A10,10,0,1,1,2,12,10,10,0,0,1,12,2Zm1,10H11v5H13Zm0-6H11v4h2Z" />
                </svg>
              </button>
              <button 
            className="relative mr-4"
          >
            <svg className="w-6 h-6 text-gray-700" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12,21a2.5,2.5,0,0,0,2.5-2.5H9.5A2.5,2.5,0,0,0,12,21Zm6.707-3.293L17,16.414V10A5.979,5.979,0,0,0,12,4V3a1,1,0,0,0-2,0V4A5.979,5.979,0,0,0,7,10v6.414L5.293,17.707A1,1,0,0,0,6.707,19H17.293A1,1,0,0,0,18.707,17.707ZM12,20a1.5,1.5,0,0,1-1.5-1.5h3A1.5,1.5,0,0,1,12,20Z" />
            </svg>
            {/* Notification Badge (if needed) */}
            <span className="absolute top-0 right-0 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500"></span>
            </span>
          </button>
              {user.profileImage && (
                <img 
                  src={user.profileImage} 
                  alt="Profile" 
                  className="w-10 h-10 rounded-full"
                />
              )}
            </div>
          </div>
        </div>

        {/* Conditional Rendering: Profile or Chat */}
        <main className="flex-1 overflow-hidden">
          {showChat ? (
            <Chat user={user} />
          ) : showVideoChat ? (
            <VideoChat user={user} />
          ) : (
            <div className="p-8">
              <div className="bg-white p-6 rounded-lg shadow-lg">
                <div className="flex items-center">
                  {user.profileImage && (
                    <img 
                      src={user.profileImage} 
                      alt="Profile" 
                      className="w-20 h-20 rounded-full mr-4"
                    />
                  )}
                  <div>
                    <h1 className="text-2xl font-bold text-gray-800">Welcome, {user.name}!</h1>
                    <p className="text-gray-600">Email: {user.email}</p>
                    <p className="text-gray-600">User ID: {user.userId}</p>
                  </div>
                </div>
                <button
                  onClick={handleSignOut}
                  className="mt-6 px-4 py-2 bg-red-500 text-white rounded-full hover:bg-red-600 transition duration-300"
                >
                  Sign Out
                </button>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}

export default Dashboard;