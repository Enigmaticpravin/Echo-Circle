import React, { useEffect, useState } from 'react';
import TabLayout from './TabLayout';
import OptionTabs from './OptionTabs';
import PostInput from './PostInput';
import FollowUsersComponent from './FollowUsersComponent';

function ExploreComponent() {

  return (
    <div className="flex-1 flex p-4">
      <div className="flex-1 bg-gray-800 rounded-lg overflow-y-auto p-4 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        <PostInput onClick=""/>
        <div className='flex'>
        <h2 className="fixed text-2xl font-semibold text-white font-poppins mt-5">Explore</h2>
        <OptionTabs/>
        </div>
      </div>
      <div className="w-1/4 bg-gray-800 p-4 ml-4 rounded-lg bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
          {/* Inbox */}
          <FollowUsersComponent/>
        </div>
    </div>
  );
}

export default ExploreComponent;
