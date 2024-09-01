import React from 'react';

const PostInteractions = () => {
  return (
    <div className="p-4 bg-white rounded-lg shadow-md w-[500px]">
          <div className="flex items-center space-x-4">
              <div className="relative flex items-center">
                  {/* Overlapping images */}
                  <div className="flex -space-x-3">
                      <img
                          src="https://via.placeholder.com/40"
                          alt="User 1"
                          className="w-6 h-6 rounded-full border-2 border-white"
                      />
                      <img
                          src="https://via.placeholder.com/40"
                          alt="User 2"
                          className="w-6 h-6 rounded-full border-2 border-white"
                      />
                      <img
                          src="https://via.placeholder.com/40"
                          alt="User 3"
                          className="w-6 h-6 rounded-full border-2 border-white"
                      />
                  </div>

                  {/* Circle with number */}
                  <div className="w-[22px] h-[22px] rounded-full bg-pink-500 text-white flex items-center justify-center text-[7px] absolute -right-2">
                      +13
                  </div>
              </div>

              {/* Comments and Likes */}
              <div className="flex space-x-8 text-gray-500">
                  <span>13 Comments</span>
                  <span>340 Likes</span>
              </div>
          </div>
      
      {/* Like, Comment, and Share Buttons */}
      <div className="flex justify-between items-center mt-4 text-gray-500">
        <div className="flex space-x-4">
          <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors duration-200">
            <span>Like</span>
          </button>
          <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors duration-200">
            <span>Comments</span>
          </button>
          <button className="flex items-center space-x-1 hover:text-blue-500 transition-colors duration-200">
            <span>Share</span>
          </button>
        </div>

        {/* Comment Input */}
        <div className="flex items-center space-x-2 bg-gray-100 rounded-full px-4 py-2">
          <img
            src="https://via.placeholder.com/40"
            alt="User Profile"
            className="w-8 h-8 rounded-full"
          />
          <input
            type="text"
            placeholder="Write a comment..."
            className="bg-transparent outline-none flex-grow"
          />
          <button className="bg-pink-500 rounded-full p-2">
            <svg
              className="w-6 h-6 text-white"
              fill="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
};

export default PostInteractions;
