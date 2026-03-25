import { useState, useEffect, useCallback } from 'react';
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore';
import { db, initializeAuth, getUserId, getUserGroup } from '../fb/index.js';
import { generateEncryptionKey, encryptData, decryptData } from '../utils/encryption.js';

/**
 * @typedef {Object} BankAccount
 * @property {string} id - Firestore document ID
 * @property {string} userId - User ID for data isolation
 * @property {string} cardName - Display name for the account
 * @property {string} accountNumber - Account number
 * @property {number} createdAt - Timestamp when created
 * @property {number} updatedAt - Timestamp when last updated
 */

/**
 * Hook for managing bank accounts in Firestore with end-to-end encryption
 * Supports both personal and group accounts
 * @returns {Object} Bank accounts state and methods
 */
export const useBankAccounts = () => {
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Initialize auth and set up real-time listener
  useEffect(() => {
    let unsubscribePersonal;
    let unsubscribeGroup;

    const setupListener = async () => {
      try {
        await initializeAuth();
        const userId = getUserId();
        const encryptionKey = generateEncryptionKey(userId);
        
        // Get user's group
        const userGroup = await getUserGroup();
        
        if (userGroup) {
          // In group: ONLY show group data
          const groupQuery = query(collection(db, 'bankAccounts'), where('groupId', '==', userGroup.id));
          unsubscribeGroup = onSnapshot(groupQuery, (snapshot) => {
            const groupData = snapshot.docs.map(doc => {
              const docData = { id: doc.id, ...doc.data() };
              return decryptData(docData, encryptionKey);
            });
            setAccounts(groupData);
            setLoading(false);
          });
        } else {
          // Not in group: ONLY show personal data
          const personalQuery = query(collection(db, 'bankAccounts'), where('userId', '==', userId));
          unsubscribePersonal = onSnapshot(personalQuery, (snapshot) => {
            const personalData = snapshot.docs.map(doc => {
              const docData = { id: doc.id, ...doc.data() };
              return decryptData(docData, encryptionKey);
            });
            setAccounts(personalData);
            setLoading(false);
          });
        }
      } catch (err) {
        console.error('Error setting up bank accounts listener:', err);
        setError(err);
        setLoading(false);
      }
    };

    setupListener();
    return () => {
      unsubscribePersonal?.();
      unsubscribeGroup?.();
    };
  }, []);

  const addAccount = useCallback(async (data) => {
    try {
      const userId = getUserId();
      const encryptionKey = generateEncryptionKey(userId);
      const userGroup = await getUserGroup();
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = await addDoc(collection(db, 'bankAccounts'), {
        ...encryptedData,
        userId,
        groupId: userGroup?.id || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error adding account:', err);
      throw err;
    }
  }, []);

  const updateAccount = useCallback(async (id, data) => {
    try {
      const userId = getUserId();
      const encryptionKey = generateEncryptionKey(userId);
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = doc(db, 'bankAccounts', id);
      await updateDoc(docRef, {
        ...encryptedData,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating account:', err);
      throw err;
    }
  }, []);

  const deleteAccount = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'bankAccounts', id));
    } catch (err) {
      console.error('Error deleting account:', err);
      throw err;
    }
  }, []);

  return { accounts, loading, error, addAccount, updateAccount, deleteAccount };
};

/**
 * @typedef {Object} Trackable
 * @property {string} id - Firestore document ID
 * @property {string} userId - User ID for data isolation
 * @property {string} name - Trackable name
 * @property {string} type - 'income' or 'expense'
 * @property {string} accountId - Linked bank account ID
 * @property {boolean} includeInTracker - Whether to include in monthly tracker
 * @property {number} trackerAmount - Amount to track
 * @property {number} createdAt - Timestamp
 * @property {number} updatedAt - Timestamp
 */

/**
 * Hook for managing trackables in Firestore with end-to-end encryption
 * Supports both personal and group trackables
 * @returns {Object} Trackables state and methods
 */
