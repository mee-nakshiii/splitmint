import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore"; // Needed for the database
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyCSJbywWiJX9Pnf_ML0Nbb0ExGYITSukWQ",
  authDomain: "splitmint-d002f.firebaseapp.com",
  projectId: "splitmint-d002f",
  storageBucket: "splitmint-d002f.firebasestorage.app",
  messagingSenderId: "53039108459",
  appId: "1:53039108459:web:729f235ae8e179cc237c2e",
  measurementId: "G-2RZ49K6JTN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and EXPORT it so TripRoom.js can see it
export const db = getFirestore(app);

// Optional: Analytics
export const analytics = getAnalytics(app);