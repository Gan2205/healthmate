import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
    apiKey: "AIzaSyACODkW91PsTouAZcp4yAGbPywCRyTdOww",
    authDomain: "health-4fa4c.firebaseapp.com",
    projectId: "health-4fa4c",
    storageBucket: "health-4fa4c.firebasestorage.app",
    messagingSenderId: "629204711105",
    appId: "1:629204711105:web:8de75d4d3f111e98984640",
    measurementId: "G-G9WMW8369X"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
