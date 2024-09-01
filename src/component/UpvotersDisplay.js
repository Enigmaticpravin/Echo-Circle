import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore';

const UpvotersDisplay = ({ upvoters }) => {
  const [userDetails, setUserDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore();
  const latestUpvoters = userDetails.slice(0, 3);
  const remainingUpvoters = userDetails.length > 3 ? userDetails.length - 3 : 0;

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const fetchedUsers = await Promise.all(
          upvoters.map(async userId => {
            const userRef = doc(db, 'users', userId);
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
              return { userId: userSnap.id, ...userSnap.data() };
            } else {
              console.log(`No user found with ID: ${userId}`);
              return null;
            }
          })
        );

        setUserDetails(fetchedUsers.filter(user => user !== null));
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setLoading(false);
      }
    };

    if (upvoters.length > 0) {
      fetchUserDetails();
    } else {
      setLoading(false);
    }
  }, [upvoters, db]);

  if (loading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="relative flex items-center">
      <div className="flex -space-x-3">
        {latestUpvoters.map((upvoter, index) => (
          <img
            key={upvoter.userId}
            src={upvoter.profileImage || "https://via.placeholder.com/40"}
            alt={`User ${index + 1}`}
            className="w-6 h-6 rounded-full border-2 border-white"
          />
        ))}
      </div>
      
      {remainingUpvoters > 0 && (
        <div className="w-[24px] h-[24px] rounded-full border-2 bg-pink-500 text-white flex items-center justify-center text-[7px] absolute -right-3 border-white">
          +{remainingUpvoters}
        </div>
      )}
    </div>
  );
};

export default UpvotersDisplay;