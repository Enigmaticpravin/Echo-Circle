import React, { useState, useEffect, useRef } from 'react';
import { X, ChevronDown, Globe } from 'lucide-react';
import { auth, db, doc, getDoc, collection, addDoc, serverTimestamp } from '../firebase';

const QuestionPopup = ({ onClose }) => {
  const [user, setUser] = useState(null);
  const [isEmpty, setIsEmpty] = useState(true);
  const contentEditableRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          setUser(userSnap.data());
        }
      }
    };

    fetchUserData();
  }, []);

  const handleInput = () => {
    const content = contentEditableRef.current.innerText.trim();
    setIsEmpty(content === '');
  };


  const handlePost = async () => {
    // Get content with line breaks preserved as <br> tags
    let content = contentEditableRef.current.innerHTML;
    
    // Replace newline characters with <br> tags if needed
    // This ensures that line breaks are preserved
    content = content.replace(/\n/g, '<br>');

    console.log('Post Content:', content);
  
    setUploading(true); // Start uploading

    // Simulate upload progress (e.g., by using a timeout)
    let progressValue = 0;
    const interval = setInterval(() => {
      progressValue += 10; // Increment progress
      setProgress(progressValue);

      if (progressValue >= 100) {
        clearInterval(interval);
        setUploading(false); // End uploading
      }
    }, 500);
    
    // Assuming you have a Firestore collection for posts
    try {
      const questionRef = await addDoc(collection(db, "questions"), {
        content,
        timestamp: new Date(),
        user: user.userId,
        tags: ""
      });
      console.log('Post saved successfully');

    // Fetch user's followers
    const userDocRef = doc(db, 'users', user.userId);
    const userDocSnapshot = await getDoc(userDocRef);
    const userData = userDocSnapshot.data();
    if (userData && userData.followers) {
      const followersIds = userData.followers;

      // Send a notification to each follower
      const notificationsRef = collection(db, 'notifications');
      await Promise.all(followersIds.map(async (followerId) => {
        await addDoc(collection(notificationsRef, followerId, 'userNotifications'), {
          content: `${user.name} asked a question: ${content.substring(0, 30)}...`,
          type: 'question',
          date: serverTimestamp(),
          read: false,
          additionalId: questionRef.id,
          senderId: user.userId,
          receiverId: followerId,
          questionId: questionRef.id,
        });
      }));

      console.log('Notifications sent to followers');
    }

      onClose();
    } catch (error) {
      console.error('Error saving post:', error);
    }
};

  if (!user) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
      <div className="bg-gray-900 w-full max-w-2xl rounded-xl shadow-xl z-50 relative flex flex-col h-[90%]">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <div className="flex space-x-4">
            <button className="text-white font-semibold">Ask a question</button>
            <div className="flex items-center text-gray-400 text-sm">
              <Globe size={16} className="mr-1" />
              <span>Everyone</span>
              <ChevronDown size={16} className="ml-1" />
            </div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex-grow relative overflow-y-auto">
          <div className="flex items-center space-x-2 mb-4 relative z-10">
            <img src={user.profileImage} alt={user.name} className="w-10 h-10 rounded-full" />
            <div className="flex-grow">
              <h3 className="text-white font-semibold">{user.name}</h3>
              <button className="text-gray-400 text-sm flex items-center">
                Chief Technology Officer at Rutba Event (2024-present)
                <ChevronDown size={16} className="ml-1" />
              </button>
            </div>
          </div>

          <div className="relative w-full h-[60%]">
            {isEmpty && (
              <div className="absolute inset-0 text-gray-500 p-2 pointer-events-none">
                Got a question that keeps you up at night? Throw it in here!
              </div>
            )}
            <div
              ref={contentEditableRef}
              contentEditable
              onInput={handleInput}
              className="w-full h-full bg-transparent text-white resize-none focus:outline-none p-2 relative z-10"
              style={{ whiteSpace: 'pre-wrap' }}
            ></div>
          </div>
        </div>

        {/* Toolbar and Post button at the bottom */}

         {/* Toolbar and Post button at the bottom */}
         <div className="relative flex flex-col h-16 bg-gray-800 border-t border-gray-700 rounded-b-xl overflow-hidden p-5">

          <div
            className={`absolute inset-0 flex items-center`}
          >
          <div className="p-4  flex items-center flex-1">
    <span className="text-sm font-bold mr-2 text-yellow-600">⚠️ Warning: </span>
    <p className="text-sm text-white">
       Please ask genuine questions and maintain a respectful tone.
    </p>
  </div>
            <button
              className="bg-blue-500 text-white px-4 py-1 rounded-full font-semibold hover:bg-blue-600 mr-4"
              onClick={handlePost}
              disabled={uploading}
            >
              Post
            </button>
            {uploading && (
              <div className=' bg-black/40 flex items-center justify-center'>
                <div className='bg-transparent p-4 rounded-lg flex items-center space-x-4'>
                  <p>Uploading...</p>
                  <div className='relative flex items-center'>
                    <div className='flex mb-2 items-center justify-center mt-2'>
                      <div className='text-xs font-semibold inline-block py-1 px-2 rounded-full text-teal-600 bg-teal-200'>
                        {progress}%
                      </div>
                    </div>
                    <div className='relative flex mb-2 items-center justify-center ml-2'>
                      <div className='w-full bg-gray-200 rounded-full'>
                        <div className='bg-blue-500 text-xs leading-none py-1 text-center text-white rounded-full' style={{ width: `${progress}%` }}></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
        </div>
    </div>
  );
}
export default QuestionPopup;
