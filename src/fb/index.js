import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc, setDoc, serverTimestamp } from 'firebase/firestore';
import { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut } from 'firebase/auth';

/**
 * Replace these with your Firebase project credentials
 * Get them from: https://console.firebase.google.com/
 * Project Settings → General → Your apps → Web app → SDK setup
 */
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'YOUR_API_KEY',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'YOUR_AUTH_DOMAIN',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'YOUR_PROJECT_ID',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'YOUR_STORAGE_BUCKET',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || 'YOUR_MESSAGING_SENDER_ID',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || 'YOUR_APP_ID',
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
export const auth = getAuth(app);

// Initialize anonymous auth
export const initializeAuth = async () => {
  try {
    const user = auth.currentUser;
    if (!user) {
      await signInAnonymously(auth);
    }
    return auth.currentUser;
  } catch (error) {
    console.error('Auth initialization error:', error);
    throw error;
  }
};

/**
 * Helper function to get userId for data isolation
 * @returns {string} Current user's UID
 */
export const getUserId = () => {
  const user = auth.currentUser;
  if (!user) {
    throw new Error('User not authenticated');
  }
  return user.uid;
};

/**
 * Helper function to add user ID to data
 * @param {Object} data - Data object
 * @returns {Object} Data with userId and timestamps
 */
export const addUserMetadata = (data) => {
  return {
    ...data,
    userId: getUserId(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
};

/**
 * Helper function to create user-scoped query
 * @param {string} collectionName - Firestore collection name
 * @returns {Query} Query filtered by userId
 */
export const createUserQuery = (collectionName) => {
  return query(collection(db, collectionName), where('userId', '==', getUserId()));
};

/**
 * Register user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credential
 */
export const registerUser = async (email, password) => {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Login user with email and password
 * @param {string} email - User email
 * @param {string} password - User password
 * @returns {Promise<Object>} User credential
 */
export const loginUser = async (email, password) => {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Logout user
 * @returns {Promise<void>}
 */
export const logoutUser = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
};
