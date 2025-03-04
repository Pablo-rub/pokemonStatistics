// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getAuth } from "firebase/auth";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyA4oiiHcfXuGxdaerLvmbjHD85Kb62dpxU",
  authDomain: "pokemon-statistics.firebaseapp.com",
  projectId: "pokemon-statistics",
  storageBucket: "pokemon-statistics.firebasestorage.app",
  messagingSenderId: "732921265503",
  appId: "1:732921265503:web:252cb9e2925a349a610aea",
  measurementId: "G-7SPJM9WWBZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const auth = getAuth(app);

// Export the necessary Firebase instances
export { app, analytics, auth };