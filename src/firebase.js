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
    apiKey: "AIzaSyBRYu-6GLpgq-sTybxZzdh27U7dyovPj1g",
    authDomain: "meetandgreet-a5ee4.firebaseapp.com",
    projectId: "meetandgreet-a5ee4",
    storageBucket: "meetandgreet-a5ee4.appspot.com",
    messagingSenderId: "948447767770",
    appId: "1:948447767770:web:c647a38b287f92ab9509e3",
    measurementId: "G-9G8FFXZZ1L"
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
