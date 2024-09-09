import React, { useEffect, useState } from 'react';
import { auth, db, doc, getDoc, collection, getDocs, query, where, onSnapshot } from '../firebase';
import { useNavigate } from 'react-router-dom';
import { addDoc, serverTimestamp } from 'firebase/firestore';
import Chat from './Chat';
import logo from '../images/logo.png';
import ExploreComponent from './ExploreComponent';
import CallsComponent from './CallsComponent';
import ContactComponent from './ContactComponent';
import PrivacyComponent from './PrivacyComponent';
import home from '../images/home-1.svg';
import { useLocation } from 'react-router-dom';
import messages from "../images/messages-1.svg";
import video from '../images/video.svg';
import NotificationsComponent from './NotificationsComponent';
import money from "../images/money-recive.svg";
import shield from '../images/shield.svg';
import setting from '../images/setting.svg';
import SettingComponent from './SettingComponent';
import QuoraPostPopup from './QuoraPostPopup';
import AnswerPopup from './AnswerPopup';
import search from '../images/search-normal.svg';
import add from '../images/additem.svg';
import notification from '../images/notification-1.svg';

function Dashboard() {
  const [user, setUser] = useState(null);
  const [allUsers, setAllUsers] = useState([]);
  const [activeTab, setActiveTab] = useState('Explore');
  const [unreadNotifications, setUnreadNotifications] = useState(0);
  const [message, setMessage] = useState('');
  const [showQuoraPopup, setShowQuoraPopup] = useState(false);
  const [showAnswerPopup, setShowAnswerPopup] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    const queryParams = new URLSearchParams(location.search);
    const tab = queryParams.get('activeTab');
    if (tab) {
      setActiveTab(tab);
    }
  }, [location.search]);


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

  const fetchUnreadNotifications = (currentUser) => {
    const notificationsRef = collection(db, 'notifications', currentUser.uid, 'userNotifications');
    const q = query(notificationsRef, where('read', '==', false), where('receiverId', '==', currentUser.uid));
    
    // Use onSnapshot to listen to real-time changes
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setUnreadNotifications(snapshot.size);
    });
  
    // Cleanup the listener on component unmount
    return () => unsubscribe();
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
        
        // Set up the real-time notifications listener
        const unsubscribeNotifications = fetchUnreadNotifications(currentUser);
        
        return () => {
          unsubscribeNotifications(); // Clean up notifications listener
        };
      } else {
        navigate('/');
      }
    });
  
    return () => unsubscribe();
  }, [navigate]);

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    navigate(`/dashboard?activeTab=${tab}`);
  };
  

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

  const toggleQuoraPopup = () => {
    setShowQuoraPopup(!showQuoraPopup);
  };

  const toggleAnswerPopup = () => {
    setShowAnswerPopup(!showAnswerPopup);
  }

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
       {/* Popup Modal */}
       {showQuoraPopup && <QuoraPostPopup onClose={toggleQuoraPopup} />}
       {showAnswerPopup && <AnswerPopup onClose={toggleAnswerPopup} />}
      {/* Sidebar */}
      <div className="w-64 bg-gray-800 p-4 flex flex-col justify-between mt-4 ml-4 mb-4 rounded-lg bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        <div>
          <img src={logo} className='w-[200px] justify-center items-center mx-auto mt-[-50px] mb-[-30px]'></img>
          <div className="h-[2px] w-full rounded-lg animated-gradient mb-6"></div>
          <nav>
            <ul className="space-y-4 p-2">
              <li
                className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Explore' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
                onClick={() => handleTabChange('Explore')}
              >
                <img src={home} className="text-xl mr-2 filter-white" /> Explore
              </li>
              <li
                className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Chats' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
                onClick={() => handleTabChange('Chats')}
              >
                <img src={messages} className="text-xl mr-2 filter-white" /> Chats
              </li>
              <li
                className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Calls' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
                onClick={() => handleTabChange('Calls')}
              >
                <img src={video} className="text-xl mr-2 filter-white" /> Calls
              </li>
              <li
                className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Contact' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
                onClick={() => handleTabChange('Contact')}
              >
                <img src={money} className="text-xl mr-2 filter-white" /> Monetization
              </li>
              <li
                className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Privacy' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
                onClick={() => handleTabChange('Privacy')}
              >
                <img src={shield} className="text-xl mr-2 filter-white" /> Privacy
              </li>
              <li
                className={`flex items-center p-2 rounded-lg transition-all duration-300 cursor-pointer ${activeTab === 'Setting' ? 'bg-gray-900' : 'hover:bg-gray-900 hover:p-4'}`}
                onClick={() => setActiveTab('Setting')}
              >
                <img src={setting} className="text-xl mr-2 filter-white" /> Setting
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
    <div className="flex items-center space-x-2 w-4/5 ml-5 mr-5 bg-gray-700 p-2 rounded-full shadow-lg">
      <img
        src={search}
        alt="Search Icon"
        className="w-5 h-5 text-gray-300 filter-white ml-2"
      />
      <textarea
        className="bg-transparent text-gray-300 placeholder-gray-400 outline-none resize-none w-full"
        placeholder="Search anything"
        rows="1"
      />
    </div>
    <div className="flex items-center space-x-4 w-fit">
      {activeTab === 'Chats' && 
      <div className="ml-auto self-center rounded-lg cursor-pointer bg-blue-500 p-[8px] hover:bg-blue-700 flex justify-center items-center">
      <img 
        className="w-5 h-5 text-white filter-white" 
        onClick={toggleQuoraPopup}
        src={add}
        alt="Add Icon" 
      />
    </div>
      }
            <div className='bg-gray-700 rounded-xl p-3 cursor-pointer'
              onClick={() => setActiveTab('Notifications')}>
              <img src={notification} alt="Notifications" className="w-5 h-5 filter-white" />
              {unreadNotifications > 0 && (
                <span className={`absolute top-3 right-3 flex items-center justify-center bg-red-600 text-white text-xs font-bold w-5 h-5 rounded-full notification-badge ${unreadNotifications > 0 ? 'entering' : 'leaving'}`}>
                  {unreadNotifications}
                </span>
              )}
            </div>

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
    {activeTab === 'Contact' && <ContactComponent togglePopup={toggleAnswerPopup}/>}
    {activeTab === 'Privacy' && <PrivacyComponent />}
    {activeTab === 'Setting' && <SettingComponent />}
    {activeTab === 'Notifications' && <NotificationsComponent />}
  </div>
</div>
</div>
  );
}

export default Dashboard;
