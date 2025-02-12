import { initializeApp } from 'firebase/app';
import { getFirestore, doc, setDoc } from 'firebase/firestore';

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
const db = getFirestore(app);

// Replace with your admin email
const ADMIN_EMAIL = 'your.email@example.com';

async function setupInitialAdmin() {
  try {
    await setDoc(doc(db, 'adminAccess', 'authorizedEmails'), {
      emails: [ADMIN_EMAIL]
    });
    console.log('Successfully set up admin access for:', ADMIN_EMAIL);
  } catch (error) {
    console.error('Error setting up admin access:', error);
  }
}

setupInitialAdmin();