export const useTrackables = () => {
  const [trackables, setTrackables] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribePersonal;
    let unsubscribeGroup;

    const setupListener = async () => {
      try {
        await initializeAuth();
        const userId = getUserId();
        const encryptionKey = generateEncryptionKey(userId);
        
        // Get user's group
        const userGroup = await getUserGroup();
        
        if (userGroup) {
          // In group: ONLY show group data
          const groupQuery = query(collection(db, 'trackables'), where('groupId', '==', userGroup.id));
          unsubscribeGroup = onSnapshot(groupQuery, (snapshot) => {
            const groupData = snapshot.docs.map(doc => {
              const docData = { id: doc.id, ...doc.data() };
              return decryptData(docData, encryptionKey);
            });
            setTrackables(groupData);
            setLoading(false);
          });
        } else {
          // Not in group: ONLY show personal data
          const personalQuery = query(collection(db, 'trackables'), where('userId', '==', userId));
          unsubscribePersonal = onSnapshot(personalQuery, (snapshot) => {
            const personalData = snapshot.docs.map(doc => {
              const docData = { id: doc.id, ...doc.data() };
              return decryptData(docData, encryptionKey);
            });
            setTrackables(personalData);
            setLoading(false);
          });
        }
      } catch (err) {
        console.error('Error setting up trackables listener:', err);
        setError(err);
        setLoading(false);
      }
    };

    setupListener();
    return () => {
      unsubscribePersonal?.();
      unsubscribeGroup?.();
    };
  }, []);

  const addTrackable = useCallback(async (data) => {
    try {
      const userId = getUserId();
      const encryptionKey = generateEncryptionKey(userId);
      const userGroup = await getUserGroup();
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = await addDoc(collection(db, 'trackables'), {
        ...encryptedData,
        userId,
        groupId: userGroup?.id || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error adding trackable:', err);
      throw err;
    }
  }, []);

  const updateTrackable = useCallback(async (id, data) => {
    try {
      const userId = getUserId();
      const encryptionKey = generateEncryptionKey(userId);
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = doc(db, 'trackables', id);
      await updateDoc(docRef, {
        ...encryptedData,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating trackable:', err);
      throw err;
    }
  }, []);

  const deleteTrackable = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'trackables', id));
    } catch (err) {
      console.error('Error deleting trackable:', err);
      throw err;
    }
  }, []);

  return { trackables, loading, error, addTrackable, updateTrackable, deleteTrackable };
};

/**
 * @typedef {Object} Activity
 * @property {string} id - Firestore document ID
 * @property {string} userId - User ID for data isolation
 * @property {number} amount - Transaction amount
 * @property {string} type - 'income', 'expense', or 'transfer'
 * @property {string} [trackableId] - Linked trackable ID (optional)
 * @property {string} accountId - Linked account ID
 * @property {string} description - Activity description
 * @property {number} date - Transaction date timestamp
 * @property {number} createdAt - Timestamp
 * @property {number} updatedAt - Timestamp
 */

/**
 * Hook for managing activities in Firestore with end-to-end encryption
 * Supports both personal and group activities
 * @returns {Object} Activities state and methods
 */
export const useActivities = () => {
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribePersonal;
    let unsubscribeGroup;

    const setupListener = async () => {
      try {
        await initializeAuth();
        const userId = getUserId();
        const encryptionKey = generateEncryptionKey(userId);
        
        // Get user's group
        const userGroup = await getUserGroup();
        
        if (userGroup) {
          // In group: ONLY show group data
          const groupQuery = query(collection(db, 'activities'), where('groupId', '==', userGroup.id));
          unsubscribeGroup = onSnapshot(groupQuery, (snapshot) => {
            const groupData = snapshot.docs.map(doc => {
              const docData = { id: doc.id, ...doc.data() };
              return decryptData(docData, encryptionKey);
            });
            setActivities(groupData);
            setLoading(false);
          });
        } else {
          // Not in group: ONLY show personal data
          const personalQuery = query(collection(db, 'activities'), where('userId', '==', userId));
          unsubscribePersonal = onSnapshot(personalQuery, (snapshot) => {
            const personalData = snapshot.docs.map(doc => {
              const docData = { id: doc.id, ...doc.data() };
              return decryptData(docData, encryptionKey);
            });
            setActivities(personalData);
            setLoading(false);
          });
        }
      } catch (err) {
        console.error('Error setting up activities listener:', err);
        setError(err);
        setLoading(false);
      }
    };

    setupListener();
    return () => {
      unsubscribePersonal?.();
      unsubscribeGroup?.();
    };
  }, []);

  const addActivity = useCallback(async (data) => {
    try {
      const userId = getUserId();
      const encryptionKey = generateEncryptionKey(userId);
      const userGroup = await getUserGroup();
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = await addDoc(collection(db, 'activities'), {
        ...encryptedData,
        userId,
        groupId: userGroup?.id || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error adding activity:', err);
      throw err;
    }
  }, []);

  const updateActivity = useCallback(async (id, data) => {
    try {
      const userId = getUserId();
      const encryptionKey = generateEncryptionKey(userId);
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = doc(db, 'activities', id);
      await updateDoc(docRef, {
        ...encryptedData,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating activity:', err);
      throw err;
    }
  }, []);

  const deleteActivity = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'activities', id));
    } catch (err) {
      console.error('Error deleting activity:', err);
      throw err;
    }
  }, []);

  return { activities, loading, error, addActivity, updateActivity, deleteActivity };
};

