import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, addDoc, serverTimestamp, doc, setDoc, getDoc } from 'firebase/firestore';

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

// Function to check if a registration request already exists
export async function checkExistingRequest(email) {
  try {
    const requestsRef = collection(db, 'registrationRequests');
    const q = query(requestsRef, where('email', '==', email));
    const querySnapshot = await getDocs(q);
    return !querySnapshot.empty;
  } catch (error) {
    console.error('Error checking existing request:', error);
    return false;
  }
}

// Function to submit a registration request
export async function submitRegistrationRequest(email) {
  try {
    const requestsRef = collection(db, 'registrationRequests');
    await addDoc(requestsRef, {
      email,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    return true;
  } catch (error) {
    console.error('Error submitting request:', error);
    return false;
  }
}

// Save quiz progress
export async function saveQuizProgress(userId, themeId, progress) {
  try {
    const progressRef = doc(db, 'userProgress', userId, 'quizzes', themeId);
    await setDoc(progressRef, {
      ...progress,
      lastUpdated: serverTimestamp(),
    }, { merge: true });
    return true;
  } catch (error) {
    console.error('Error saving progress:', error);
    return false;
  }
}

// Load quiz progress
export async function loadQuizProgress(userId, themeId) {
  try {
    const progressRef = doc(db, 'userProgress', userId, 'quizzes', themeId);
    const docSnap = await getDoc(progressRef);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (error) {
    console.error('Error loading progress:', error);
    return null;
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
