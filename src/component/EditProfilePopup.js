import React, { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { auth, db, doc, getDoc, setDoc, query, collection, where, getDocs, ref, uploadString, getDownloadURL } from '../firebase';
import { storage, uploadBytesResumable } from '../firebase';

const EditProfilePopup = ({ onClose }) => {
  const [user, setUser] = useState(null);
  const [profileImage, setProfileImage] = useState('');
  const [name, setName] = useState('');
  const [username, setUsername] = useState('');
  const [city, setCity] = useState('');
  const [credentials, setCredentials] = useState('');
  const [bio, setBio] = useState('');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);

  useEffect(() => {
    const fetchUserData = async () => {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          const userData = userSnap.data();
          setUser(userData);
          setProfileImage(userData.profileImage || '');
          setName(userData.name || '');
          setUsername(userData.username || '');
          setCity(userData.city || '');
          setCredentials(userData.credentials || '');
          setBio(userData.bio || '');
        }
      }
    };

    fetchUserData();
  }, []);

  const handleProfileImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setProfileImage(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleUpdateProfile = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        const userRef = doc(db, 'users', currentUser.uid);
        const userSnap = await getDoc(userRef);
  
        if (userSnap.exists()) {
          const userData = userSnap.data();
          const lastUpdated = userData.lastUsernameChange?.toDate();
          const currentTime = new Date();
  
          if (username !== userData.username) {
            if (lastUpdated) {
              const timeDifference = Math.abs(currentTime - lastUpdated);
              const daysDifference = Math.ceil(timeDifference / (1000 * 60 * 60 * 24));
  
              if (daysDifference < 30) {
                alert('You can only change your name/username once every 30 days.');
                return;
              }
            }
  
            const usernameQuery = query(collection(db, 'users'), where('username', '==', username));
            const querySnapshot = await getDocs(usernameQuery);
  
            if (!querySnapshot.empty) {
              alert('This username is already taken.');
              return;
            }
          }
  
          setIsUploading(true); // Start the upload process
          let updatedProfileImage = userData.profileImage;
          if (profileImage && profileImage !== userData.profileImage) {
            const storageRef = ref(storage, `profileImages/${currentUser.uid}`);
  
            // Upload the image and get the download URL
            const snapshot = await uploadString(storageRef, profileImage, 'data_url');
            updatedProfileImage = await getDownloadURL(snapshot.ref);
  
            setIsUploading(false);
  
            // After the image upload completes, update the Firestore document
            const updatedFields = {
              name: name || userData.name,
              username: username || userData.username,
              city: city || userData.city,
              credentials: credentials || userData.credentials,
              bio: bio || userData.bio,
              profileImage: updatedProfileImage,
            };
  
            if (username !== userData.username) {
              updatedFields.lastUsernameChange = currentTime;
            }
  
            await setDoc(userRef, {
              ...userData,
              ...updatedFields,
            });
  
            alert('Profile updated successfully.');
            onClose();
          } else {
            const updatedFields = {
              name: name || userData.name,
              username: username || userData.username,
              city: city || userData.city,
              credentials: credentials || userData.credentials,
              bio: bio || userData.bio,
            };
  
            if (username !== userData.username) {
              updatedFields.lastUsernameChange = currentTime;
            }
  
            await setDoc(userRef, {
              ...userData,
              ...updatedFields,
            });
  
            alert('Profile updated successfully.');
            onClose();
          }
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('There was an error updating your profile. Please try again later.');
    }
  };
  
  
  

  if (!user) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50">
      <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm"></div>
      <div className="bg-gray-900 w-full max-w-2xl rounded-xl shadow-xl z-50 relative flex flex-col h-4/5">
        <div className="flex justify-between items-center p-4 border-b border-gray-700">
          <h2 className="text-white font-semibold">Edit Profile</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X size={24} />
          </button>
        </div>

        <div className="p-4 flex-grow relative overflow-y-auto space-y-4">
          {isUploading && (
            <div className="w-full bg-gray-700 rounded-full h-2 mb-4">
              <div
                className="bg-blue-500 h-2 rounded-full"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
          )}

          <div className="flex items-center space-x-4">
            <div className="relative">
              <img
                src={profileImage || '/default-profile.png'}
                alt="Profile"
                className="w-20 h-20 rounded-full object-cover"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                className="absolute inset-0 opacity-0 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-gray-400">Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-gray-800 text-white p-2 rounded mt-1"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-400">Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-gray-800 text-white p-2 rounded mt-1"
            />
          </div>

          <div>
            <label className="block text-gray-400">City</label>
            <input
              type="text"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              className="w-full bg-gray-800 text-white p-2 rounded mt-1"
            />
          </div>

          <div>
            <label className="block text-gray-400">Credentials</label>
            <input
              type="text"
              value={credentials}
              onChange={(e) => setCredentials(e.target.value)}
              className="w-full bg-gray-800 text-white p-2 rounded mt-1"
            />
          </div>

          <div>
            <label className="block text-gray-400">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              className="w-full bg-gray-800 text-white p-2 rounded mt-1"
              rows="3"
            ></textarea>
          </div>
        </div>

        <div className="flex justify-end p-4 border-t border-gray-700">
          <button
            onClick={handleUpdateProfile}
            className="bg-blue-500 text-white px-4 py-2 rounded-full font-semibold hover:bg-blue-600"
          >
            Update Profile
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfilePopup;
