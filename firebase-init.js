// Firebase Client SDK Initialization
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  projectId: "smart-nutrition-planner-49a",
  appId: "1:609868965381:web:38fd37bb1682949a1bde6c",
  storageBucket: "smart-nutrition-planner-49a.firebasestorage.app",
  apiKey: "AIzaSyBdx4-88nPSpHm-oLY2lk1qnctY_jap-F0",
  authDomain: "smart-nutrition-planner-49a.firebaseapp.com",
  messagingSenderId: "609868965381"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Cloud Firestore and export
export const db = getFirestore(app);
