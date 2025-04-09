// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyCjYmh_K_BRunqZhsYRQ-F0hh_Dh5nhScM",
  authDomain: "healthcareproject-8d940.firebaseapp.com",
  projectId: "healthcareproject-8d940",
  storageBucket: "healthcareproject-8d940.firebasestorage.app",
  messagingSenderId: "706528091522",
  appId: "1:706528091522:web:d8fa8323b2bb7f6737439b",
  measurementId: "G-V5E4PGPZGV"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
const db = getFirestore(app);
const auth = getAuth(app);

export { db, auth, analytics };
