import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

// Replace these values with the config object from your Firebase Console
const firebaseConfig = {
  apiKey: "AIzaSyBcC-a3sLmc8R6jTYtIhbSfN9gVhYGQVNY",
  authDomain: "community-noticeboard-59041.firebaseapp.com",
  projectId: "community-noticeboard-59041",
  storageBucket: "community-noticeboard-59041.firebasestorage.app",
  messagingSenderId: "299792337031",
  appId: "1:299792337031:web:244c75b3b955fc77245022"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);