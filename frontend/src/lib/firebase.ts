import { initializeApp, getApps } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyAVfvEQ8K7B6WBshs6W4OgAEEld4_z5Me0",
  authDomain: "study-c872c.firebaseapp.com",
  projectId: "study-c872c",
  storageBucket: "study-c872c.firebasestorage.app",
  messagingSenderId: "485151399262",
  appId: "1:485151399262:web:4072b58cd84947b24d03cf",
  measurementId: "G-V42CMHY7BJ",
};

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];

export const db = getFirestore(app);
export const auth = getAuth(app);
export default app;
