import React, { useEffect, useState, useCallback } from 'react';
import { collection, query, orderBy, getDocs, startAfter, limit, db, auth, updateDoc, doc, where, writeBatch } from '../firebase';
import { formatDistanceToNow } from 'date-fns';
import { CSSTransition, TransitionGroup } from 'react-transition-group';

const NotificationsComponent = () => {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [lastVisible, setLastVisible] = useState(null);
  const [hasMore, setHasMore] = useState(true);
  const [users, setUsers] = useState({});

  // Fetch users data to get profile pictures
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

  return (
    <div className="flex-1 flex p-4">
        <div className='flex-1 bg-gray-800 rounded-lg overflow-y-auto p-4 bg-opacity-50 backdrop-blur-lg shadow-2xl border border-gray-700 border-opacity-50'>
        <h2 className="text-2xl font-semibold mb-4">Notifications</h2>
      <button
        onClick={markAllAsRead}
        className="mb-4 bg-green-500 text-white py-2 px-4 rounded"
      >
        Mark All as Read
      </button>
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
                className={`p-4 rounded-lg shadow-md bg-white border ${
                  notification.read ? 'border-gray-200' : 'border-blue-400'
                } flex items-center space-x-4`}
              >
                <img
                  src={users[notification.senderId]?.profileImage || '/default-profile.png'}
                  alt="Sender"
                  className="w-12 h-12 rounded-full"
                />
                <div className="flex-1">
                  <div className="flex justify-between items-center">
                    <p className="text-sm text-gray-600">{notification.content}</p>
                    <p className="text-xs text-gray-400">
                      {formatDistanceToNow(notification.date?.toDate())} ago
                    </p>
                  </div>
                  <p className="text-xs text-gray-500 mt-2">Related to:</p>
                  <p className="text-xs text-gray-500 mt-1">
                    From: <span className="font-medium">{notification.senderId}</span>
                  </p>
                </div>
              </div>
            </CSSTransition>
          ))
        )}
      </TransitionGroup>
      {hasMore && (
        <button
          onClick={loadMoreNotifications}
          className="mt-4 bg-blue-500 text-white py-2 px-4 rounded"
        >
          Load More
        </button>
      )}
        </div>
    </div>
  );
};

export default NotificationsComponent;
