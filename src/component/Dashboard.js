import React, { useEffect, useState } from 'react';
import { auth, db, doc, getDoc, collection, getDocs } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import Chat from './Chat';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import logo from '../images/logo.png';
import ExploreComponent from './ExploreComponent';
import CallsComponent from './CallsComponent';
import ContactComponent from './ContactComponent';
import PrivacyComponent from './PrivacyComponent';
import SettingComponent from './SettingComponent';
import { faCompass, faCommentDots, faPhoneAlt, faAddressBook, faUserShield, faCog } from '@fortawesome/free-solid-svg-icons';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('Chats');
  const [message, setMessage] = useState('');
  const navigate = useNavigate();

  const fetchAllUsers = async () => {
    try {
      const usersCollection = collection(db, 'users');
      const usersSnapshot = await getDocs(usersCollection);
      const usersList = usersSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setAllUsers(usersList);
    } catch (error) {
      console.error("Error fetching users:", error);
    }
  };

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (currentUser) => {
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser({ ...userSnap.data(), uid: currentUser.uid });
        }
        fetchAllUsers();
      } else {
        navigate('/');
      }
    });

    return () => unsubscribe();
  }, [navigate]);

  const handleSendMessage = async () => {
    if (message.trim()) {
      await addDoc(collection(db, 'messages'), {
        text: message,
        uid: user.userId,
        displayName: user.name,
        createdAt: serverTimestamp(),
      });
      setMessage('');
    }
  };

  if (!user) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-900">
      <div className="relative w-16 h-16 animate-spin">
        <div className="absolute border-t-4 border-blue-500 border-solid rounded-full inset-0"></div>
        <div className="absolute border-t-4 border-transparent border-solid rounded-full inset-0 border-l-4 border-blue-500"></div>
      </div>
    </div>
  );  

  return (
    <div className="flex h-screen bg-gradient-to-r from-gray-900 via-black to-gray-900 text-white">
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 flex flex-col justify-between mt-4 ml-4 mb-4 rounded-lg bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        <div>
          <img src={logo} className='w-[120px] justify-center items-center mx-auto mb-6'></img>
          <div className="h-[2px] w-full rounded-lg animated-gradient mb-6 mt-3"></div>
          <nav>
          <ul className="space-y-4 p-2">
  <li
    className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Explore' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
    onClick={() => setActiveTab('Explore')}
  >
    <FontAwesomeIcon icon={faCompass} className="text-xl mr-2" /> Explore
  </li>
  <li
    className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Chats' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
    onClick={() => setActiveTab('Chats')}
  >
    <FontAwesomeIcon icon={faCommentDots} className="text-xl mr-2" /> Chats
  </li>
  <li
    className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Calls' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
    onClick={() => setActiveTab('Calls')}
  >
    <FontAwesomeIcon icon={faPhoneAlt} className="text-xl mr-2" /> Calls
  </li>
  <li
    className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Contact' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
    onClick={() => setActiveTab('Contact')}
  >
    <FontAwesomeIcon icon={faAddressBook} className="text-xl mr-2" /> Contact
  </li>
  <li
    className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Privacy' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
    onClick={() => setActiveTab('Privacy')}
  >
    <FontAwesomeIcon icon={faUserShield} className="text-xl mr-2" /> Privacy
  </li>
  <li
    className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Setting' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
    onClick={() => setActiveTab('Setting')}
  >
    <FontAwesomeIcon icon={faCog} className="text-xl mr-2" /> Setting
  </li>
</ul>

          </nav>
        </div>
        <div className="flex items-center space-x-2 mx-auto mb-4 pt-2 pb-2 pr-4 pl-4 bg-slate-700 rounded-lg bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
          <img src={user.profileImage} alt={user.name} className="w-8 h-8 rounded-full mr-2" />
          <span>{user.name}</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
  {/* Top Bar */}
  <div className="bg-gray-800 p-4 flex justify-between items-center mt-4 mr-4 ml-4 rounded-xl bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
    <h2 className="text-xl font-semibold">{activeTab}</h2>
    <div className="flex items-center space-x-4">
      {activeTab === 'Chats' && <button className="bg-blue-500 text-white rounded-full px-4 py-2">+ New Chat</button>}
      <img src={user.profileImage} alt="Profile" className="w-8 h-8 rounded-full" />
    </div>
  </div>

  <div className="flex-1 flex overflow-hidden">
    {activeTab === 'Explore' && <ExploreComponent />}
    {activeTab === 'Chats' && (
      <div className="flex-1 flex">
        <div className="w-1/4 bg-gray-800 p-4 mt-4 ml-4 mb-4 rounded-lg bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
          {/* Inbox */}
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-lg">Inbox</h3>
            <span className="bg-red-500 text-xs text-white rounded-full px-2 py-1">3 New</span>
          </div>
          <ul>
            {allUsers.map((user) => (
              <li key={user.id} className="flex items-center space-x-2 p-2 rounded-xl hover:bg-gray-900 cursor-pointer m-2">
                <img src={user.profileImage} alt={user.name} className="w-10 h-10 rounded-full" />
                <div>
                  <p className="text-sm font-semibold">{user.name}</p>
                  <p className="text-xs text-gray-400">Last message snippet...</p>
                </div>
              </li>
            ))}
          </ul>
        </div>

        <div className="flex-1 flex flex-col p-4">
          <div className="flex-1 bg-gray-800 rounded-lg overflow-y-auto p-4 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
            {/* Chat Messages */}
            <Chat user={user} />
          </div>
          {/* Sticky Input Area */}
          <div className="bg-gray-800 p-4 rounded-lg mt-2 flex items-center bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
            <input
              type="text"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              className="flex-grow bg-gray-700 p-2 rounded-lg focus:outline-none mr-2"
              placeholder="Type your message..."
            />
            <button
              onClick={handleSendMessage}
              className="bg-blue-500 text-white px-4 py-2 rounded-lg hover:bg-blue-600">
              Send
            </button>
          </div>
        </div>
      </div>
    )}
    {activeTab === 'Calls' && <CallsComponent />}
    {activeTab === 'Contact' && <ContactComponent />}
    {activeTab === 'Privacy' && <PrivacyComponent />}
    {activeTab === 'Setting' && <SettingComponent />}
  </div>
</div>
</div>
  );
}

export default Dashboard;
