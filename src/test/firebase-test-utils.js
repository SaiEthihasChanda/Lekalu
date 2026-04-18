/**
 * Firebase Test Utilities
 * Provides real Firebase setup for integration tests
 */

import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
} from 'firebase/auth';
import {
  getFirestore,
  collection,
  addDoc,
  getDocs,
  deleteDoc,
  query,
  where,
  serverTimestamp,
} from 'firebase/firestore';
import { generateEncryptionKey, encryptData, decryptData } from '../utils/encryption.js';

// Firebase config from environment or use test config
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let testApp;
let testAuth;
let testDb;

/**
 * Initialize Firebase for testing
 */
export const initializeTestFirebase = () => {
  if (!testApp) {
    testApp = initializeApp(firebaseConfig, 'test-app');
    testAuth = getAuth(testApp);
    testDb = getFirestore(testApp);
  }
  return { testAuth, testDb };
};

/**
 * Create test user and return UID
 */
export const createTestUser = async (email, password) => {
  const { testAuth } = initializeTestFirebase();
  try {
    const userCredential = await createUserWithEmailAndPassword(testAuth, email, password);
    return userCredential.user.uid;
  } catch (error) {
    if (error.code === 'auth/email-already-in-use') {
      // User already exists, sign in instead
      const signInResult = await signInWithEmailAndPassword(testAuth, email, password);
      return signInResult.user.uid;
    }
    throw error;
  }
};

/**
 * Login test user
 */
export const loginTestUser = async (email, password) => {
  const { testAuth } = initializeTestFirebase();
  const userCredential = await signInWithEmailAndPassword(testAuth, email, password);
  return userCredential.user.uid;
};

/**
 * Logout test user
 */
export const logoutTestUser = async () => {
  const { testAuth } = initializeTestFirebase();
  await signOut(testAuth);
};

/**
 * Get current test user UID
 */
export const getTestUserId = () => {
  const { testAuth } = initializeTestFirebase();
  return testAuth.currentUser?.uid;
};

/**
 * Create test activity with encryption
 */
