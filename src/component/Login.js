import React, { useState } from 'react';
import { auth, db, doc, setDoc, getDoc } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

function Login() {
  const navigate = useNavigate();
  const [isLoading, setIsLoading] = useState(false);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const user = result.user;
      
      // Check if user exists in the database
      const userRef = doc(db, 'users', user.uid);
      const userSnap = await getDoc(userRef);
      
      if (!userSnap.exists()) {
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          createdAt: new Date(),
          profileImage: user.photoURL,
          userId: user.uid,
        });
      } else {
        await setDoc(userRef, {
          name: user.displayName,
          email: user.email,
          userId: userSnap.id,
          profileImage: user.photoURL,
          lastLogin: new Date(),
        }, { merge: true });
      }
      
      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error) {
      console.error("Error signing in with Google: ", error);
      setIsLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-r from-gray-900 via-black to-gray-900 relative overflow-hidden">
      {/* Floating Background Elements */}
      <div className="absolute inset-0 flex items-center justify-center">
        <div className="w-40 h-40 bg-blue-500 bg-opacity-20 rounded-full absolute animate-pulse"></div>
        <div className="w-32 h-32 bg-green-500 bg-opacity-20 rounded-full absolute animate-ping"></div>
        <div className="w-24 h-24 bg-pink-500 bg-opacity-20 rounded-full absolute animate-bounce"></div>
      </div>
  
      <div className="relative z-10 w-full max-w-md p-8 bg-white bg-opacity-10 backdrop-blur-lg shadow-2xl rounded-3xl border border-gray-700 border-opacity-50 flex items-center justify-center">
        {isLoading ? (
          // Show Circular Progress Bar while loading
          <div className=' block'>
 <div className="w-16 h-16 relative animate-spin mx-auto mb-5">
            <div className="absolute border-t-4 border-blue-500 border-solid rounded-full inset-0"></div>
            <div className="absolute border-t-4 border-transparent border-solid rounded-full inset-0 border-l-4 border-blue-500"></div>
          </div>
          <p className=' text-white'>Please wait while we log you in...</p>
          </div>
        ) : (
          <div className="w-full text-center">
            <h3 className="text-4xl font-bold text-white text-center drop-shadow-lg animate-fadeInUp">
              Welcome Back
            </h3>
            <p className="mt-4 text-sm text-gray-300 text-center drop-shadow-md animate-fadeInUp delay-200">
              Sign in to continue to your account
            </p>
            <div className="mt-8 animate-fadeInUp delay-400">
              <button
                onClick={handleGoogleSignIn}
                className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-purple-600 to-blue-600 text-white text-sm font-medium rounded-md hover:from-purple-700 hover:to-blue-700 transition duration-500 ease-in-out transform hover:scale-105 shadow-lg"
              >
                <svg
                  aria-hidden="true"
                  focusable="false"
                  data-prefix="fab"
                  data-icon="google"
                  className="svg-inline--fa fa-google fa-w-16 w-5 h-5 mr-2"
                  role="img"
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 488 512"
                >
                  <path
                    fill="currentColor"
                    d="M488 261.8C488 403.3 391.2 508 252.5 508 113.1 508 8 402.9 8 263.5S113.1 19 252.5 19c66.4 0 118.4 24.6 159.2 64.9l-64.4 64.3C316.2 107.3 288 94 252.5 94c-87.8 0-158.6 71-158.6 159.4S164.7 413 252.5 413c71.8 0 132-45.9 153.2-108.8h-153.2v-89.2h240.4c2.1 11.6 3.3 23.7 3.3 36.8z"
                  ></path>
                </svg>
                Sign in with Google
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Login;
