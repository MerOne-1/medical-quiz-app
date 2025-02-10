import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where } from 'firebase/firestore';

// Function to check if email is allowed
export async function isEmailAllowed(email) {
  try {
    const allowedEmailsRef = collection(db, 'allowedEmails');
    const q = query(allowedEmailsRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking email:', error);
    return false;
  }
}

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBU1bnxPIEdgjVNcT20LdE_DkvNoOLQAdU",
  authDomain: "medical-quiz-app-886ac.firebaseapp.com",
  projectId: "medical-quiz-app-886ac",
  storageBucket: "medical-quiz-app-886ac.firebasestorage.app",
  messagingSenderId: "138449694256",
  appId: "1:138449694256:web:d4e8c9a2091a37342107f5",
  measurementId: "G-G08Y212N1J"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
