// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
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
const analytics = getAnalytics(app);
