import React, { useState, useEffect } from 'react';
import { doc, getDocs, collection, query, where, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
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

const UserProfileComponent = ({ userId }) => {
  const [user, setUser] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState([]);
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.data());
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
  }, [userId]);

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
              <button className="px-4 py-2 bg-blue-500 text-white rounded-full font-medium transition-all duration-300 ease-in-out transform hover:scale-105 hover:bg-blue-600 focus:outline-none">
                Follow
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
            {user ? user.bio : "User information not available."}
          </p>
          <GlowingButtons />
          <div className="h-[600px]">
            {posts.length === 0 ? (
              <div className="flex items-center justify-center min-h-screen bg-transparent">
                <div className="relative w-16 h-16 animate-spin">
                  <div className="absolute border-t-4 border-blue-500 border-solid rounded-full inset-0"></div>
                  <div className="absolute border-t-4 border-transparent border-solid rounded-full inset-0 border-l-4 border-blue-500"></div>
                </div>
              </div>
            ) : (
              posts.map(post => (
                <div
                  key={post.id}
                  className={`bg-gray-800 p-4 rounded-lg mb-3 shadow-md w-[600px] cursor-pointer transition-all duration-300 ease-in-out ${expandedPosts.includes(post.id) ? 'post-container-expanded' : 'post-container'}`}
                  onClick={() => handlePostClick(post.id)}
                >
                  {post.user ? (
                    <PostHeader
                      userImage={user.profileImage}
                      userName={user.name}
                      postTime={formatTimeAgo(post.timestamp)}
                    />
                  ) : (
                    <p className="text-gray-400">Loading...</p>
                  )}
                  <div
                    className={`text-white transition-all duration-300 ease-in-out ${expandedPosts.includes(post.id) ? 'post-content expanded' : 'post-content'}`}
                    dangerouslySetInnerHTML={{ __html: post.content }}
                  ></div>
                  <InteractionBar upvotes={post.upvotes || 0} comments={post.comments || 0} />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
      <div className="w-[30%] bg-gray-800 p-4 ml-4 rounded-lg bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        <TabLayout />
      </div>
    </div>
  );
};

export default UserProfileComponent;
