import React, { useEffect, useState } from 'react';
import { doc, getDoc, updateDoc, arrayRemove, arrayUnion } from '../firebase';
import { auth, db } from '../firebase';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import '../FollowingListComponent.css'; // Import CSS for animations

function FollowersListComponent({ onUserClick }) {
  const [followersUsers, setFollowersUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [userFollowStatus, setUserFollowStatus] = useState({});
  const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

  useEffect(() => {
    if (!currentUserId) return;

    const fetchFollowers = async () => {
      try {
        // Fetch current user's document
        const currentUserDocRef = doc(db, 'users', currentUserId);
        const currentUserDocSnapshot = await getDoc(currentUserDocRef);
        const currentUserData = currentUserDocSnapshot.data();

        // Fetch user details for each follower user
        if (currentUserData && currentUserData.followers) {
          const followersIds = currentUserData.followers;

          const followersUsersList = await Promise.all(
            followersIds.map(async (userId) => {
              const userDocRef = doc(db, 'users', userId);
              const userDocSnapshot = await getDoc(userDocRef);
              return {
                id: userId,
                ...userDocSnapshot.data(),
              };
            })
          );

          // Create a map for user follow status
          const followStatusMap = {};
          followersIds.forEach(id => (followStatusMap[id] = true));
          setUserFollowStatus(followStatusMap);
          setFollowersUsers(followersUsersList);
        } else {
          setFollowersUsers([]);
        }
      } catch (error) {
        console.error('Error fetching followers list:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowers();
  }, [currentUserId]);

  const handleFollowToggle = async (userId) => {
    if (!currentUserId) {
      console.error('No current user logged in');
      return;
    }

    const userDocRef = doc(db, 'users', userId);
    const currentUserDocRef = doc(db, 'users', currentUserId);

    try {
      const isFollowing = userFollowStatus[userId] || false;

      if (isFollowing) {
        // Unfollow
        await updateDoc(userDocRef, {
          followers: arrayRemove(currentUserId),
        });
        await updateDoc(currentUserDocRef, {
          following: arrayRemove(userId),
        });
        setUserFollowStatus(prev => ({ ...prev, [userId]: false }));
        setFollowersUsers(prev => prev.filter(user => user.id !== userId));
      } else {
        // Follow
        await updateDoc(userDocRef, {
          followers: arrayUnion(currentUserId),
        });
        await updateDoc(currentUserDocRef, {
          following: arrayUnion(userId),
        });
        const userDocSnapshot = await getDoc(doc(db, 'users', userId));
        const newUser = { id: userId, ...userDocSnapshot.data() };
        setFollowersUsers(prev => [...prev, newUser]);
        setUserFollowStatus(prev => ({ ...prev, [userId]: true }));
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  return (
    <div className="w-full h-full rounded-lg overflow-y-auto">
      <ul>
        {loading ? (
          <li className="text-white text-center p-4">Loading...</li>
        ) : (
          <TransitionGroup>
            {followersUsers.length > 0 ? (
              followersUsers.map((user) => (
                <CSSTransition
                  key={user.id}
                  timeout={300}
                  classNames="fade"
                >
                  <li
                    className="flex items-center space-x-4 rounded-xl hover:bg-gray-900 cursor-pointer mb-3 px-2 py-2 transition-transform transform"
                    onClick={() => onUserClick(user.id)} 
                  >
                    <img
                      src={user.profileImage}
                      alt={user.name}
                      className="w-10 h-10 rounded-full border-2 border-white"
                    />
                    <div className="flex-grow">
                      <p className="text-[13px] font-semibold text-white">
                        {user.name && user.name.length > 12
                          ? `${user.name.slice(0, 12)}...`
                          : user.name || ""}
                      </p>
                      <p className="text-xs text-gray-400">
                        {user.credentials && user.credentials.length > 15
                          ? `${user.credentials.slice(0, 15)}...`
                          : user.credentials || ""}
                      </p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation(); // Prevent the click event from bubbling up to the `li`
                        handleFollowToggle(user.id);
                      }}
                      className="ml-auto text-sm px-2 py-1 bg-gradient-to-r from-purple-200 to-blue-300 text-gray-950 rounded-xl shadow-md hover:from-blue-300 hover:to-purple-200 transition-all duration-500 transform hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 backdrop-filter backdrop-blur-md"
                    >
                      {userFollowStatus[user.id] ? 'Following' : 'Follow'}
                    </button>
                  </li>
                </CSSTransition>
              ))
            ) : (
              <li className="text-white text-center p-4">No followers</li>
            )}
          </TransitionGroup>
        )}
      </ul>
    </div>
  );
}

export default FollowersListComponent;
