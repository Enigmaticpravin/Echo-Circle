import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { doc, getDoc, db, auth, arrayRemove, arrayUnion, where, collection, addDoc, query, getDocs, deleteDoc, serverTimestamp, updateDoc } from '../firebase';
import PostHeader from './PostHeader';
import upvote from '../images/like-1.svg';
import comment from '../images/message.svg';
import downvote from '../images/dislike.svg';
import share from '../images/send-2.svg';
import more from '../images/more.svg';
import UpvotersDisplay from './UpvotersDisplay';
import AnswerContent from './AnswerContent';
import CommentSystem from '../component/comment-system';
import UpvotePopup from '../component/UpvotePopup';

function FullAnswer({ postId, questionid }) {
  const [post, setPost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [userCache, setUserCache] = useState({});
  const [openMenuPostId, setOpenMenuPostId] = useState(null);
  const [showUpvotePopup, setShowUpvotePopup] = useState(false);
  const [upvoteUsers, setUpvoteUsers] = useState([]);

  const fetchUserData = useCallback(async (postUserId) => {
    if (userCache[postUserId]) {
      return userCache[postUserId];
    }
  
    const userRef = doc(db, 'users', postUserId);
    const userSnap = await getDoc(userRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      setUserCache((prevCache) => ({ ...prevCache, [postUserId]: userData }));
      return userData;
    } else {
      console.error('No such user!');
      return null;
    }
  }, [userCache]);

  useEffect(() => {
    const fetchPostDetails = async () => {
      if (!postId) return;

      try {
        const postRef = doc(db, 'posts', postId);
        const postSnap = await getDoc(postRef);

        if (postSnap.exists()) {
          const postData = postSnap.data();
          const user = await fetchUserData(postData.user);
          setPost({ id: postSnap.id, ...postData, user });
        } else {
          console.error('No such post!');
        }
      } catch (error) {
        console.error('Error fetching post details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchPostDetails();
  }, [postId, fetchUserData]);

  const closeUpvotePopup = useCallback(() => {
    setShowUpvotePopup(false);
    setUpvoteUsers([]);
  }, []);

  const toggleMenu = useCallback((postId) => {
    setOpenMenuPostId((prevPostId) => (prevPostId === postId ? null : postId));
  }, []);

  const handleUpvoteNotification = useCallback(async (postId, isUpvoted, postOwnerId, postContent) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
  
    const notificationsRef = collection(db, 'notifications', postOwnerId, 'userNotifications');
  
    if (isUpvoted) {
      const q = query(notificationsRef, 
                      where("senderId", "==", currentUser.uid), 
                      where("receiverId", "==", postOwnerId), 
                      where("additionalId", "==", postId),
                      where("type", "==", "upvote"));
  
      const querySnapshot = await getDocs(q);
  
      querySnapshot.forEach(async (doc) => {
        await deleteDoc(doc.ref);
      });
  
    } else {
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
  }, []);

  const handleUpvote = useCallback(async (postId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("Please log in to upvote");
      return;
    }

    const isUpvoted = post?.upvoted?.includes(currentUser.uid);

    // Optimistic update
    setPost((prevPost) => ({
      ...prevPost,
      upvoted: isUpvoted
        ? prevPost.upvoted.filter((id) => id !== currentUser.uid)
        : [...(prevPost.upvoted || []), currentUser.uid],
    }));

    try {
      const postRef = doc(db, "posts", postId);
      await updateDoc(postRef, {
        upvoted: isUpvoted
          ? arrayRemove(currentUser.uid)
          : arrayUnion(currentUser.uid),
      });

      // Fetch the updated post data
      const updatedPostSnap = await getDoc(postRef);
      if (updatedPostSnap.exists()) {
        const updatedPostData = updatedPostSnap.data();
        setPost((prevPost) => ({
          ...prevPost,
          upvoted: updatedPostData.upvoted || [],
        }));
      }

      // Handle upvote notification
      await handleUpvoteNotification(postId, isUpvoted, post.user.userId, post.content);
    } catch (error) {
      console.error("Error updating upvote:", error);
      // Revert optimistic update on error
      setPost((prevPost) => ({
        ...prevPost,
        upvoted: isUpvoted
          ? [...(prevPost.upvoted || []), currentUser.uid]
          : prevPost.upvoted.filter((id) => id !== currentUser.uid),
      }));
    }
  }, [post, handleUpvoteNotification]);

  function GhazalContent({ content }) {
    return (
      <div className="ghazal-container"
     dangerouslySetInnerHTML={{ __html: content }}>
      </div>
    );
  }

  const InteractionBar = ({ upvotes, comments, postId, postUser }) => {
    const [showComments, setShowComments] = useState(false);
    const currentUser = auth.currentUser;
    const isCurrentUserPost = currentUser && postUser.userId === currentUser.uid;
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
              onClick={(e) => { e.stopPropagation(); setShowComments(!showComments) }}>
              <img src={comment} alt="Comment" className="w-5 h-5 filter-white" />
              <span>{comments}</span>
            </button>
            <button className="flex items-center space-x-1 hover:text-yellow-500 transition-colors duration-200">
              <img src={share} alt="Share" className="w-5 h-5 filter-white" />
            </button>
          </div>
          <div className='ml-auto self-center mt-4 bg-gray-900 rounded-lg p-2 cursor-pointer'
            onClick={(e) => { e.stopPropagation(); toggleMenu(postId) }}>
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

  const memoizedInteractionBar = useMemo(() => InteractionBar, [post, openMenuPostId, showUpvotePopup, upvoteUsers, handleUpvote, toggleMenu, closeUpvotePopup]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-fit bg-transparent">
        <div className="relative w-16 h-16 animate-spin">
          <div className="absolute border-t-4 border-blue-500 border-solid rounded-full inset-0"></div>
          <div className="absolute border-t-4 border-transparent border-solid rounded-full inset-0 border-l-4 border-blue-500"></div>
        </div>
      </div>
    );
  }

  if (!post) {
    return <div className="text-gray-400">Post not found</div>;
  }

  return (
    <div className="flex flex-col p-4 mx-auto w-fit">
      <div className='flex flex-col h-full bg-gray-800 rounded-lg overflow-y-auto p-4 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50'>
        <div className="flex justify-between items-center mb-4">
          <div className="bg-gray-800 p-4 mt-5 rounded-lg mb-8 shadow-md w-[600px] overflow-y-auto">
            {post.user ? (
              <PostHeader
                userImage={post.user.profileImage}
                userName={post.user.name}
                postTime={new Date(post.timestamp.toDate()).toLocaleString()}
                userId={post.user.userId}
              />
            ) : (
              <p className="text-gray-400">Loading user data...</p>
            )}
           {post.type === "Ghazal" ? (
                <GhazalContent content={post.content} />
              ) : post.type === "answer" ? (
                <div className="answer-content">
                  <AnswerContent questionid={post.questionid} answerContent={post.content} />
                  <div
                  className={`text-white`}
                  dangerouslySetInnerHTML={{ __html: post.content }}
                ></div>
                </div>
              ) : (
                <div
                  className={`text-white`}
                  dangerouslySetInnerHTML={{ __html: post.content }}
                ></div>
              )}
            <InteractionBar
              upvotes={post.upvoted}
              comments={post.commentsCount}
              postId={postId}
              postUser={post.user}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default FullAnswer;