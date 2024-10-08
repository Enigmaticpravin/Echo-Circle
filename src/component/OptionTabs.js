import React, { useState } from 'react';
import DefaultPostComponent from './DefaultPostComponent';
import FollowingPostComponent from './FollowingPostComponent';
import PopularPostComponent from './PopularPostComponent';

const OptionTabs = ( {onclick} ) => {
  const [activeTab, setActiveTab] = useState('recent');

  const handleTabClick = (tab) => {
    setActiveTab(tab);
  };

  return (
    <div className="w-full max-w-full mx-auto bg-transparent mt-4">
      <div className="flex w-fit ml-auto">
        <Tab
          label="Recent"
          isActive={activeTab === 'recent'}
          onClick={() => handleTabClick('recent')}
        />
        <Tab
          label="Following"
          isActive={activeTab === 'following'}
          onClick={() => handleTabClick('following')}
        />
        <Tab
          label="Popular"
          isActive={activeTab === 'popular'}
          onClick={() => handleTabClick('popular')}
        />
      </div>
     <div className="rounded-xl">
        {/* Display content based on the selected tab */}
        {activeTab === 'recent' && <DefaultPostComponent onalick={onclick}/>}
        {activeTab === 'following' && <FollowingPostComponent/>}
        {activeTab === 'popular' && <PopularPostComponent/>}
      </div>
    </div>
  );
};

const Tab = ({ label, isActive, onClick }) => (
  <button
    className={`flex-1 py-1 mr-2 px-4 text-center border rounded-xl transition-colors duration-300 ease-in-out ${
      isActive
        ? 'border-blue-500 text-white bg-gray-700'
        : 'border-transparent text-gray-400 hover:border-gray-500'
    }`}
    onClick={onClick}
  >
    {label}
  </button>
);

export default OptionTabs;
