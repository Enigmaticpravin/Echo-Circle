import React, { useState, useEffect } from 'react';
import { doc, getDocs, collection, query, where, getDoc, auth, updateDoc, arrayRemove, arrayUnion, deleteDoc, addDoc, serverTimestamp } from '../firebase';
import { db } from '../firebase';
import check from '../images/bluetick.png';
import PostHeader from './PostHeader';
import upvote from '../images/like-1.svg';
import comment from '../images/message.svg';
import downvote from '../images/dislike.svg';
import share from '../images/send-2.svg';
import MyOptionTabs from './MyOptionTabs';
import more from  '../images/more.svg';
import TabLayout from './TabLayout';
import GlowingButtons from './glowingbuttons';
import search from '../images/search-normal.svg';

const UserProfileComponent = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState([]);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isFollowing, setIsFollowing] = useState(false);
  const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.data());
          if (currentUserId) {
            const currentUserRef = doc(db, 'users', currentUserId);
            const currentUserSnap = await getDoc(currentUserRef);
            const currentUserData = currentUserSnap.data();
            if (currentUserData && currentUserData.following.includes(userId)) {
              setIsFollowing(true);
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    };

    const fetchUserPosts = async () => {
      try {
        const q = query(
          collection(db, 'posts'),
          where('user', '==', userId)
        );
        const querySnapshot = await getDocs(q);
        const userPosts = [];
        querySnapshot.forEach((doc) => {
          userPosts.push({ id: doc.id, ...doc.data() });
        });
        setPosts(userPosts);
      } catch (error) {
        console.log(error);
      }
    };

    fetchUserData();
    fetchUserPosts();
  }, [userId, currentUserId]);

  const handleFollowToggle = async () => {
    if (!currentUserId) {
      console.error('No current user logged in');
      return;
    }

    const userDocRef = doc(db, 'users', userId);
    const currentUserDocRef = doc(db, 'users', currentUserId);
    const notificationDocRef = collection(db, 'notifications', userId, 'userNotifications');

    try {
      if (isFollowing) {
        // Unfollow
        await updateDoc(userDocRef, {
          followers: arrayRemove(currentUserId),
        });
        await updateDoc(currentUserDocRef, {
          following: arrayRemove(userId),
        });
        const q = query(notificationDocRef,
          where("senderId", "==", currentUserId),
          where("receiverId", "==", userId),
          where("additionalId", "==", currentUserId),
          where("type", "==", "follow"));

        const querySnapshot = await getDocs(q);

        // Delete all matching notifications
        querySnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
        setIsFollowing(false);
      } else {
        // Follow
        await updateDoc(userDocRef, {
          followers: arrayUnion(currentUserId),
        });
        await updateDoc(currentUserDocRef, {
          following: arrayUnion(userId),
        });
        await addDoc(notificationDocRef, {
          content: `${auth.currentUser.displayName} followed you`,
          type: 'follow',
          date: serverTimestamp(),
          read: false,
          additionalId: currentUserId,
          senderId: currentUserId,
          receiverId: userId,
          postContent: "none",
        });
        setIsFollowing(true);
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

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
    return postDate.toLocaleDateString();
  };

  const InteractionBar = ({ upvotes, comments }) => (
    <div className='flex w-full items-center'>
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
      <div className='ml-auto self-center mt-4 bg-gray-900 rounded-lg p-2 cursor-pointer'>
        <img src={more} alt='More' className='w-5 h-5 filter-white' />
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex p-4">
      <div className="flex-1 rounded-lg overflow-hidden shadow-lg bg-gray-900 overflow-y-auto">
        <div className="relative">
          <div className="h-40 bg-gradient-to-r from-blue-300 via-green-200 to-yellow-300"></div>
          <div className="absolute bottom-0 left-0 right-0 h-16 bg-gray-900">
            <div className="absolute top-0 left-0 right-0 h-16 bg-gradient-to-r from-blue-300 via-green-200 to-yellow-300"></div>
          </div>
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
            {currentUserId && currentUserId !== userId && (
              <button
                onClick={handleFollowToggle}
                className="px-4 py-2 bg-blue-500 text-white rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105 hover:bg-blue-600 focus:outline-none"
              >
                {isFollowing ? 'Following' : 'Follow'}
              </button>
            )}
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
            {user ? user.bio : "User information not available."}
          </p>
          <MyOptionTabs id={userId}/>
        </div>
      </div>
      <div className="w-[30%] bg-gray-800 p-4 ml-4 rounded-lg bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        <TabLayout id={userId} onUserClick={handleUserClick}/>
      </div>
    </div>
  );
};

export default UserProfileComponent;