export const createTestActivity = async (userId, activityData) => {
  const { testDb } = initializeTestFirebase();
  
  // Generate encryption key (same as app uses)
  const encryptionKey = generateEncryptionKey(userId, null);
  
  // Keep the date field if provided in tests (unlike app which removes it)
  const encryptedData = encryptData(activityData, encryptionKey);
  
  return await addDoc(collection(testDb, 'activities'), {
    ...encryptedData,
    userId,
    groupId: null,
    groupMemberId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Create test trackable with encryption
 */
export const createTestTrackable = async (userId, trackableData) => {
  const { testDb } = initializeTestFirebase();
  
  // Generate encryption key (same as app uses)
  const encryptionKey = generateEncryptionKey(userId, null);
  
  // Encrypt the data
  const encryptedData = encryptData(trackableData, encryptionKey);
  
  return await addDoc(collection(testDb, 'trackables'), {
    ...encryptedData,
    userId,
    groupId: null,
    groupMemberId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Create test tracker (trackable occurrence/instance) with encryption
 */
export const createTestTracker = async (userId, trackerData) => {
  const { testDb } = initializeTestFirebase();
  
  // Generate encryption key (same as app uses)
  const encryptionKey = generateEncryptionKey(userId, null);
  
  // Encrypt the data
  const encryptedData = encryptData(trackerData, encryptionKey);
  
  return await addDoc(collection(testDb, 'trackers'), {
    ...encryptedData,
    userId,
    groupId: null,
    groupMemberId: null,
    completedAt: trackerData.status === 'completed' ? serverTimestamp() : null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Create test source (bank account) with encryption
 */
export const createTestSource = async (userId, sourceData) => {
  const { testDb } = initializeTestFirebase();
  
  // Generate encryption key (same as app uses)
  const encryptionKey = generateEncryptionKey(userId, null);
  
  // Map common field names to app field names
  const appData = {
    cardName: sourceData.name || sourceData.cardName || 'Test Account',
    accountNumber: sourceData.accountNumber || '',
    sourceType: sourceData.type || sourceData.sourceType || 'none',
    openingBalance: sourceData.amount || sourceData.openingBalance || 0,
    ...sourceData, // Include any other fields
  };
  
  // Encrypt the data
  const encryptedData = encryptData(appData, encryptionKey);
  
  return await addDoc(collection(testDb, 'bankAccounts'), {
    ...encryptedData,
    userId,
    groupId: null,
    groupMemberId: null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });
};

/**
 * Get user activities from Firestore (with decryption)
 */
export const getUserActivities = async (userId) => {
  const { testDb } = initializeTestFirebase();
  const q = query(collection(testDb, 'activities'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  // Generate encryption key (same as app uses)
  const encryptionKey = generateEncryptionKey(userId, null);
  
  return querySnapshot.docs.map(doc => {
    try {
      const encryptedData = { id: doc.id, ...doc.data() };
      const decryptedData = decryptData(encryptedData, encryptionKey);
      return decryptedData;
    } catch (error) {
      console.error(`Failed to decrypt activity ${doc.id}:`, error);
      return { id: doc.id, ...doc.data() }; // Return raw if decryption fails
    }
  });
};

/**
 * Get user trackables from Firestore (with decryption)
 */
export const getUserTrackables = async (userId) => {
  const { testDb } = initializeTestFirebase();
  const q = query(collection(testDb, 'trackables'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  // Generate encryption key (same as app uses)
  const encryptionKey = generateEncryptionKey(userId, null);
  
  return querySnapshot.docs.map(doc => {
    try {
      const encryptedData = { id: doc.id, ...doc.data() };
      const decryptedData = decryptData(encryptedData, encryptionKey);
      return decryptedData;
    } catch (error) {
      console.error(`Failed to decrypt trackable ${doc.id}:`, error);
      return { id: doc.id, ...doc.data() }; // Return raw if decryption fails
    }
  });
};

/**
 * Get user trackers from Firestore (with decryption)
 */
export const getUserTrackers = async (userId) => {
  const { testDb } = initializeTestFirebase();
  const q = query(collection(testDb, 'trackers'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  // Generate encryption key (same as app uses)
  const encryptionKey = generateEncryptionKey(userId, null);
  
  return querySnapshot.docs.map(doc => {
    try {
      const encryptedData = { id: doc.id, ...doc.data() };
      const decryptedData = decryptData(encryptedData, encryptionKey);
      return decryptedData;
    } catch (error) {
      console.error(`Failed to decrypt tracker ${doc.id}:`, error);
      return { id: doc.id, ...doc.data() }; // Return raw if decryption fails
    }
  });
};

/**
 * Get user sources from Firestore (with decryption)
 */
export const getUserSources = async (userId) => {
  const { testDb } = initializeTestFirebase();
  const q = query(collection(testDb, 'bankAccounts'), where('userId', '==', userId));
  const querySnapshot = await getDocs(q);
  
  // Generate encryption key (same as app uses)
  const encryptionKey = generateEncryptionKey(userId, null);
  
  return querySnapshot.docs.map(doc => {
    try {
      const encryptedData = { id: doc.id, ...doc.data() };
      const decryptedData = decryptData(encryptedData, encryptionKey);
      // Ensure sourceType is set
      if (!decryptedData.sourceType) {
        decryptedData.sourceType = 'none';
      }
      return decryptedData;
    } catch (error) {
      console.error(`Failed to decrypt source ${doc.id}:`, error);
      return { id: doc.id, ...doc.data() }; // Return raw if decryption fails
    }
  });
};

/**
 * Delete all test data for a user
 */
export const deleteTestUserData = async (userId) => {
  const { testDb } = initializeTestFirebase();

  // Delete activities
  const activitiesSnapshot = await getDocs(
    query(collection(testDb, 'activities'), where('userId', '==', userId))
  );
  for (const doc of activitiesSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete trackers
  const trackersSnapshot = await getDocs(
    query(collection(testDb, 'trackers'), where('userId', '==', userId))
  );
  for (const doc of trackersSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete trackables
  const trackablesSnapshot = await getDocs(
    query(collection(testDb, 'trackables'), where('userId', '==', userId))
  );
  for (const doc of trackablesSnapshot.docs) {
    await deleteDoc(doc.ref);
  }

  // Delete bank accounts (sources)
  const sourcesSnapshot = await getDocs(
    query(collection(testDb, 'bankAccounts'), where('userId', '==', userId))
  );
  for (const doc of sourcesSnapshot.docs) {
    await deleteDoc(doc.ref);
  }
};
