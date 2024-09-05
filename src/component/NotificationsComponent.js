import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, getDocs, startAfter, limit, db, auth, updateDoc, doc, where, writeBatch } from '../firebase';
import { formatDistanceToNow } from 'date-fns';
import { CSSTransition, TransitionGroup } from 'react-transition-group';
import setting from '../images/setting.svg';
import { useNavigate } from 'react-router-dom';
import UserProfileComponent from './user-profile-component';
import read from '../images/task.svg';
import PostDetails from './PostObject';

const NotificationsComponent = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [currentView, setCurrentView] = useState('notifications');
  const [selectedUserId, setSelectedUserId] = useState(null);
  const navigate = useNavigate();
  const [users, setUsers] = useState({});

  useEffect(() => {
    const fetchUsers = async () => {
      const usersRef = collection(db, 'users');
      const querySnapshot = await getDocs(usersRef);
      const usersData = querySnapshot.docs.reduce((acc, doc) => {
        acc[doc.id] = doc.data();
        return acc;
      }, {});
      setUsers(usersData);
    };

    fetchUsers();
  }, []);

  const fetchNotifications = useCallback(async (startAfterDoc) => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const notificationsRef = collection(db, 'notifications', currentUser.uid, 'userNotifications');
    let q = query(notificationsRef, orderBy('date', 'desc'), limit(20));

    if (startAfterDoc) {
      q = query(q, startAfter(startAfterDoc));
    }

    const querySnapshot = await getDocs(q);
    const notificationsData = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    const uniqueNotifications = [...new Map([...notifications, ...notificationsData].map(item => [item.id, item])).values()];

    setLastVisible(querySnapshot.docs[querySnapshot.docs.length - 1]);
    setNotifications(uniqueNotifications);
    setHasMore(!querySnapshot.empty);
    setLoading(false);
  }, [notifications]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const loadMoreNotifications = () => {
    if (!hasMore || loading) return;
    fetchNotifications(lastVisible);
  };

  const handleNotificationClick = (notification) => {
    if (notification.type === 'follow') {
      setSelectedUserId(notification.additionalId);
      setCurrentView('profile');
    } else if (notification.type === 'upvote') {
      setSelectedUserId(notification.additionalId);
      setCurrentView('post');
    }
  };

  const markAllAsRead = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const notificationsRef = collection(db, 'notifications', currentUser.uid, 'userNotifications');
    const q = query(notificationsRef, where('read', '==', false));

    const querySnapshot = await getDocs(q);
    const batch = writeBatch(db);

    querySnapshot.docs.forEach(doc => {
      batch.update(doc.ref, { read: true });
    });

    await batch.commit();
    setNotifications(prevNotifications => prevNotifications.map(notification => ({
      ...notification,
      read: true
    })));
  };

  if (loading && notifications.length === 0) {
    return (
      <div className="flex justify-center items-center h-full w-full">
        <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-blue-500"></div>
      </div>
    );
  }

  // Conditionally render the profile or notifications list
  if (currentView === 'profile' && selectedUserId) {
    return <UserProfileComponent userId={selectedUserId} />;
  } else if (currentView === 'post' && selectedUserId){
    return <PostDetails postId={selectedUserId} />;
   
  }

  return (
    <div className="flex flex-col p-4 mx-auto max-w-4xl w-full">
      <div className='flex flex-col h-full bg-gray-800 rounded-lg overflow-y-auto p-4 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50'>
        <div className="flex justify-between items-center mb-4">
          <h2 className="text-2xl font-semibold text-white">Notifications</h2>
          <div className="flex space-x-2 bg-slate-700 rounded-xl items-center">
            <button
              onClick={markAllAsRead}
              className=" text-white py-2 px-4 rounded flex items-center space-x-1"
            >
              <img src={read} alt='Read' className='filter-white'/>
              <span>Mark All as Read</span>
            </button>
            <div className='w-[1px] h-5 bg-white rounded-xl justify-center items-start'></div>
            <button
              className=" text-white py-2 px-4 rounded flex items-center space-x-1"
            >
              <img src={setting} alt='Settings' className='filter-white'/>
              <span>Settings</span>
            </button>
          </div>
        </div>
        <TransitionGroup className="space-y-4">
          {notifications.length === 0 ? (
            <p className="text-gray-500">No notifications available.</p>
          ) : (
            notifications.map(notification => (
              <CSSTransition
                key={notification.id}
                timeout={500}
                classNames="fade"
              >
                <div
                  className={`py-2 px-4 rounded-lg w-full shadow-md bg-gray-600 border cursor-pointer ${notification.read ? 'border-gray-200' : 'border-blue-400'
                    } flex items-start`}
                  onClick={() => handleNotificationClick(notification)}>
                  <div className="flex items-center space-x-4 justify-between w-full">
                    <img
                      src={users[notification.senderId]?.profileImage || '/default-profile.png'}
                      alt="Sender"
                      className="w-10 h-10 rounded-full object-cover"
                    />
                    <div className="flex-1">
                      <div className="flex justify-between items-center">
                        <p className="text-sm text-gray-100">{notification.content}</p>
                      </div>
                      <p className="text-xs text-gray-300">
                        {formatDistanceToNow(notification.date?.toDate())} ago
                      </p>
                    </div>
                    <div className={`w-4 h-4 bg-red-500 rounded-full ${notification.read ? 'hidden' : ''}`}></div>
                  </div>
                </div>

              </CSSTransition>
            ))
          )}
        </TransitionGroup>
        {hasMore && (
          <button
            onClick={loadMoreNotifications}
            className="mt-4 bg-blue-500 text-white py-2 px-4 rounded hidden"
          >
            Load More
          </button>
        )}
      </div>
    </div>
  );
};

export default NotificationsComponent;
