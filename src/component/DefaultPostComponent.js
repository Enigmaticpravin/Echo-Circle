import React, { useEffect, useState } from 'react';
import { db, collection, query, orderBy, onSnapshot, doc, getDoc, getDocs, where, updateDoc, arrayUnion, arrayRemove, auth, deleteDoc, serverTimestamp, addDoc } from '../firebase';
import PostHeader from './PostHeader';
import upvote from '../images/like-1.svg';
import comment from '../images/message.svg';
import downvote from '../images/dislike.svg';
import share from '../images/send-2.svg';
import more from '../images/more.svg';
import UpvotersDisplay from './UpvotersDisplay';
import CommentSystem from '../component/comment-system';
import UpvotePopup from '../component/UpvotePopup';

function DefaultPostComponent() {
  const [posts, setPosts] = useState([]);
  const [expandedPosts, setExpandedPosts] = useState([]);
  const [userCache, setUserCache] = useState({});
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [showUpvotePopup, setShowUpvotePopup] = useState(false);
  const [upvoteUsers, setUpvoteUsers] = useState([]);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const postsArray = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
      // Fetch user data for each post
      const postsWithUserData = await Promise.all(postsArray.map(async (post) => {
        const user = await fetchUserData(post.user);
        return { ...post, user };
      }));
      
      setPosts(postsWithUserData);
    });

    return () => unsubscribe();
  }, []);

  const fetchUserData = async (postUserId) => {
    if (userCache[postUserId]) {
      return userCache[postUserId];
    }

    const userRef = doc(db, 'users', postUserId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      setUserCache(prevCache => ({ ...prevCache, [postUserId]: userData }));
      return userData;
    } else {
      console.error('No such user!');
      return null;
    }
  };

  const toggleMenu = (postId) => {
    setOpenMenuPostId((prevPostId) => (prevPostId === postId ? null : postId));
  };

  const handlePostClick = (id) => {
    setExpandedPosts(prev => {
      if (prev.includes(id)) {
        return prev;
      } else {
        return [...prev, id];
      }
    });
  };

  const handleUpvoteNotification = async (postId, isUpvoted, postOwnerId, postContent) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
  
    const notificationsRef = collection(db, 'notifications', postOwnerId, 'userNotifications');
  
    if (isUpvoted) {
      // If the post is already upvoted, find and delete the corresponding notification
      const q = query(notificationsRef, 
                      where("senderId", "==", currentUser.uid), 
                      where("receiverId", "==", postOwnerId), 
                      where("additionalId", "==", postId),
                      where("type", "==", "upvote"));
  
      const querySnapshot = await getDocs(q);
  
      // Delete all matching notifications
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
  
    } else {
      // Add a new notification
      await addDoc(notificationsRef, {
        content: `${currentUser.displayName} upvoted your post`,
        type: 'upvote',
        date: serverTimestamp(),
        read: false,
        additionalId: postId,
        senderId: currentUser.uid,
        receiverId: postOwnerId,
        postContent: postContent,
      });
    }
  };

  const handleUpvote = async (postId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
        console.log("Please log in to upvote");
        return;
    }

    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);

    if (postSnap.exists()) {
        const postData = postSnap.data();
        const upvotedUsers = postData.upvoted || [];
        const isUpvoted = upvotedUsers.includes(currentUser.uid);

        try {
            // Update Firestore first
            if (isUpvoted) {
                await updateDoc(postRef, {
                    upvoted: arrayRemove(currentUser.uid)
                });
            } else {
                await updateDoc(postRef, {
                    upvoted: arrayUnion(currentUser.uid)
                });
            }

            await handleUpvoteNotification(postId, isUpvoted, postData.user, postData.content);

            // Only after Firestore is updated, update the local state
            setPosts(prevPosts =>
                prevPosts.map(post =>
                    post.id === postId
                        ? {
                            ...post,
                            upvoted: isUpvoted
                                ? post.upvoted.filter(id => id !== currentUser.uid)
                                : [...(post.upvoted || []), currentUser.uid]
                        }
                        : post
                )
            );
        } catch (error) {
            console.error("Error updating upvote:", error);
        }
    }
};

  const formatTimeAgo = (timestamp) => {
    const now = new Date();
    const postDate = new Date(timestamp.toDate());
    const differenceInSeconds = Math.floor((now - postDate) / 1000);

    const minutes = Math.floor(differenceInSeconds / 60);
    const hours = Math.floor(differenceInSeconds / 3600);
    const days = Math.floor(differenceInSeconds / 86400);

    if (minutes < 1) return "Just now";
    if (minutes < 60) return `${minutes} minutes ago`;
    if (hours < 24) return `${hours} hours ago`;
    if (days < 7) return `${days} days ago`;
    return postDate.toLocaleDateString();
  };

  const handleLikesClick = async (postId) => {
    if (typeof postId !== 'string') {
      console.error('postId should be a string:', postId);
      return;
    }
    
    try {
      const postDocRef = doc(db, 'posts', postId);
      const postSnapshot = await getDoc(postDocRef);
      
      if (postSnapshot.exists()) {
        const postData = postSnapshot.data();
        const upvoteUsers = postData.upvoted || [];
        setUpvoteUsers(upvoteUsers);
        setShowUpvotePopup(true);
      } else {
        console.error('Post does not exist:', postId);
      }
    } catch (error) {
      console.error('Error fetching upvoted users:', error);
    }
  };
  

  const closeUpvotePopup = () => {
    setShowUpvotePopup(false);
    setUpvoteUsers([]);
  };


  const InteractionBar = ({ upvotes, comments, postId, postUser }) => {
    const currentUser = auth.currentUser;
    const isCurrentUserPost = currentUser && postUser.userId === currentUser.uid;
    const [showComments, setShowComments] = useState(false);

    const post = posts.find(p => p.id === postId);
    const isUpvoted = post?.upvoted?.includes(currentUser?.uid);

    return (
      <div className='relative block w-full items-center transition-all duration-300 ease-in-out'>
        <div className='flex items-center relative transition-all duration-300 ease-in-out'>
        <div className="flex py-1 px-3 w-fit items-center space-x-4 mt-4 text-gray-400 bg-gray-900 rounded-lg">
  <button
    className={`flex items-center space-x-1 transition-all duration-300 ease-in-out
                ${isUpvoted ? 'text-blue-500 bg-slate-600 rounded-xl px-4 py-[2px]' : 'hover:text-blue-500'}`}
    onClick={(e) => {
      e.stopPropagation();
      handleUpvote(postId);
    }}
  >
    <img src={upvote} alt="Upvote" className={`w-5 h-5 filter-white`} />
    <span>{(upvotes?.length || 0)}</span>
  </button>
  <button className="flex items-center space-x-1 hover:text-red-500 transition-colors duration-200">
    <img src={downvote} alt="Downvote" className="w-5 h-5 filter-white" />
  </button>
  <button className="flex items-center space-x-1 hover:text-green-500 transition-colors duration-200"
    onClick={(e) => {e.stopPropagation(); setShowComments(!showComments)}}>
    <img src={comment} alt="Comment" className="w-5 h-5 filter-white" />
    <span>{comments}</span>
  </button>
  <button className="flex items-center space-x-1 hover:text-yellow-500 transition-colors duration-200">
    <img src={share} alt="Share" className="w-5 h-5 filter-white" />
  </button>
</div>
        <div className='ml-auto self-center mt-4 bg-gray-900 rounded-lg p-2 cursor-pointer' 
        onClick={(e) => {e.stopPropagation(); toggleMenu(postId)}}>
          <img src={more} alt='More' className='w-5 h-5 filter-white' />
        </div>
        {openMenuPostId === postId && (
          <div className="absolute right-0 mt-2 w-48 bg-gray-600 rounded-lg shadow-lg z-10 mb-64 animate-fold">
            <ul className="py-1 text-sm text-white relative">
              {isCurrentUserPost ? (
                <>
                  <li className="px-4 py-2 hover:bg-gray-700 mt-2 hover:rounded-lg ml-2 mr-2 cursor-pointer">Delete</li>
                  <li className="px-4 py-2 hover:bg-gray-700 mt-2 hover:rounded-lg ml-2 mr-2 cursor-pointer">Copy Link</li>
                </>
              ) : (
                <>
                  <li className="px-4 py-2 hover:bg-gray-700 mt-2 hover:rounded-lg ml-2 mr-2 cursor-pointer">Copy Link</li>
                  <li className="px-4 py-2 hover:bg-gray-700 mt-2 hover:rounded-lg ml-2 mr-2 cursor-pointer">Report</li>
                  <li className="px-4 py-2 hover:bg-gray-700 mt-2 hover:rounded-lg mb-2 ml-2 mr-2 cursor-pointer">Not Interested</li>
                </>
              )}
            </ul>
            <div className="absolute -bottom-2 right-3 w-4 h-4 bg-gray-600 rounded-md transform rotate-45"></div>
          </div>
        )}
        </div>
         {showComments && <CommentSystem postId={postId} />}
         {showUpvotePopup && (
        <UpvotePopup users={upvoteUsers} onClose={closeUpvotePopup} />
      )}
      </div>
    );
  };

  return (
    <div className="block p-4">
       {posts.length === 0 ? (
              <div className="flex items-center justify-center min-h-fit bg-transparent">
              <div className="relative w-16 h-16 animate-spin mt-36">
                <div className="absolute border-t-4 border-blue-500 border-solid rounded-full inset-0"></div>
                <div className="absolute border-t-4 border-transparent border-solid rounded-full inset-0 border-l-4 border-blue-500"></div>
              </div>
            </div>
        ) : (
          posts.map(post => (
            <div
              key={post.id}
              className={`bg-gray-800 p-4 mt-5 rounded-lg mb-8 shadow-md w-[600px] cursor-pointer transition-all duration-300 ease-in-out ${
                expandedPosts.includes(post.id) ? 'post-container-expanded' : 'post-container'
              }`}
              onClick={() => handlePostClick(post.id)}
            >
              {post.user ? (
                <PostHeader
                  userImage={post.user.profileImage}
                  userName={post.user.name}
                  postTime={formatTimeAgo(post.timestamp)}
                  userId={post.user.userId}
                />
              ) : (
                <p className="text-gray-400">Loading...</p>
              )}
              <div
                className={`text-white transition-all duration-300 ease-in-out ${
                  expandedPosts.includes(post.id) ? 'post-content expanded' : 'post-content'
                }`}
                dangerouslySetInnerHTML={{ __html: post.content }}
              ></div>
          {expandedPosts.includes(post.id) && (
                  <div className="flex items-center justify-between w-full mt-4">
               <UpvotersDisplay upvoters={post.upvoted || []} />
  
                  {/* Comments and Likes */}
                  <div className="flex space-x-8 text-gray-500">
                    <span className='font-poppins text-sm cursor-pointer'>13 Comments</span>
                    <span className='font-poppins text-sm cursor-pointer'
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLikesClick(post.id);
                    }}>{post.upvoted?.length +" Likes" || 0} </span>
                  </div>
                </div>
              )}
               <InteractionBar upvotes={post.upvoted || 0} comments={post.comments || 0} postId={post.id} postUser={post.user}/>
            </div>
          ))
        )}
    </div>
  );
}

export default DefaultPostComponent;
