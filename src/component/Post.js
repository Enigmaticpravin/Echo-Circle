// Post.js
import React, { useState, useEffect } from 'react';
import { auth, db, doc, getDoc, updateDoc, arrayUnion, arrayRemove, query, collection, onSnapshot, orderBy } from '../firebase';
import PostHeader from './PostHeader';
import upvote from '../images/like-1.svg';
import comment from '../images/message.svg';
import downvote from '../images/dislike.svg';
import share from '../images/send-2.svg';
import more from '../images/more.svg';
import UpvotersDisplay from './UpvotersDisplay';
import CommentSystem from '../component/comment-system';
import UpvotePopup from '../component/UpvotePopup';

const Post = ({ post, onPostClick }) => {
  const [expanded, setExpanded] = useState(false);
  const [showComments, setShowComments] = useState(false);
  const [showUpvotePopup, setShowUpvotePopup] = useState(false);
  const [upvoteUsers, setUpvoteUsers] = useState([]);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState([]);
  const [userCache, setUserCache] = useState({});
  const [posts, setPosts] = useState([]);
  const [openMenuPostId, setOpenMenuPostId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "posts"), orderBy("timestamp", "desc"));
    
    const unsubscribe = onSnapshot(q, async (querySnapshot) => {
      const postsArray = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      
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

  const handlePostClick = (id) => {
    setExpandedPosts(prev => {
      if (prev.includes(id)) {
        return prev;
      } else {
        return [...prev, id];
      }
    });
  };

  const handleUpvote = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("Please log in to upvote");
      return;
    }

    const postRef = doc(db, "posts", post.id);
    const postSnap = await getDoc(postRef);

    if (postSnap.exists()) {
      const postData = postSnap.data();
      const upvotedUsers = postData.upvoted || [];
      const isUpvoted = upvotedUsers.includes(currentUser.uid);

      try {
        if (isUpvoted) {
          await updateDoc(postRef, {
            upvoted: arrayRemove(currentUser.uid)
          });
        } else {
          await updateDoc(postRef, {
            upvoted: arrayUnion(currentUser.uid)
          });
        }

        setUpvoteUsers(upvotedUsers);
        setShowUpvotePopup(true);
      } catch (error) {
        console.error("Error updating upvote:", error);
      }
    }
  };

  const closeUpvotePopup = () => {
    setShowUpvotePopup(false);
    setUpvoteUsers([]);
  };

  useEffect(() => {
    // Fetch the current user ID from auth
    const currentUser = auth.currentUser;
    setCurrentUserId(currentUser ? currentUser.uid : null);
  }, []);

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

  const InteractionBar = () => {
    const currentUser = auth.currentUser;
    const isCurrentUserPost = currentUser && post.user === currentUser.uid;

    return (
      <div className='relative block w-full items-center transition-all duration-300 ease-in-out'>
        <div className='flex items-center relative transition-all duration-300 ease-in-out'>
          <div className="flex py-1 px-3 w-fit items-center space-x-4 mt-4 text-gray-400 bg-gray-900 rounded-lg">
            <button
              className={`flex items-center space-x-1 transition-all duration-300 ease-in-out ${post.upvoted?.includes(auth.currentUser?.uid) ? 'text-blue-500 bg-slate-600 rounded-xl px-4 py-[2px]' : 'hover:text-blue-500'}`}
              onClick={(e) => {
                e.stopPropagation();
                handleUpvote();
              }}
            >
              <img src={upvote} alt="Upvote" className={`w-5 h-5 filter-white`} />
              <span>{(post.upvoted?.length || 0)}</span>
            </button>
            <button className="flex items-center space-x-1 hover:text-red-500 transition-colors duration-200">
              <img src={downvote} alt="Downvote" className="w-5 h-5 filter-white" />
            </button>
            <button className="flex items-center space-x-1 hover:text-green-500 transition-colors duration-200" onClick={(e) => { e.stopPropagation(); setShowComments(!showComments) }}>
              <img src={comment} alt="Comment" className="w-5 h-5 filter-white" />
              <span>{post.comments || 0}</span>
            </button>
            <button className="flex items-center space-x-1 hover:text-yellow-500 transition-colors duration-200">
              <img src={share} alt="Share" className="w-5 h-5 filter-white" />
            </button>
          </div>
          <div className='ml-auto self-center mt-4 bg-gray-900 rounded-lg p-2 cursor-pointer' onClick={(e) => { e.stopPropagation(); setOpenMenuPostId((prevId) => (prevId === post.id ? null : post.id)) }}>
            <img src={more} alt='More' className='w-5 h-5 filter-white' />
          </div>
          {openMenuPostId === post.id && (
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
        {showComments && <CommentSystem postId={post.id} />}
        {showUpvotePopup && (
          <UpvotePopup users={upvoteUsers} onClose={closeUpvotePopup} />
        )}
      </div>
    );
  };

  return (
    <div className={`bg-gray-800 p-4 mt-5 rounded-lg mb-8 shadow-md w-[600px] cursor-pointer transition-all duration-300 ease-in-out ${expanded ? 'post-container-expanded' : 'post-container'}`} onClick={handlePostClick}>
      <PostHeader
        userImage={post.user.profileImage}
        userName={post.user.name}
        postTime={formatTimeAgo(post.timestamp)}
        userId={post.user.userId}
      />
      <div className={`text-white transition-all duration-300 ease-in-out ${expanded ? 'post-content expanded' : 'post-content'}`} dangerouslySetInnerHTML={{ __html: post.content }}></div>
      {expanded && (
        <div className="flex items-center justify-between w-full mt-4">
          <UpvotersDisplay upvoters={post.upvoted || []} />
          <div className="flex space-x-8 text-gray-500">
            <span className='font-poppins text-sm cursor-pointer'>{post.comments || 0} Comments</span>
            <span className='font-poppins text-sm cursor-pointer' onClick={(e) => {
              e.stopPropagation();
              setShowComments(true);
            }}>{post.upvoted?.length || 0} Likes</span>
          </div>
        </div>
      )}
      <InteractionBar />
    </div>
  );
};

export default Post;