/**
 * @typedef {Object} Tracker
 * @property {string} id - Firestore document ID
 * @property {string} userId - User ID for data isolation
 * @property {string} trackableId - Linked trackable ID
 * @property {number} month - Month (1-12)
 * @property {number} year - Year
 * @property {boolean} isDone - Completion status
 * @property {number} [completedAt] - Timestamp when completed
 * @property {number} createdAt - Timestamp
 * @property {number} updatedAt - Timestamp
 */

/**
 * Hook for managing trackers in Firestore with end-to-end encryption
 * Supports both personal and group trackers
 * @returns {Object} Trackers state and methods
 */
export const useTrackers = () => {
  const [trackers, setTrackers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let unsubscribePersonal;
    let unsubscribeGroup;

    const setupListener = async () => {
      try {
        await initializeAuth();
        const userId = getUserId();
        const encryptionKey = generateEncryptionKey(userId);
        
        // Get user's group
        const userGroup = await getUserGroup();
        
        if (userGroup) {
          // In group: ONLY show group data
          const groupQuery = query(collection(db, 'trackers'), where('groupId', '==', userGroup.id));
          unsubscribeGroup = onSnapshot(groupQuery, (snapshot) => {
            const groupData = snapshot.docs.map(doc => {
              const docData = { id: doc.id, ...doc.data() };
              return decryptData(docData, encryptionKey);
            });
            setTrackers(groupData);
            setLoading(false);
          });
        } else {
          // Not in group: ONLY show personal data
          const personalQuery = query(collection(db, 'trackers'), where('userId', '==', userId));
          unsubscribePersonal = onSnapshot(personalQuery, (snapshot) => {
            const personalData = snapshot.docs.map(doc => {
              const docData = { id: doc.id, ...doc.data() };
              return decryptData(docData, encryptionKey);
            });
            setTrackers(personalData);
            setLoading(false);
          });
        }
      } catch (err) {
        console.error('Error setting up trackers listener:', err);
        setError(err);
        setLoading(false);
      }
    };

    setupListener();
    return () => {
      unsubscribePersonal?.();
      unsubscribeGroup?.();
    };
  }, []);

  const addTracker = useCallback(async (data) => {
    try {
      const userId = getUserId();
      const encryptionKey = generateEncryptionKey(userId);
      const userGroup = await getUserGroup();
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = await addDoc(collection(db, 'trackers'), {
        ...encryptedData,
        userId,
        groupId: userGroup?.id || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error adding tracker:', err);
      throw err;
    }
  }, []);

  const updateTracker = useCallback(async (id, data) => {
    try {
      const userId = getUserId();
      const encryptionKey = generateEncryptionKey(userId);
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = doc(db, 'trackers', id);
      await updateDoc(docRef, {
        ...encryptedData,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      console.error('Error updating tracker:', err);
      throw err;
    }
  }, []);

  const deleteTracker = useCallback(async (id) => {
    try {
      await deleteDoc(doc(db, 'trackers', id));
    } catch (err) {
      console.error('Error deleting tracker:', err);
      throw err;
    }
  }, []);

  return { trackers, loading, error, addTracker, updateTracker, deleteTracker };
};
