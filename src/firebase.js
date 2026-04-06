import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAvG3iGTbUd0w2eHNUxVVSKR6Mrq39H9kQ",
  authDomain: "finance-tracker-dina.firebaseapp.com",
  projectId: "finance-tracker-dina",
  storageBucket: "finance-tracker-dina.firebasestorage.app",
  messagingSenderId: "254311973046",
  appId: "1:254311973046:web:262491b9d704a1907a6617",
  measurementId: "G-4K050QWXPQ"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
