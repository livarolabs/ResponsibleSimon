import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
    apiKey: "AIzaSyAY5oGITlFqTmwkB0UOPGZbhkoWVSyjd-E",
    authDomain: "responsiblesimon.firebaseapp.com",
    projectId: "responsiblesimon",
    storageBucket: "responsiblesimon.firebasestorage.app",
    messagingSenderId: "911708509732",
    appId: "1:911708509732:web:6af6f49c72fe4e4df06ab1",
    measurementId: "G-8BHSF6E5R8"
};

// Initialize Firebase
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);
const googleProvider = new GoogleAuthProvider();

export { app, auth, db, googleProvider };
