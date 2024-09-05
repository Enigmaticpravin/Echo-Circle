import React, { useEffect, useState } from 'react';
import { collection, getDocs, doc, getDoc, updateDoc, arrayUnion, arrayRemove, onSnapshot, query, where, serverTimestamp, deleteDoc, addDoc } from '../firebase';
import { auth, db } from '../firebase';

function FollowUsersComponent({ onUserClick }) {
  const [users, setUsers] = useState([]);
  const [userFollowStatus, setUserFollowStatus] = useState({});
  const [loading, setLoading] = useState(true);
  const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

  useEffect(() => {
    if (!currentUserId) return;

    // Real-time listener for users collection
    const unsubscribe = onSnapshot(collection(db, 'users'), (querySnapshot) => {
      const usersList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setUsers(usersList);
    });

    return () => unsubscribe(); // Clean up the listener on component unmount
  }, [currentUserId]);

  useEffect(() => {
    if (!currentUserId) return;

    const fetchFollowStatus = async () => {
      try {
        // Fetch users follow status in parallel
        const usersStatus = await Promise.all(
          users.map(async (user) => {
            const userDocRef = doc(db, 'users', user.id);
            const userDocSnapshot = await getDoc(userDocRef);
            const userData = userDocSnapshot.data();
            return {
              id: user.id,
              isFollowing: userData?.followers?.includes(currentUserId) || false
            };
          })
        );

        // Map the follow status for each user
        const followStatusMap = usersStatus.reduce((map, userStatus) => {
          map[userStatus.id] = userStatus.isFollowing;
          return map;
        }, {});

        setUserFollowStatus(followStatusMap);
      } catch (error) {
        console.error('Error fetching follow status:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchFollowStatus();
  }, [users, currentUserId]);

  const handleFollowToggle = async (userId) => {
    if (!currentUserId) {
      console.error('No current user logged in');
      return;
    }

    const userDocRef = doc(db, 'users', userId);
    const currentUserDocRef = doc(db, 'users', currentUserId);
    const notificationDocRef = collection(db, 'notifications', userId, 'userNotifications');

    try {
      const isFollowing = userFollowStatus[userId] || false;

      if (isFollowing) {
        // Unfollow
        await Promise.all([
          updateDoc(userDocRef, { followers: arrayRemove(currentUserId) }),
          updateDoc(currentUserDocRef, { following: arrayRemove(userId) }),
        ]);
        const q = query(notificationDocRef,
          where("senderId", "==", currentUserId),
          where("receiverId", "==", userId),
          where("additionalId", "==", userId),
          where("type", "==", "follow"));

        const querySnapshot = await getDocs(q);

        // Delete all matching notifications
        querySnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
        setUserFollowStatus(prev => ({ ...prev, [userId]: false }));
      } else {
        // Follow
        await Promise.all([
          updateDoc(userDocRef, { followers: arrayUnion(currentUserId) }),
          updateDoc(currentUserDocRef, { following: arrayUnion(userId) }),
        ]);
        await addDoc(notificationDocRef, {
          content: `${auth.currentUser.displayName} followed you`,
          type: 'follow',
          date: serverTimestamp(),
          read: false,
          additionalId: userId,
          senderId: currentUserId,
          receiverId: userId,
          postContent: "none",
        });
        setUserFollowStatus(prev => ({ ...prev, [userId]: true }));
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
    }
  };

  return (
    <div className="w-full h-full bg-gray-800 rounded-lg bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50 overflow-y-auto">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-base text-white pl-4 mt-4">Suggested Users</h3>
      </div>
      <ul>
        {loading ? (
          <li className="text-white text-center p-4">Loading...</li>
        ) : (
          users.map((user) => (
            <li
              key={user.id}
              className="flex items-center space-x-4 p-2 rounded-xl hover:bg-gray-900 cursor-pointer m-2 transition-transform transform"
              onClick={() => onUserClick(user.id)} >
              <img
                src={user.profileImage}
                alt={user.name}
                className="w-12 h-12 rounded-full border-2 border-white"
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
                onClick={(e) => {e.stopPropagation(); handleFollowToggle(user.id);}}
                className="ml-auto text-sm px-2 py-1 bg-gradient-to-r from-purple-200 to-blue-300 text-gray-950 rounded-xl shadow-md hover:from-blue-300 hover:to-purple-200 transition-all duration-500 transform hover:scale-110 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-purple-400 focus:ring-opacity-50 backdrop-filter backdrop-blur-md"
              >
                {userFollowStatus[user.id] ? 'Following' : 'Follow'}
              </button>
            </li>
          ))
        )}
      </ul>
    </div>
  );
}

export default FollowUsersComponent;
