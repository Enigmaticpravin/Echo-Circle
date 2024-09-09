import React, { useState, useEffect } from 'react';
import { doc, getDocs, collection, query, where, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';
import check from '../images/bluetick.png';
import PostHeader from './PostHeader';
import upvote from '../images/like-1.svg';
import comment from '../images/message.svg';
import downvote from '../images/dislike.svg';
import share from '../images/send-2.svg';
import more from  '../images/more.svg';
import TabLayout from './TabLayout';
import GlowingButtons from './glowingbuttons';
import search from '../images/search-normal.svg';
import EditProfilePopup from './EditProfilePopup';
import UserProfileComponent from './user-profile-component';
import MyOptionTabs from './MyOptionTabs';


const ProfileComponent = ({ togglePopup }) => {
  const [user, setUser] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState([]);
  const [posts, setPosts] = useState([]);
  const [showQuoraPopup, setShowQuoraPopup] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const currentUser = auth.currentUser;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const userRef = doc(db, 'users', currentUser.uid);
          const userSnap = await getDoc(userRef);
          if (userSnap.exists()) {
            setUser(userSnap.data());
          }
        }
      } catch (error) {
        console.log(error);
      }
    };

    const fetchUserPosts = async () => {
      try {
        const currentUser = auth.currentUser;
        if (currentUser) {
          const q = query(
            collection(db, 'posts'),
            where('user', '==', currentUser.uid)
          );
          const querySnapshot = await getDocs(q);
          const userPosts = [];
          querySnapshot.forEach((doc) => {
            userPosts.push({ id: doc.id, ...doc.data() });
          });
          setPosts(userPosts);
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchUserData();
    fetchUserPosts();
  }, []);

  const handleUserClick = (userId) => {
    setSelectedUserId(userId);
  };

  if (selectedUserId) {
    return <UserProfileComponent userId={selectedUserId} />;
  }

  const handlePostClick = (id) => {
    setExpandedPosts(prev => {
      if (prev.includes(id)) {
        return prev;
      } else {
        return [...prev, id];
      }
    });
  };

  const toggleMenu = (postId) => {
    setOpenMenuPostId((prevPostId) => (prevPostId === postId ? null : postId));
  };
  

  const toggleQuoraPopup = () => {
    setShowQuoraPopup(!showQuoraPopup);
  };

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const postDate = new Date(timestamp.toDate());
    const differenceInSeconds = Math.floor((now - postDate) / 1000);

    const minutes = Math.floor(differenceInSeconds / 60);
    const hours = Math.floor(differenceInSeconds / 3600);
    const days = Math.floor(differenceInSeconds / 86400);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return postDate.toLocaleDateString(); // Show the date if more than a week ago
  };

  const InteractionBar = ({ upvotes, comments, postId, postUser }) => {
    const currentUser = auth.currentUser;
    const isCurrentUserPost = currentUser && postUser === currentUser.uid;

    return (
      <div className='relative flex w-full items-center'>
        <div className="flex py-1 px-3 w-fit items-center space-x-4 mt-4 text-gray-400 bg-gray-900 rounded-lg">
          <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors duration-200">
            <img src={upvote} alt="Upvote" className="w-5 h-5 filter-white" />
            <span>{upvotes}</span>
          </button>
          <button className="flex items-center space-x-1 hover:text-red-500 transition-colors duration-200">
            <img src={downvote} alt="Downvote" className="w-5 h-5 filter-white" />
          </button>
          <button className="flex items-center space-x-1 hover:text-green-500 transition-colors duration-200">
            <img src={comment} alt="Comment" className="w-5 h-5 filter-white" />
            <span>{comments}</span>
          </button>
          <button className="flex items-center space-x-1 hover:text-yellow-500 transition-colors duration-200">
            <img src={share} alt="Share" className="w-5 h-5 filter-white" />
          </button>
        </div>
        <div className='ml-auto self-center mt-4 bg-gray-900 rounded-lg p-2 cursor-pointer' 
        onClick={(e) => {e.stopPropagation(); toggleMenu(postId)}}>
          <img src={more} alt='More' className='w-5 h-5 filter-white' />
        </div>
        {openMenuPostId === postId && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-600 rounded-lg shadow-lg z-10 mb-64 animate-fold">
            <ul className="py-1 text-sm text-white relative">
              {isCurrentUserPost && (
                <li className="px-4 py-2 hover:bg-gray-700 mt-2 hover:rounded-lg ml-2 mr-2 cursor-pointer">Delete</li>
              )}
              <li className="px-4 py-2 hover:bg-gray-700 mt-2 hover:rounded-lg ml-2 mr-2 cursor-pointer">Copy Link</li>
              {!isCurrentUserPost && (
                <>
                  <li className="px-4 py-2 hover:bg-gray-700 mt-2 hover:rounded-lg ml-2 mr-2 cursor-pointer">Report</li>
                  <li className="px-4 py-2 hover:bg-gray-700 mt-2 hover:rounded-lg mb-2 ml-2 mr-2 cursor-pointer">Not Interested</li>
                </>
              )}
            </ul>
            <div className="absolute -bottom-2 right-3 w-4 h-4 bg-gray-600 rounded-md transform rotate-45"></div>
          </div>
        )}
      </div>
    );
  };
  

  return (
    <div className="flex-1 flex p-4">
      <div className="flex-1 rounded-lg overflow-hidden shadow-lg bg-gray-900 overflow-y-auto">
      {showQuoraPopup && <EditProfilePopup onClose={toggleQuoraPopup} />}
        <div className="relative">
          {/* Background with gradient */}
          <div className="h-40 bg-gradient-to-r from-blue-300 via-green-200 to-yellow-300"></div>
          
          {/* Curved white overlay */}
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gray-900">
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-300 via-green-200 to-yellow-300"
              >
            </div>
          </div>
          
          {/* Profile picture */}
          <div className="absolute bottom-0 left-8 transform translate-y-1/2 z-10">
            {user && (
              <img
                src={user.profileImage}
                alt={user.name}
                className="w-24 h-24 rounded-full border-4 border-gray-900"
              />
            )}
          </div>
        </div>
        <div className="pt-16 px-8">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-2xl font-bold flex items-center text-white">
                {user ? user.name : 'User Name'}
                <img src={check} alt="Verified" className="ml-2 w-5 h-5" />
              </h2>
              <p className="text-sm text-gray-400">
                {user ? `${user.followers?.length || 0} Followers • ${user.following?.length || 0} Following` : 'Loading...'}
              </p>
            </div>
            <div className="flex items-center space-x-4">
        <button className="relative px-4 py-2 bg-blue-500 text-white rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105 hover:bg-blue-500 focus:outline-none"
                onClick={toggleQuoraPopup}>
          Edit Profile
          <span className="absolute inset-0 rounded-full bg-blue-700 opacity-0 transition-opacity duration-300 ease-in-out group-hover:opacity-20"></span>
        </button>

        <div className="relative">
          <img src={search} alt='Search' className='absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 filter-white'/>
          <input
            type="text"
            placeholder="Search"
            className="pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500 text-white"
          />
        </div>
      </div>
          </div>
          <p className="mt-4 text-sm text-gray-400">
            {user ? user.bio : 'This user has no bio'}
          </p>
          <MyOptionTabs id={currentUser.uid} togglePopup={togglePopup}/>
        </div>
      </div>
      <div className="w-[30%] bg-gray-800 p-4 ml-4 rounded-lg bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        {/* Inbox */}
        <TabLayout id={currentUser.uid} onUserClick={handleUserClick} />
      </div>
    </div>
  );
};

export default ProfileComponent;
