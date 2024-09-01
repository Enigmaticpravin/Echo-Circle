import React, { useEffect, useState } from 'react';
import { getFirestore, doc, getDoc } from 'firebase/firestore'; // Import getDoc for fetching individual documents

const UpvotePopup = ({ users, onClose }) => {
  const [userDetails, setUserDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const db = getFirestore(); // Initialize Firestore

  useEffect(() => {
    const fetchUserDetails = async () => {
      try {
        const fetchedUsers = await Promise.all(
          users.map(async userId => {
            const userRef = doc(db, 'users', userId); // Create a reference to the user document
            const userSnap = await getDoc(userRef); // Fetch the document
            if (userSnap.exists()) {
              return { userId: userSnap.id, ...userSnap.data() }; // Return user data
            } else {
              console.log(`No user found with ID: ${userId}`);
              return null; // Handle the case where a document does not exist
            }
          })
        );

        // Filter out any null values (for missing documents)
        setUserDetails(fetchedUsers.filter(user => user !== null));
      } catch (error) {
        console.error('Error fetching user details:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserDetails();
  }, [users, db]);

  if (loading) {
    return <div className="absolute top-16 right-4 w-72 bg-gray-800 text-white rounded-lg shadow-lg z-20 border border-gray-700 p-4">Loading...</div>;
  }

  return (
    <div className="absolute top-16 right-4 w-72 bg-gray-800 text-white rounded-lg shadow-lg z-20 border border-gray-700">
      <div className="p-4">
        <h3 className="text-lg font-semibold mb-2">Upvoted By:</h3>
        {userDetails.length === 0 ? (
          <p className="text-gray-400">No one has upvoted yet.</p>
        ) : (
          <ul className="pl-4">
            {userDetails.map(user => (
              <li 
                key={user.userId} 
                className="py-2 px-4 rounded-lg mb-1 text-white cursor-pointer flex">
               <img 
                  src={user.profileImage} 
                  alt={user.username} 
                  className="w-12 h-12 rounded-full mr-4"
                />
                <div>
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-gray-400">{user.username}</p>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
      <button
        className="absolute top-2 right-2 text-gray-400 hover:text-white text-xl font-bold"
        onClick={onClose}
      >
        &times;
      </button>
    </div>
  );
};

export default UpvotePopup;
