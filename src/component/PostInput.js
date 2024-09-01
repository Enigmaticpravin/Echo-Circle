import React, { useEffect, useState } from 'react';
import { User, HelpCircle, Send, PenTool } from 'lucide-react';
import edit from '../images/designtools.svg';
import ask from '../images/additem.svg'
import answer from '../images/directbox-notif.svg';
import QuoraPostPopup from './QuoraPostPopup';

const PostInput = () => {
  const [showQuoraPopup, setShowQuoraPopup] = useState(false);

  const toggleQuoraPopup = () => {
    setShowQuoraPopup(!showQuoraPopup);
  };
  
  return (
    <div className="bg-gray-800 text-white p-4 rounded-lg shadow-md">
      {showQuoraPopup && <QuoraPostPopup onClose={toggleQuoraPopup} />}
      <div className="flex items-center space-x-2 mb-4">
        <div className="w-8 h-8 bg-gray-700 rounded-full flex items-center justify-center">
          <User size={20} />
        </div>
        <input
          type="text"
          placeholder="What do you want to ask or share?"
          className="bg-transparent text-white placeholder-gray-500 flex-grow outline-none cursor-pointer"
          onClick={toggleQuoraPopup}
        />
      </div>
      <div className="flex w-full">
        <div className="flex w-full space-x-2">
          <button className="bg-gray-700 text-white px-3 py-1 rounded-lg flex items-center justify-center space-x-2 flex-1"
          onClick={toggleQuoraPopup}>
            <img src={ask} alt="Ask" className="w-5 h-5 filter-white" />
            <span>Ask</span>
          </button>
          <button className="bg-gray-700 text-white px-3 py-1 rounded-lg flex items-center justify-center space-x-2 flex-1"
               onClick={toggleQuoraPopup}>
            <img src={answer} alt="Answer" className="w-5 h-5 filter-white" />
            <span>Answer</span>
          </button>
          <button className="bg-gray-700 text-white px-3 py-1 rounded-lg flex items-center justify-center space-x-2 flex-1"
               onClick={toggleQuoraPopup}>
            <img src={edit} alt="Edit" className="w-5 h-5 filter-white" />
            <span>Post</span>
          </button>
        </div>
      </div>

    </div>
  );
};

export default PostInput;