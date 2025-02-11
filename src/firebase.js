import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, collection, getDocs, query, where, addDoc, serverTimestamp, doc, setDoc, getDoc, deleteDoc } from 'firebase/firestore';

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
      const data = docSnap.data();
      return {
        ...data,
        answeredQuestions: data.answeredQuestions || {},
        skippedQuestions: data.skippedQuestions || [],
        stats: data.stats || { correct: 0, total: 0 }
      };
    }
    return null;
  } catch (error) {
    console.error('Error loading progress:', error);
    return null;
  }
}

// Reset progress for a specific theme
export async function resetQuizProgress(userId, themeId) {
  try {
    const progressRef = doc(db, 'userProgress', userId, 'quizzes', themeId);
    await deleteDoc(progressRef);
    return true;
  } catch (error) {
    console.error('Error resetting progress:', error);
    return false;
  }
}

// Get all quiz progress for a user
export async function getAllQuizProgress(userId) {
  try {
    const progressRef = collection(db, 'userProgress', userId, 'quizzes');
    const querySnapshot = await getDocs(progressRef);
    const progress = {};
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      progress[doc.id] = {
        ...data,
        themeId: doc.id,
        answeredQuestions: data.answeredQuestions || {},
        skippedQuestions: data.skippedQuestions || [],
        stats: data.stats || { correct: 0, total: 0 }
      };
    });
    return progress;
  } catch (error) {
    console.error('Error loading all progress:', error);
    return {};
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

// Initialize Firestore collections
const initializeFirestore = async () => {
  try {
    // Create userProgress collection if it doesn't exist
    const userProgressRef = collection(db, 'userProgress');
    await setDoc(doc(userProgressRef, '_init'), { initialized: true }, { merge: true });
  } catch (error) {
    console.error('Error initializing Firestore:', error);
  }
};

// Call initialization
initializeFirestore();
