import {React, useState, useEffect} from 'react';
import { auth, db, addDoc, where, updateDoc, arrayRemove, arrayUnion, doc, getDoc, collection, query, getDocs, deleteDoc, serverTimestamp } from '../firebase';

const PostHeader = ({ userImage, userName, userCredential, postTime, userId }) => {
  const currentUser = auth.currentUser;
  const isCurrentUserPost = currentUser && userId === currentUser.uid;
  const [isFollowing, setIsFollowing] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const currentUserId = auth.currentUser ? auth.currentUser.uid : null;

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const userRef = doc(db, 'users', userId);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          if (currentUserId) {
            const currentUserRef = doc(db, 'users', currentUserId);
            const currentUserSnap = await getDoc(currentUserRef);
            const currentUserData = currentUserSnap.data();
            if (currentUserData && currentUserData.following.includes(userId)) {
              setIsFollowing(true);
            }
          }
        }
      } catch (error) {
        console.log(error);
      }
    };

    fetchUserData();
  }, [userId, currentUserId]);

  const handleFollowToggle = async (userId) => {
    if (isProcessing) return; // Prevent multiple clicks while processing

    setIsProcessing(true);
    const currentUser = auth.currentUser;
    const currentUserId = currentUser.uid;
    if (!currentUserId) {
      console.error('No current user logged in');
      return;
    }

    const userDocRef = doc(db, 'users', userId);
    const currentUserDocRef = doc(db, 'users', currentUserId);
    const notificationDocRef = collection(db, 'notifications', userId, 'userNotifications');

    // Optimistically update the state immediately
    setIsFollowing((prev) => !prev);

    try {
      if (isFollowing) {
        // Unfollow
        await updateDoc(userDocRef, {
          followers: arrayRemove(currentUserId),
        });
        await updateDoc(currentUserDocRef, {
          following: arrayRemove(userId),
        });
        
        // Delete the follow notification
        const q = query(
          notificationDocRef,
          where('senderId', '==', currentUserId),
          where('receiverId', '==', userId),
          where('additionalId', '==', currentUserId),
          where('type', '==', 'follow')
        );
        const querySnapshot = await getDocs(q);
        querySnapshot.forEach(async (doc) => {
          await deleteDoc(doc.ref);
        });
      } else {
        // Follow
        await updateDoc(userDocRef, {
          followers: arrayUnion(currentUserId),
        });
        await updateDoc(currentUserDocRef, {
          following: arrayUnion(userId),
        });

        // Add a follow notification
        await addDoc(notificationDocRef, {
          content: `${auth.currentUser.displayName} followed you`,
          type: 'follow',
          date: serverTimestamp(),
          read: false,
          additionalId: currentUserId,
          senderId: currentUserId,
          receiverId: userId,
          postContent: 'none',
        });
      }
    } catch (error) {
      console.error('Error updating follow status:', error);
      // If an error occurs, revert the UI state
      setIsFollowing((prev) => !prev);
    } finally {
      setIsProcessing(false);
    }
  };
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
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleFollowToggle(userId);
          }}
          className={`ml-auto bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:scale-105 ${
            isProcessing ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          disabled={isProcessing} // Disable button while processing
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      ) : (
        <button className="ml-auto bg-blue-500 text-white px-4 py-1 rounded-full hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-400 focus:ring-opacity-50 transition duration-300 ease-in-out transform hover:scale-105 hidden">
          Follow
        </button>
      )}
    </div>
  );
};

export default PostHeader;