import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { doc, getDoc, db, auth, arrayRemove, arrayUnion, writeBatch, where, collection, addDoc, query, getDocs, deleteDoc, serverTimestamp, updateDoc } from '../firebase';
import PostHeader from './PostHeader';
import upvote from '../images/like-1.svg';
import comment from '../images/message.svg';
import downvote from '../images/eye.svg';
import share from '../images/send-2.svg';
import more from '../images/more.svg';
import UpvotersDisplay from './UpvotersDisplay';
import CommentSystem from '../component/comment-system';
import UpvotePopup from '../component/UpvotePopup';
const RelatedPosts = ({ questionid }) => {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedPosts, setExpandedPosts] = useState([]);
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
    const fetchPosts = async () => {
      setLoading(true);
      try {
        const postsCollection = collection(db, 'posts');
        const q = query(postsCollection, where('questionid', '==', questionid));
        const querySnapshot = await getDocs(q);

        const fetchedPosts = await Promise.all(
            querySnapshot.docs.map(async (doc) => {
              const postData = doc.data();
              const user = await fetchUserData(postData.user); // Fetch user details for each post
              return {
                id: doc.id,
                ...postData,
                user, // Include the user details in the post
              };
            })
          );
          console.log("Fetched posts:", fetchedPosts); // Add this line
        setPosts(fetchedPosts);
      } catch (err) {
        setError(err);
        console.error("Error fetching posts:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchPosts();
  }, [questionid]);

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

  const handleUpvote = async (postId) => {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      console.log("Please log in to upvote");
      return;
    }
  
    const postRef = doc(db, "posts", postId);
    const batch = writeBatch(db);
  
    try {
      const postSnap = await getDoc(postRef);
      if (!postSnap.exists()) {
        console.error("Post not found");
        return;
      }
  
      const postData = postSnap.data();
      const upvotedUsers = postData.upvoted || [];
      const isUpvoted = upvotedUsers.includes(currentUser.uid);
  
      // Optimistic UI update
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
  
      // Batch Firestore update
      if (isUpvoted) {
        batch.update(postRef, { upvoted: arrayRemove(currentUser.uid) });
      } else {
        batch.update(postRef, { upvoted: arrayUnion(currentUser.uid) });
      }
  
      await batch.commit();
  
      // Trigger upvote notification
      await handleUpvoteNotification(postId, isUpvoted, postData.user, postData.content);
      
    } catch (error) {
      console.error("Error updating upvote:", error);
    }
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
  


  const handlePostClick = async (id) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return; // Ensure user is logged in
  
    const postRef = doc(db, "posts", id);
    const postSnap = await getDoc(postRef);
  
    if (postSnap.exists()) {
      const postData = postSnap.data();
      const viewedBy = postData.viewedBy || [];
  
      // If user hasn't viewed the post yet, update view count
      if (!viewedBy.includes(currentUser.uid)) {
        await updateDoc(postRef, {
          viewedBy: arrayUnion(currentUser.uid),
          viewCount: postData.viewCount ? postData.viewCount + 1 : 1
        });
        console.log("View count updated");
      } else {
        console.log("User has already viewed this post");
      }
    } else {
      console.error("Post not found");
    }
  
    setExpandedPosts(prev => {
      if (prev.includes(id)) {
        return prev;
      } else {
        return [...prev, id];
      }
    });
  };

  const InteractionBar = React.memo (({ upvotes, comments, postId, postUser, views }) => {
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
              <span>{(views?.length || 0)}</span>
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
  });

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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full w-full bg-transparent">
        <div className="relative w-16 h-16 animate-spin">
          <div className="absolute border-t-4 border-blue-500 border-solid rounded-full inset-0"></div>
          <div className="absolute border-t-4 border-transparent border-solid rounded-full inset-0 border-l-4 border-blue-500"></div>
        </div>
      </div>
    );
  }
  if (error) return <div>Error loading posts: {error.message}</div>;

  return (
    <div>
      {posts.length === 0 ? (
        <div>No related posts found.</div>
      ) : (
        <ul>
                      {posts.map(post => (
                          <li key={post.id}
                              className={`bg-gray-800 p-4 mt-2 rounded-lg mb-2 shadow-md w-[600px] cursor-pointer transition-all duration-300 ease-in-out ${expandedPosts.includes(post.id) ? 'post-container-expanded' : 'post-container'
                                  }`}
                              onClick={() => handlePostClick(post.id)}>
                              {post.user ? (
                                  <PostHeader
                                      userImage={post.user.profileImage}
                                      userName={post.user.name}
                                      postTime={formatTimeAgo(post.timestamp)}
                                      userId={post.user.userId}
                                  />
                              ) : (
                                  <p className="text-gray-400">Loading user data...</p>
                              )}
                              <div
                                  className={`text-white transition-all duration-300 ease-in-out ${expandedPosts.includes(post.id) ? 'post-content expanded' : 'post-content'
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
                                              }}>{post.upvoted?.length + " Likes" || 0} </span>
                                      </div>
                                  </div>
                              )}
                              <InteractionBar
                                  upvotes={post.upvoted}
                                  comments={post.commentsCount}
                                  postId={post.id}
                                  postUser={post.user}
                                  views={post.viewedBy}
                              />
                          </li>

                      ))}
        </ul>
      )}
    </div>
  );
};

export default RelatedPosts;
