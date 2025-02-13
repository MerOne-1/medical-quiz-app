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
    console.log('Submitting registration request for:', email);
    const requestsRef = collection(db, 'registrationRequests');
    await addDoc(requestsRef, {
      email,
      status: 'pending',
      createdAt: serverTimestamp(),
    });
    console.log('Registration request submitted successfully');
    return true;
  } catch (error) {
    console.error('Error submitting request:', error);
    console.error(error); // Log the full error
    return false;
  }
}

// Save quiz progress
export async function saveQuizProgress(userId, themeId, progress) {
  try {
    console.log('Saving progress for user:', userId, 'theme:', themeId, 'data:', progress);
    
    // Create user document if it doesn't exist
    const userRef = doc(db, 'userProgress', userId);
    await setDoc(userRef, {
      lastActive: serverTimestamp(),
      userId: userId
    }, { merge: true });
    
    // Save progress in subcollection
    const progressRef = doc(db, 'userProgress', userId, 'quizzes', themeId);
    
    // Get existing data first
    const existingDoc = await getDoc(progressRef);
    const existingData = existingDoc.exists() ? existingDoc.data() : {};
    
    // Calculate total questions answered and correct answers
    const answeredQuestions = progress.answeredQuestions || {};
    const totalAnswered = Object.keys(answeredQuestions).length;
    const correctAnswers = Object.values(answeredQuestions)
      .filter(answer => answer.isCorrect).length;
    
    // Merge with new data, ensuring we don't lose existing data
    const updatedProgress = {
      ...existingData,
      ...progress,
      stats: {
        total: totalAnswered,
        correct: correctAnswers
      },
      lastUpdated: serverTimestamp(),
      userId: userId,
      themeId: themeId,
      completed: totalAnswered === progress.totalQuestions
    };
    
    console.log('Saving updated progress:', updatedProgress);
    await setDoc(progressRef, updatedProgress);
    
    // Update user's overall progress
    const userProgressRef = doc(db, 'userProgress', userId, 'overview', 'stats');
    await setDoc(userProgressRef, {
      lastUpdated: serverTimestamp(),
      themes: {
        [themeId]: {
          totalQuestions: progress.totalQuestions,
          answeredQuestions: totalAnswered,
          correctAnswers: correctAnswers,
          completed: totalAnswered === progress.totalQuestions
        }
      }
    }, { merge: true });
    
    console.log('Progress saved successfully');
    return true;
  } catch (error) {
    console.error('Error saving progress:', error);
    return false;
  }
}

// Load quiz progress
export async function loadQuizProgress(userId, themeId) {
  try {
    console.log('Loading progress for user:', userId, 'theme:', themeId);
    const progressRef = doc(db, 'userProgress', userId, 'quizzes', themeId);
    const docSnap = await getDoc(progressRef);
    
    if (docSnap.exists()) {
      const data = docSnap.data();
      console.log('Found progress data:', data);
      return {
        ...data,
        answeredQuestions: data.answeredQuestions || {},
        skippedQuestions: data.skippedQuestions || [],
        stats: data.stats || { correct: 0, total: 0 },
        totalQuestions: data.totalQuestions || 0,
        lastQuestionIndex: data.lastQuestionIndex || 0
      };
    }
    console.log('No existing progress found');
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
    console.log('Loading all progress for user:', userId);
    
    // First check if user exists
    const userRef = doc(db, 'userProgress', userId);
    const userDoc = await getDoc(userRef);
    if (!userDoc.exists()) {
      console.log('No progress found for user');
      return {};
    }
    
    // Get overall progress stats
    const statsRef = doc(db, 'userProgress', userId, 'overview', 'stats');
    const statsDoc = await getDoc(statsRef);
    const overallStats = statsDoc.exists() ? statsDoc.data() : { themes: {} };
    
    // Get detailed progress for each theme
    const progressRef = collection(db, 'userProgress', userId, 'quizzes');
    const querySnapshot = await getDocs(progressRef);
    const progress = {};
    
    querySnapshot.forEach((doc) => {
      const data = doc.data();
      const themeId = doc.id;
      console.log('Found progress for theme:', themeId, data);
      
      // Merge detailed progress with overview stats
      progress[themeId] = {
        ...data,
        themeId: themeId,
        answeredQuestions: data.answeredQuestions || {},
        skippedQuestions: data.skippedQuestions || [],
        stats: data.stats || { correct: 0, total: 0 },
        totalQuestions: data.totalQuestions || 0,
        lastQuestionIndex: data.lastQuestionIndex || 0,
        overview: overallStats.themes[themeId] || {
          totalQuestions: 0,
          answeredQuestions: 0,
          correctAnswers: 0,
          completed: false
        }
      };
    });
    
    console.log('Final progress data:', progress);
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
    // Create collections if they don't exist
    const collections = ['userProgress', 'allowedEmails', 'registrationRequests'];
    
    for (const collectionName of collections) {
      const collRef = collection(db, collectionName);
      await setDoc(doc(collRef, '_init'), {
        initialized: true,
        createdAt: serverTimestamp()
      }, { merge: true });
    }

    // Create default security rules
    const securityRules = {
      'userProgress': {
        read: true,
        write: true
      }
    };

    // Save security rules
    const rulesRef = doc(db, '_config', 'rules');
    await setDoc(rulesRef, { rules: securityRules }, { merge: true });

    console.log('Firestore initialized successfully');
  } catch (error) {
    console.error('Error initializing Firestore:', error);
  }
};

// Function to set up admin access
export async function setupAdminAccess(adminEmail) {
  try {
    // Add the admin email to the authorized list
    await setDoc(doc(db, 'adminAccess', 'authorizedEmails'), {
      emails: [adminEmail]
    });
    console.log('Admin access configured successfully');
    return true;
  } catch (error) {
    console.error('Error setting up admin access:', error);
    return false;
  }
}

// Call initialization
initializeFirestore();
