// CommentSystem.js
import React, { useState, useEffect } from 'react';
import { db, collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, auth } from '../firebase';
import PostInteractions from './PostInteractions';

const CommentItem = ({ comment, isReply, postId, depth = 0 }) => {
  const [showReplyInput, setShowReplyInput] = useState(false);
  const [replyContent, setReplyContent] = useState('');
  const [replies, setReplies] = useState([]);

  useEffect(() => {
    const q = query(collection(db, `posts/${postId}/comments/${comment.id}/replies`), orderBy("timestamp", "asc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const repliesArray = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setReplies(repliesArray);
    });

    return () => unsubscribe();
  }, [postId, comment.id]);

  const handleAddReply = async (e) => {
    e.preventDefault();
    if (!replyContent.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to reply');
      return;
    }

    try {
      await addDoc(collection(db, `posts/${postId}/comments/${comment.id}/replies`), {
        content: replyContent,
        userId: user.uid,
        userName: user.displayName,
        userImage: user.photoURL,
        timestamp: serverTimestamp(),
      });
      setReplyContent('');
      setShowReplyInput(false);
    } catch (error) {
      console.error('Error adding reply: ', error);
    }
  };

  return (
    <div className={`mt-2 ${isReply ? `ml-${4 * depth}` : ''}`}>
      <div className="flex items-center">
        <img src={comment.userImage} alt={comment.userName} className="w-8 h-8 rounded-full mr-2" />
        <span className="font-semibold">{comment.userName}</span>
      </div>
      <p className="mt-1">{comment.content}</p>
      <div className="mt-1 text-sm text-gray-500">
        <button onClick={() => setShowReplyInput(!showReplyInput)} className="mr-2">Reply</button>
        {/* Add upvote functionality here */}
      </div>
      {showReplyInput && (
        <div className='flex w-full'>
          <form onSubmit={handleAddReply} className="flex w-full items-center space-x-2 bg-transparent mt-2">
            <input
              type="text"
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              placeholder="Write a reply..."
              className="w-full p-2 border rounded-xl text-sm text-black"
            />
            <button type="submit" className="mt-1 bg-blue-500 text-white px-4 py-2 rounded-xl text-sm">Reply</button>
          </form>
        </div>
      )}
      {replies.map(reply => (
        <CommentItem key={reply.id} comment={reply} isReply={true} postId={postId} depth={depth + 1} />
      ))}
    </div>
  );
};

const CommentSystem = ({ postId }) => {
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    const q = query(collection(db, `posts/${postId}/comments`), orderBy("timestamp", "asc"));
    
    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const commentsArray = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
      }));
      setComments(commentsArray);
    });

    return () => unsubscribe();
  }, [postId]);

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment.trim()) return;

    const user = auth.currentUser;
    if (!user) {
      alert('You must be logged in to comment');
      return;
    }

    try {
      await addDoc(collection(db, `posts/${postId}/comments`), {
        content: newComment,
        userId: user.uid,
        userName: user.displayName,
        userImage: user.photoURL,
        timestamp: serverTimestamp(),
      });
      setNewComment('');
    } catch (error) {
      console.error('Error adding comment: ', error);
    }
  };

  return (
    <div className="mt-4 w-full">
      <form onSubmit={handleAddComment} className="flex items-center space-x-2 bg-gray-100 rounded-xl">
        <input
          type="text"
          value={newComment}
          onChange={(e) => setNewComment(e.target.value)}
          placeholder="Add a comment..."
          className="flex-grow p-2 text-sm bg-transparent text-black outline-none"
        />
        <button type="submit" className="flex-shrink-0 bg-blue-500 text-white px-4 py-2 text-sm rounded-e-xl whitespace-nowrap">
          Add comment
        </button>
      </form>
      <div className="block space-x-2">
        {comments.map(comment => (
          <CommentItem key={comment.id} comment={comment} postId={postId} />
        ))}
      </div>
    </div>

  );
};

export default CommentSystem;