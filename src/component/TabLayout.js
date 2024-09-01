import React, { useState } from 'react';
import FollowingListComponent from './FollowingListComponent';
import FollowersListComponent from './FollowersListComponent';

const TabLayout = ({ onUserClick }) => {
  const [activeTab, setActiveTab] = useState('tab1');

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="w-full max-w-md mx-auto bg-gray-800 rounded-lg shadow-lg h-full">
      <div className="flex justify-between bg-gray-800 rounded-t-lg overflow-hidden">
        <TabButton
          label="Followers"
          isActive={activeTab === 'tab1'}
          onClick={() => handleTabClick('tab1')}
        />
        <TabButton
          label="Following"
          isActive={activeTab === 'tab2'}
          onClick={() => handleTabClick('tab2')}
        />
      </div>
      <div className="p-4 bg-gray-800 rounded-b-lg text-white">
        {activeTab === 'tab1' && <FollowersListComponent onUserClick={onUserClick}/>}
        {activeTab === 'tab2' && <FollowingListComponent onUserClick={onUserClick}/>}
      </div>
    </div>
  );
};

const TabButton = ({ label, isActive, onClick }) => (
  <button
    className={`flex-1 py-2 px-4 transition-all duration-300 ease-in-out text-center relative ${
      isActive
        ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white font-bold'
        : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
    }`}
    onClick={onClick}
  >
    {isActive && (
      <span className="absolute inset-0 bg-blue-600 rounded-full opacity-30 animate-bubble"></span>
    )}
    <span className="relative z-10">{label}</span>
  </button>
);

const TabContent = ({ content }) => (
  <div className="animate-fade-in">
    <p>{content}</p>
  </div>
);

export default TabLayout;
