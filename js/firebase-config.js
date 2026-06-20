import { initializeApp } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-app.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.15.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCFpKq6NnqNVSDtZZnY6lP3HzHb7ITuL-A",
  authDomain: "tableme-aaxb.firebaseapp.com",
  projectId: "tableme-aaxb",
  storageBucket: "tableme-aaxb.firebasestorage.app",
  messagingSenderId: "721823683294",
  appId: "1:721823683294:web:54e07220592e3956abe84f",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
