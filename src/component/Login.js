// src/components/Login.js
import React, { useState } from 'react';
import { auth, db, doc, setDoc, getDoc } from '../firebase';
import { signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';
import Forest from '../images/forest.jpg'

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
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="flex flex-col md:flex-row items-center bg-white shadow-2xl rounded-lg overflow-hidden">
        {/* Left Side - Image */}
        <div className="hidden md:block md:w-1/2">
          <img
            src={Forest}
            alt="Login Illustration"
            className="h-full w-[500px] object-cover"
          />
        </div>

        {/* Right Side - Login Form */}
        <div className="w-full md:w-1/2 p-8">
          <h3 className="text-2xl font-semibold text-gray-800 text-center">
            Welcome Back
          </h3>
          <p className="mt-2 text-sm text-gray-600 text-center">
            Sign in to continue to your account
          </p>
          <div className="mt-6">
            <button
              onClick={handleGoogleSignIn}
              disabled={isLoading}
              className="w-full flex items-center justify-center px-4 py-3 bg-gray-800 text-white text-sm font-medium rounded-md hover:bg-gray-900 transition duration-300"
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
              {isLoading ? 'Signing in...' : 'Sign in with Google'}
            </button>
          </div>
          {isLoading && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2.5 dark:bg-gray-700">
              <div className="bg-blue-600 h-2.5 rounded-full w-full animate-pulse"></div>
            </div>
            <p className="text-center mt-2 text-sm text-gray-500">Please wait while we log you in...</p>
          </div>
        )}
          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Don’t have an account?{" "}
              <a
                href="#"
                className="text-blue-500 hover:underline transition duration-300"
              >
                Sign up
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;