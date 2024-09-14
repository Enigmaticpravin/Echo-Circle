import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { 
    getFirestore, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs, 
    serverTimestamp,
    writeBatch,
    limit,
    startAfter,
    query, 
    where, 
    onSnapshot, 
    updateDoc, 
    deleteDoc,
    arrayUnion,
    arrayRemove,
    addDoc, 
    orderBy // Add orderBy here
} from "firebase/firestore";
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString, uploadBytesResumable } from "firebase/storage"; 

const firebaseConfig = {
    apiKey: "AIzaSyCmQNbaN2onoUqyejxwjpg6VeQ5H2NK3DM",
    authDomain: "wale-app-52d30.firebaseapp.com",
    databaseURL: "https://wale-app-52d30-default-rtdb.firebaseio.com",
    projectId: "wale-app-52d30",
    storageBucket: "wale-app-52d30.appspot.com",
    messagingSenderId: "770769688585",
    appId: "1:770769688585:web:b6d943cefcde6d76cbc0d8",
    measurementId: "G-YYHGBRDMK1"
  };

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { 
    auth, 
    db, 
    storage, 
    doc, 
    setDoc, 
    getDoc, 
    collection, 
    getDocs, 
    query, 
    where, 
    onSnapshot, 
    updateDoc, 
    writeBatch,
    arrayUnion, 
    startAfter,
    arrayRemove,
    addDoc, 
    ref, 
    uploadBytes, 
    uploadString,
    deleteDoc,
    uploadBytesResumable,
    getDownloadURL,
    limit,
    serverTimestamp,
    orderBy // Export orderBy here
};
