import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  "projectId": "studio-3643416859-43dc8",
  "appId": "1:381023872536:web:b1523f34d7c48a6f43456d",
  "storageBucket": "studio-3643416859-43dc8.firebasestorage.app",
  "apiKey": "AIzaSyCWL2xfX1oozwxyn62saRckaKGax7CngF0",
  "authDomain": "studio-3643416859-43dc8.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "381023872536"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const db = getFirestore(app);

export { app, db };
