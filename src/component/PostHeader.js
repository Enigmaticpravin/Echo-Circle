import React from 'react';
import { auth } from '../firebase';

const PostHeader = ({ userImage, userName, userCredential, postTime, userId }) => {
  const currentUser = auth.currentUser;
  const isCurrentUserPost = currentUser && userId === currentUser.uid;
  return (
    <div className="flex items-center mb-2 w-full">
      <img src={userImage} alt={userName} className="w-10 h-10 rounded-full mr-3" />
      <div className="flex flex-col">
        <div className="flex items-center">
          <span className="font-semibold text-white mr-2">{userName}</span>
          <span className="text-gray-400 text-sm">{userCredential}</span>
        </div>
        <span className="text-gray-400 text-sm">{postTime}</span>
      </div>
     {!isCurrentUserPost ? (
        <button className='ml-auto bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:scale-105'>
          Follow
        </button>
     ) : (
      <button className='ml-auto bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:scale-105 hidden'>
      Follow
    </button>
     )}
    </div>
  );
};

export default PostHeader;