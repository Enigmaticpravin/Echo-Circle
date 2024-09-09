import React, { useEffect, useState } from 'react';
import OptionTabs from './OptionTabs';
import PostInput from './PostInput';
import FollowUsersComponent from './FollowUsersComponent';
import UserProfileComponent from './user-profile-component';
import QuestionDetails from './QuestionDetails';

function ExploreComponent() {
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [selectedQuestion, setQuestions] = useState(null);

  const handleUserClick = (userId) => {
    setSelectedUserId(userId);
  };

  if (selectedUserId) {
    return <UserProfileComponent userId={selectedUserId} />;
  }

  const handleclick = (questionid) => {
    setQuestions(questionid);
  }

  if (selectedQuestion){
    return <QuestionDetails questionid={selectedQuestion} />
  }

  return (
    <div className="flex-1 flex p-4">
      <div className="flex-1 bg-gray-800 rounded-lg overflow-y-auto p-4 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
        <PostInput/>
        <div className='flex'>
        <h2 className="fixed text-2xl font-semibold text-white font-poppins mt-5">Explore</h2>
        <OptionTabs onclick={handleclick}/>
        </div>
      </div>
      <div className="w-[30%] bg-gray-800 p-4 ml-4 rounded-lg bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50">
          {/* Inbox */}
          <FollowUsersComponent onUserClick={handleUserClick}/>
        </div>
    </div>
  );
}

export default ExploreComponent;
