// Import the functions you need from the SDKs you need
import { getApps, initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from 'firebase/auth';

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyBFmZc5MEi8WPAPHHiTss9a8x1Xu5zxGsI",
  authDomain: "gle63-1eb9f.firebaseapp.com",
  projectId: "gle63-1eb9f",
  storageBucket: "gle63-1eb9f.firebasestorage.app",
  messagingSenderId: "440990883085",
  appId: "1:440990883085:web:32e0b772d638c821582444",
  measurementId: "G-GY7SWCPG5B"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);


export { auth };