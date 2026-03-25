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
import { db, initializeAuth, getUserId } from '../fb/index.js';
import { generateEncryptionKey, encryptData, decryptData } from '../utils/encryption.js';
import { useAuth } from '../contexts/AuthContext.jsx';

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
  const { group } = useAuth();

  // Initialize auth and set up real-time listener
  useEffect(() => {
    let unsubscribePersonal;
    let unsubscribeGroup;

    const setupListener = async () => {
      try {
        await initializeAuth();
        const userId = getUserId();
        // Use group ID for encryption key so all group members can decrypt each other's data
        const encryptionKey = generateEncryptionKey(userId, group?.id);
        
        if (group) {
          // In group: ONLY show group data
          const groupQuery = query(collection(db, 'bankAccounts'), where('groupId', '==', group.id));
          unsubscribeGroup = onSnapshot(
            groupQuery,
            (snapshot) => {
              try {
                const groupData = snapshot.docs
                  .map(doc => {
                    try {
                      const docData = { id: doc.id, ...doc.data() };
                      return decryptData(docData, encryptionKey);
                    } catch (decryptErr) {
                      console.error(`Failed to decrypt bank account ${doc.id}:`, decryptErr);
                      return null;
                    }
                  })
                  .filter(doc => doc !== null);
                setAccounts(groupData);
                setLoading(false);
              } catch (err) {
                console.error('Error processing group bank accounts:', err);
                setError(err);
              }
            },
            (err) => {
              console.error('Error listening to group bank accounts:', err);
              setError(err);
              setLoading(false);
            }
          );
        } else {
          // Not in group: ONLY show personal data (where groupId is null/undefined)
          const personalQuery = query(
            collection(db, 'bankAccounts'),
            where('userId', '==', userId)
          );
          unsubscribePersonal = onSnapshot(
            personalQuery,
            (snapshot) => {
              try {
                const personalData = snapshot.docs
                  .filter(doc => !doc.data().groupId)
                  .map(doc => {
                    try {
                      const docData = { id: doc.id, ...doc.data() };
                      return decryptData(docData, encryptionKey);
                    } catch (decryptErr) {
                      console.error(`Failed to decrypt personal bank account ${doc.id}:`, decryptErr);
                      return null;
                    }
                  })
                  .filter(doc => doc !== null);
                setAccounts(personalData);
                setLoading(false);
              } catch (err) {
                console.error('Error processing personal bank accounts:', err);
                setError(err);
              }
            },
            (err) => {
              console.error('Error listening to personal bank accounts:', err);
              setError(err);
              setLoading(false);
            }
          );
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
  }, [group]);

  const addAccount = useCallback(async (data) => {
    try {
      const userId = getUserId();
      // Use group ID for encryption key so all group members can decrypt each other's data
      const encryptionKey = generateEncryptionKey(userId, group?.id);
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = await addDoc(collection(db, 'bankAccounts'), {
        ...encryptedData,
        userId,
        groupId: group?.id || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error adding account:', err);
      throw err;
    }
  }, [group]);

  const updateAccount = useCallback(async (id, data) => {
    try {
      const userId = getUserId();
      // Use group ID for encryption key so all group members can decrypt each other's data
      const encryptionKey = generateEncryptionKey(userId, group?.id);
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
  const { group } = useAuth();

  useEffect(() => {
    let unsubscribePersonal;
    let unsubscribeGroup;

    const setupListener = async () => {
      try {
        await initializeAuth();
        const userId = getUserId();
        // Use group ID for encryption key so all group members can decrypt each other's data
        const encryptionKey = generateEncryptionKey(userId, group?.id);
        
        if (group) {
          // In group: ONLY show group data
          const groupQuery = query(collection(db, 'trackables'), where('groupId', '==', group.id));
          unsubscribeGroup = onSnapshot(
            groupQuery,
            (snapshot) => {
              try {
                const groupData = snapshot.docs
                  .map(doc => {
                    try {
                      const docData = { id: doc.id, ...doc.data() };
                      return decryptData(docData, encryptionKey);
                    } catch (decryptErr) {
                      console.error(`Failed to decrypt trackable ${doc.id}:`, decryptErr);
                      return null;
                    }
                  })
                  .filter(doc => doc !== null);
                setTrackables(groupData);
                setLoading(false);
              } catch (err) {
                console.error('Error processing group trackables:', err);
                setError(err);
              }
            },
            (err) => {
              console.error('Error listening to group trackables:', err);
              setError(err);
              setLoading(false);
            }
          );
        } else {
          // Not in group: ONLY show personal data (where groupId is null/undefined)
          const personalQuery = query(
            collection(db, 'trackables'),
            where('userId', '==', userId)
          );
          unsubscribePersonal = onSnapshot(
            personalQuery,
            (snapshot) => {
              try {
                const personalData = snapshot.docs
                  .filter(doc => !doc.data().groupId)
                  .map(doc => {
                    try {
                      const docData = { id: doc.id, ...doc.data() };
                      return decryptData(docData, encryptionKey);
                    } catch (decryptErr) {
                      console.error(`Failed to decrypt personal trackable ${doc.id}:`, decryptErr);
                      return null;
                    }
                  })
                  .filter(doc => doc !== null);
                setTrackables(personalData);
                setLoading(false);
              } catch (err) {
                console.error('Error processing personal trackables:', err);
                setError(err);
              }
            },
            (err) => {
              console.error('Error listening to personal trackables:', err);
              setError(err);
              setLoading(false);
            }
          );
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
  }, [group]);

  const addTrackable = useCallback(async (data) => {
    try {
      const userId = getUserId();
      // Use group ID for encryption key so all group members can decrypt each other's data
      const encryptionKey = generateEncryptionKey(userId, group?.id);
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = await addDoc(collection(db, 'trackables'), {
        ...encryptedData,
        userId,
        groupId: group?.id || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error adding trackable:', err);
      throw err;
    }
  }, [group]);

  const updateTrackable = useCallback(async (id, data) => {
    try {
      const userId = getUserId();
      // Use group ID for encryption key so all group members can decrypt each other's data
      const encryptionKey = generateEncryptionKey(userId, group?.id);
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
  const { group } = useAuth();

  useEffect(() => {
    let unsubscribePersonal;
    let unsubscribeGroup;

    const setupListener = async () => {
      console.log('useActivities: Setting up listener...', { groupId: group?.id, hasGroup: !!group });
      try {
        await initializeAuth();
        const userId = getUserId();
        // Use group ID for encryption key so all group members can decrypt each other's data
        const encryptionKey = generateEncryptionKey(userId, group?.id);
        
        console.log('Activities listener setup:', {
          userId,
          groupId: group?.id,
          isInGroup: !!group,
          encryptionKeyPreview: encryptionKey.substring(0, 16) + '...'
        });
        
        if (group) {
          // In group: ONLY show group data
          const groupQuery = query(collection(db, 'activities'), where('groupId', '==', group.id));
          unsubscribeGroup = onSnapshot(
            groupQuery,
            (snapshot) => {
              try {
                console.log('Group activities snapshot received:', snapshot.docs.length, 'docs');
                const groupData = snapshot.docs
                  .map(doc => {
                    try {
                      const docData = { id: doc.id, ...doc.data() };
                      const decrypted = decryptData(docData, encryptionKey);
                      console.log('Decrypted activity:', { id: doc.id, userId: docData.userId, hasData: !!decrypted, hasDate: !!decrypted?.date, dateValue: decrypted?.date, keys: Object.keys(decrypted || {}).slice(0, 10) });
                      return decrypted;
                    } catch (decryptErr) {
                      console.error(`Failed to decrypt activity ${doc.id}:`, decryptErr.message);
                      return null;
                    }
                  })
                  .filter(doc => doc !== null); // Remove failed decryptions
                console.log('Displaying', groupData.length, 'activities after decryption');
                setActivities(groupData);
                setLoading(false);
              } catch (err) {
                console.error('Error processing group activities:', err);
                setError(err);
              }
            },
            (err) => {
              console.error('Error listening to group activities:', err);
              setError(err);
              setLoading(false);
            }
          );
        } else {
          // Not in group: ONLY show personal data (where groupId is null/undefined)
          const personalQuery = query(
            collection(db, 'activities'),
            where('userId', '==', userId)
          );
          unsubscribePersonal = onSnapshot(
            personalQuery,
            (snapshot) => {
              try {
                console.log('Personal activities snapshot received:', snapshot.docs.length, 'docs');
                const personalData = snapshot.docs
                  .filter(doc => !doc.data().groupId) // Exclude merged group data
                  .map(doc => {
                    try {
                      const docData = { id: doc.id, ...doc.data() };
                      return decryptData(docData, encryptionKey);
                    } catch (decryptErr) {
                      console.error(`Failed to decrypt personal activity ${doc.id}:`, decryptErr);
                      return null;
                    }
                  })
                  .filter(doc => doc !== null); // Remove failed decryptions
                console.log('Displaying', personalData.length, 'personal activities');
                setActivities(personalData);
                setLoading(false);
              } catch (err) {
                console.error('Error processing personal activities:', err);
                setError(err);
              }
            },
            (err) => {
              console.error('Error listening to personal activities:', err);
              setError(err);
              setLoading(false);
            }
          );
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
  }, [group]);

  const addActivity = useCallback(async (data) => {
    try {
      const userId = getUserId();
      // Use group ID for encryption key so all group members can decrypt each other's data
      const encryptionKey = generateEncryptionKey(userId, group?.id);
      
      console.log('Adding activity:', {
        userId,
        groupId: group?.id,
        isInGroup: !!group,
        dataKeys: Object.keys(data),
        willSetGroupId: group?.id || 'null (personal)',
        encryptionKeyPreview: encryptionKey.substring(0, 16) + '...'
      });
      
      const encryptedData = encryptData(data, encryptionKey);
      
      console.log('Encrypted activity data:', {
        hasEncryptedType: !!encryptedData._encrypted_type,
        hasEncryptedAmount: !!encryptedData._encrypted_amount,
        encryptedType: encryptedData._encrypted_type ? encryptedData._encrypted_type.substring(0, 20) + '...' : 'N/A',
        encryptedAmount: encryptedData._encrypted_amount ? encryptedData._encrypted_amount.substring(0, 20) + '...' : 'N/A'
      });
      
      const docRef = await addDoc(collection(db, 'activities'), {
        ...encryptedData,
        userId,
        groupId: group?.id || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      
      console.log('Activity added successfully:', { docId: docRef.id, groupId: group?.id, willShowUpIn: group?.id ? 'group activities' : 'personal activities' });
      return docRef.id;
    } catch (err) {
      console.error('Error adding activity:', err);
      throw err;
    }
  }, [group]);

  const updateActivity = useCallback(async (id, data) => {
    try {
      const userId = getUserId();
      // Use group ID for encryption key so all group members can decrypt each other's data
      const encryptionKey = generateEncryptionKey(userId, group?.id);
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
  const { group } = useAuth();

  useEffect(() => {
    let unsubscribePersonal;
    let unsubscribeGroup;

    const setupListener = async () => {
      try {
        await initializeAuth();
        const userId = getUserId();
        // Use group ID for encryption key so all group members can decrypt each other's data
        const encryptionKey = generateEncryptionKey(userId, group?.id);
        
        if (group) {
          // In group: ONLY show group data
          const groupQuery = query(collection(db, 'trackers'), where('groupId', '==', group.id));
          unsubscribeGroup = onSnapshot(
            groupQuery,
            (snapshot) => {
              try {
                const groupData = snapshot.docs
                  .map(doc => {
                    try {
                      const docData = { id: doc.id, ...doc.data() };
                      return decryptData(docData, encryptionKey);
                    } catch (decryptErr) {
                      console.error(`Failed to decrypt tracker ${doc.id}:`, decryptErr);
                      return null;
                    }
                  })
                  .filter(doc => doc !== null);
                setTrackers(groupData);
                setLoading(false);
              } catch (err) {
                console.error('Error processing group trackers:', err);
                setError(err);
              }
            },
            (err) => {
              console.error('Error listening to group trackers:', err);
              setError(err);
              setLoading(false);
            }
          );
        } else {
          // Not in group: ONLY show personal data (where groupId is null/undefined)
          const personalQuery = query(
            collection(db, 'trackers'),
            where('userId', '==', userId)
          );
          unsubscribePersonal = onSnapshot(
            personalQuery,
            (snapshot) => {
              try {
                const personalData = snapshot.docs
                  .filter(doc => !doc.data().groupId)
                  .map(doc => {
                    try {
                      const docData = { id: doc.id, ...doc.data() };
                      return decryptData(docData, encryptionKey);
                    } catch (decryptErr) {
                      console.error(`Failed to decrypt personal tracker ${doc.id}:`, decryptErr);
                      return null;
                    }
                  })
                  .filter(doc => doc !== null);
                setTrackers(personalData);
                setLoading(false);
              } catch (err) {
                console.error('Error processing personal trackers:', err);
                setError(err);
              }
            },
            (err) => {
              console.error('Error listening to personal trackers:', err);
              setError(err);
              setLoading(false);
            }
          );
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
  }, [group]);

  const addTracker = useCallback(async (data) => {
    try {
      const userId = getUserId();
      // Use group ID for encryption key so all group members can decrypt each other's data
      const encryptionKey = generateEncryptionKey(userId, group?.id);
      const encryptedData = encryptData(data, encryptionKey);
      
      const docRef = await addDoc(collection(db, 'trackers'), {
        ...encryptedData,
        userId,
        groupId: group?.id || null,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.error('Error adding tracker:', err);
      throw err;
    }
  }, [group]);

  const updateTracker = useCallback(async (id, data) => {
    try {
      const userId = getUserId();
      // Use group ID for encryption key so all group members can decrypt each other's data
      const encryptionKey = generateEncryptionKey(userId, group?.id);
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
