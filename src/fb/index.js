import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, getDoc, writeBatch } from 'firebase/firestore';
import { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';
import CryptoJS from 'crypto-js';
import { generateEncryptionKey, encryptData, decryptData } from '../utils/encryption.js';

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
    const userId = userCredential.user.uid;
    
    // Store user email in Firestore
    await setDoc(doc(db, 'users', userId), {
      email: email,
      createdAt: serverTimestamp(),
    }, { merge: true });
    
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
    const userId = userCredential.user.uid;
    
    // Ensure user email is stored in Firestore
    await setDoc(doc(db, 'users', userId), {
      email: email,
    }, { merge: true });
    
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

/**
 * Sign in with Google
 * @returns {Promise<Object>} User credential
 */
export const signInWithGoogle = async () => {
  try {
    const provider = new GoogleAuthProvider();
    const userCredential = await signInWithPopup(auth, provider);
    const userId = userCredential.user.uid;
    
    // Store user email in Firestore for Google users
    await setDoc(doc(db, 'users', userId), {
      email: userCredential.user.email,
      photoURL: userCredential.user.photoURL,
      displayName: userCredential.user.displayName,
    }, { merge: true });
    
    return userCredential.user;
  } catch (error) {
    throw error;
  }
};

/**
 * Delete all user data from Firestore
 * @returns {Promise<void>}
 */
export const deleteAllUserData = async () => {
  try {
    const userId = getUserId();
    const collectionNames = ['bankAccounts', 'trackables', 'activities', 'trackers'];

    // Check if user is in a group and is the owner
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const groupId = userDoc.exists() ? userDoc.data().groupId : null;
    
    let isGroupOwner = false;
    if (groupId) {
      // Check if user is the group owner
      const groupDocRef = doc(db, 'groups', groupId);
      const groupDoc = await getDoc(groupDocRef);
      if (groupDoc.exists() && groupDoc.data().owner === userId) {
        isGroupOwner = true;
      }
    }

    // Delete all documents from each collection
    for (const collectionName of collectionNames) {
      let q;
      
      // If user is group owner, delete ALL group data; otherwise delete only their data
      if (isGroupOwner && groupId) {
        q = query(collection(db, collectionName), where('groupId', '==', groupId));
      } else {
        q = query(collection(db, collectionName), where('userId', '==', userId));
      }
      
      const snapshot = await getDocs(q);
      
      // Delete each document
      for (const docSnapshot of snapshot.docs) {
        await deleteDoc(doc(db, collectionName, docSnapshot.id));
      }
    }
  } catch (error) {
    throw error;
  }
};

/**
 * Generate a unique 6-digit group code
 * @returns {string} 6-digit group code
 */
const generateGroupCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

/**
 * Create a new expense group
 * @param {string} groupName - Name of the group
 * @returns {Promise<Object>} Group object with id, code, owner
 */
export const createGroup = async (groupName) => {
  try {
    const userId = getUserId();
    let groupCode;
    let isUnique = false;
    
    // Generate unique code
    while (!isUnique) {
      groupCode = generateGroupCode();
      const q = query(collection(db, 'groups'), where('code', '==', groupCode));
      const snapshot = await getDocs(q);
      if (snapshot.empty) {
        isUnique = true;
      }
    }

    const groupRef = await addDoc(collection(db, 'groups'), {
      name: groupName,
      code: groupCode,
      owner: userId,
      members: [userId],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    // Update user document to reflect group membership
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, { groupId: groupRef.id }, { merge: true });

    return {
      id: groupRef.id,
      name: groupName,
      code: groupCode,
      owner: userId,
      members: [userId],
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Join an existing group using group code
 * @param {string} groupCode - 6-digit group code
 * @returns {Promise<Object>} Group object
 */
export const joinGroup = async (groupCode) => {
  try {
    const userId = getUserId();

    // Check if user is already in a group
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    if (userDoc.exists() && userDoc.data().groupId) {
      throw new Error('You are already a member of a group. Leave your current group first.');
    }

    // Find group by code
    const q = query(collection(db, 'groups'), where('code', '==', groupCode));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      throw new Error('Group code not found.');
    }

    const groupDoc = snapshot.docs[0];
    const groupData = groupDoc.data();

    // Add user to group members
    await updateDoc(groupDoc.ref, {
      members: [...groupData.members, userId],
      updatedAt: serverTimestamp(),
    });

    // Update user document
    await setDoc(userDocRef, { groupId: groupDoc.id }, { merge: true });

    return {
      id: groupDoc.id,
      ...groupData,
    };
  } catch (error) {
    throw error;
  }
};

/**
 * Get group for current user
 * @returns {Promise<Object|null>} Group object or null if not in group
 */
export const getUserGroup = async () => {
  try {
    const userId = getUserId();
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists() || !userDoc.data().groupId) {
      return null;
    }

    const groupDocRef = doc(db, 'groups', userDoc.data().groupId);
    const groupDoc = await getDoc(groupDocRef);

    if (!groupDoc.exists()) {
      return null;
    }

    return {
      id: groupDoc.id,
      ...groupDoc.data(),
    };
  } catch (error) {
    console.error('Error getting user group:', error);
    return null;
  }
};

/**
 * Leave a group
 * @returns {Promise<void>}
 */
export const leaveGroup = async () => {
  try {
    const userId = getUserId();
    const group = await getUserGroup();

    if (!group) {
      throw new Error('User is not in a group.');
    }

    // Owner cannot leave, can only delete
    if (group.owner === userId) {
      throw new Error('Owner cannot leave. Delete the group instead.');
    }

    // First migrate user's data from group to personal before leaving
    await _removeMemberDataFromGroupByUserId(userId, group.id);

    // Remove user from group members
    const updatedMembers = group.members.filter(id => id !== userId);
    await updateDoc(doc(db, 'groups', group.id), {
      members: updatedMembers,
      updatedAt: serverTimestamp(),
    });

    // Clear user's group reference
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, { groupId: null }, { merge: true });
  } catch (error) {
    throw error;
  }
};

/**
 * Delete a group (owner only)
 * @returns {Promise<void>}
 */
export const deleteGroup = async () => {
  try {
    const userId = getUserId();
    const group = await getUserGroup();

    if (!group) {
      throw new Error('User is not in a group.');
    }

    if (group.owner !== userId) {
      throw new Error('Only group owner can delete the group.');
    }

    // Migrate each member's data from group to personal before deleting group
    for (const memberId of group.members) {
      try {
        await _removeMemberDataFromGroupByUserId(memberId, group.id);
        // Clear member's group reference
        const userDocRef = doc(db, 'users', memberId);
        await setDoc(userDocRef, { groupId: null }, { merge: true });
      } catch (err) {
        console.error(`Failed to migrate data for member ${memberId}:`, err);
        // Continue with other members even if one fails
      }
    }

    // Delete the group
    await deleteDoc(doc(db, 'groups', group.id));
  } catch (error) {
    throw error;
  }
};

/**
 * Get user email from userId
 * @param {string} userId - User's UID
 * @returns {Promise<string|null>} User email or null if not found
 */
export const getUserEmail = async (userId) => {
  try {
    // Try to get from Firestore first
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    
    if (userDoc.exists() && userDoc.data().email) {
      return userDoc.data().email;
    }
    
    // Fallback: if it's the current user, get from auth
    if (auth.currentUser && auth.currentUser.uid === userId) {
      return auth.currentUser.email;
    }
    
    return null;
  } catch (error) {
    console.error('Error getting user email:', error);
    return null;
  }
};

/**
 * Migrate all personal data (activities, trackables, trackers, banks) to a group
 * Re-encrypts data with group encryption key so all members can decrypt each other's data
 * @param {string} groupId - Target group ID
 * @returns {Promise<Object>} Migration result with counts
 */
export const migrateDataToGroup = async (groupId) => {
  try {
    const userId = getUserId();
    const batch = writeBatch(db);
    
    // Generate encryption keys
    const personalKey = generateEncryptionKey(userId, null); // Original personal key
    const groupKey = generateEncryptionKey(userId, groupId);  // New group key
    
    let counts = {
      activities: 0,
      trackables: 0,
      trackers: 0,
      banks: 0,
    };

    // Helper function to re-encrypt a field
    const reencryptField = (data, fieldName, personalKey, groupKey) => {
      if (!data[`_encrypted_${fieldName}`] || !data[fieldName]) {
        return; // Field not encrypted, skip
      }
      try {
        // Decrypt with personal key
        const decryptedBytes = CryptoJS.AES.decrypt(data[fieldName], personalKey);
        const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
        const decryptedValue = JSON.parse(decryptedString);
        
        // Re-encrypt with group key
        const jsonString = JSON.stringify(decryptedValue);
        data[fieldName] = CryptoJS.AES.encrypt(jsonString, groupKey).toString();
      } catch (err) {
        console.error(`Failed to re-encrypt field ${fieldName}:`, err);
      }
    };

    // Migrate activities
    const activitiesQuery = query(collection(db, 'activities'), where('userId', '==', userId));
    const activitiesSnapshot = await getDocs(activitiesQuery);
    activitiesSnapshot.forEach((docSnapshot) => {
      const docData = { ...docSnapshot.data() };
      // Re-encrypt sensitive fields
      ['amount', 'description', 'type'].forEach(field => reencryptField(docData, field, personalKey, groupKey));
      
      const docRef = doc(db, 'activities', docSnapshot.id);
      batch.update(docRef, { 
        ...docData,
        groupId: groupId 
      });
      counts.activities++;
    });

    // Migrate trackables
    const trackablesQuery = query(collection(db, 'trackables'), where('userId', '==', userId));
    const trackablesSnapshot = await getDocs(trackablesQuery);
    trackablesSnapshot.forEach((docSnapshot) => {
      const docData = { ...docSnapshot.data() };
      // Re-encrypt sensitive fields
      ['name', 'type', 'amount', 'trackerAmount', 'includeInTracker'].forEach(field => reencryptField(docData, field, personalKey, groupKey));
      
      const docRef = doc(db, 'trackables', docSnapshot.id);
      batch.update(docRef, { 
        ...docData,
        groupId: groupId 
      });
      counts.trackables++;
    });

    // Migrate trackers
    const trackersQuery = query(collection(db, 'trackers'), where('userId', '==', userId));
    const trackersSnapshot = await getDocs(trackersQuery);
    trackersSnapshot.forEach((docSnapshot) => {
      const docData = { ...docSnapshot.data() };
      // Re-encrypt sensitive fields
      ['isDone', 'completedAt'].forEach(field => reencryptField(docData, field, personalKey, groupKey));
      
      const docRef = doc(db, 'trackers', docSnapshot.id);
      batch.update(docRef, { 
        ...docData,
        groupId: groupId 
      });
      counts.trackers++;
    });

    // Migrate banks
    const banksQuery = query(collection(db, 'bankAccounts'), where('userId', '==', userId));
    const banksSnapshot = await getDocs(banksQuery);
    banksSnapshot.forEach((docSnapshot) => {
      const docData = { ...docSnapshot.data() };
      // Re-encrypt sensitive fields
      ['cardName', 'accountNumber'].forEach(field => reencryptField(docData, field, personalKey, groupKey));
      
      const docRef = doc(db, 'bankAccounts', docSnapshot.id);
      batch.update(docRef, { 
        ...docData,
        groupId: groupId 
      });
      counts.banks++;
    });

    // Commit batch
    await batch.commit();
    return counts;
  } catch (error) {
    console.error('Error migrating data to group:', error);
    throw error;
  }
};

/**
 * Auto-merge personal data into group with conflict resolution
 * When user creates or joins a group, all personal data is merged into group
 * If conflicts exist (same name), incoming data is appended with "-<email>"
 * @param {string} groupId - Group ID to merge data into
 * @returns {Promise<Object>} Counts of merged items per collection
 */
export const autoMergeDataToGroup = async (groupId) => {
  try {
    const userId = getUserId();
    const userEmail = auth.currentUser?.email || userId;
    const batch = writeBatch(db);
    
    // Generate encryption keys
    const personalKey = generateEncryptionKey(userId, null);
    const groupKey = generateEncryptionKey(userId, groupId);
    
    let counts = {
      activities: 0,
      trackables: 0,
      trackers: 0,
      banks: 0,
    };

    // Helper to re-encrypt fields
    const reencryptField = (data, fieldName, fromKey, toKey) => {
      if (!data[`_encrypted_${fieldName}`] || !data[fieldName]) return;
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(data[fieldName], fromKey);
        const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
        const decryptedValue = JSON.parse(decryptedString);
        const jsonString = JSON.stringify(decryptedValue);
        data[fieldName] = CryptoJS.AES.encrypt(jsonString, toKey).toString();
      } catch (err) {
        console.error(`Failed to re-encrypt field ${fieldName}:`, err);
      }
    };

    // Helper to check if name exists in group (for banks and trackables)
    const nameExistsInGroup = async (collectionName, name) => {
      const q = query(collection(db, collectionName), where('groupId', '==', groupId));
      const snapshot = await getDocs(q);
      
      for (const doc of snapshot.docs) {
        const data = doc.data();
        if (data._encrypted_name && data.name) {
          try {
            const decryptedBytes = CryptoJS.AES.decrypt(data.name, groupKey);
            const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
            const decryptedName = JSON.parse(decryptedString);
            if (decryptedName === name) return true;
          } catch (err) {
            // Continue checking other documents
          }
        }
      }
      return false;
    };

    // Merge banks
    const banksQuery = query(collection(db, 'bankAccounts'), where('userId', '==', userId));
    const banksSnapshot = await getDocs(banksQuery);
    const banksToMerge = banksSnapshot.docs.filter(doc => !doc.data().groupId);
    
    for (const docSnapshot of banksToMerge) {
      const docData = { ...docSnapshot.data() };
      
      // Decrypt name to check for conflicts
      let cardName = docData.cardName;
      if (docData._encrypted_cardName) {
        try {
          const nameBytes = CryptoJS.AES.decrypt(docData.cardName, personalKey);
          const nameStr = nameBytes.toString(CryptoJS.enc.Utf8);
          cardName = JSON.parse(nameStr);
        } catch (err) {
          console.error('Failed to decrypt cardName:', err);
        }
      }
      
      // Check for conflicts and add email suffix if needed
      if (await nameExistsInGroup('bankAccounts', cardName)) {
        cardName = `${cardName}-${userEmail}`;
        const jsonString = JSON.stringify(cardName);
        docData.cardName = CryptoJS.AES.encrypt(jsonString, groupKey).toString();
      } else {
        reencryptField(docData, 'cardName', personalKey, groupKey);
      }
      
      reencryptField(docData, 'accountNumber', personalKey, groupKey);
      
      const docRef = doc(db, 'bankAccounts', docSnapshot.id);
      batch.update(docRef, {
        ...docData,
        groupId,
        groupMemberId: userId,
      });
      counts.banks++;
    }

    // Merge trackables
    const trackablesQuery = query(collection(db, 'trackables'), where('userId', '==', userId));
    const trackablesSnapshot = await getDocs(trackablesQuery);
    const trackablesToMerge = trackablesSnapshot.docs.filter(doc => !doc.data().groupId);
    
    for (const docSnapshot of trackablesToMerge) {
      const docData = { ...docSnapshot.data() };
      
      // Decrypt name to check for conflicts
      let name = docData.name;
      if (docData._encrypted_name) {
        try {
          const nameBytes = CryptoJS.AES.decrypt(docData.name, personalKey);
          const nameStr = nameBytes.toString(CryptoJS.enc.Utf8);
          name = JSON.parse(nameStr);
        } catch (err) {
          console.error('Failed to decrypt name:', err);
        }
      }
      
      // Check for conflicts and add email suffix if needed
      if (await nameExistsInGroup('trackables', name)) {
        name = `${name}-${userEmail}`;
        const jsonString = JSON.stringify(name);
        docData.name = CryptoJS.AES.encrypt(jsonString, groupKey).toString();
      } else {
        reencryptField(docData, 'name', personalKey, groupKey);
      }
      
      ['type', 'amount', 'trackerAmount', 'includeInTracker'].forEach(field => 
        reencryptField(docData, field, personalKey, groupKey)
      );
      
      const docRef = doc(db, 'trackables', docSnapshot.id);
      batch.update(docRef, {
        ...docData,
        groupId,
        groupMemberId: userId,
      });
      counts.trackables++;
    }

    // Merge activities
    const activitiesQuery = query(collection(db, 'activities'), where('userId', '==', userId));
    const activitiesSnapshot = await getDocs(activitiesQuery);
    const activitiesToMerge = activitiesSnapshot.docs.filter(doc => !doc.data().groupId);
    
    for (const docSnapshot of activitiesToMerge) {
      const docData = { ...docSnapshot.data() };
      
      // For activities, check for exact duplicates (same amount, description, type, date)
      // If description matches, append email to make it unique
      let description = docData.description;
      if (docData._encrypted_description) {
        try {
          const descBytes = CryptoJS.AES.decrypt(docData.description, personalKey);
          const descStr = descBytes.toString(CryptoJS.enc.Utf8);
          description = JSON.parse(descStr);
        } catch (err) {
          console.error('Failed to decrypt description:', err);
        }
      }
      
      const q = query(
        collection(db, 'activities'),
        where('groupId', '==', groupId),
        where('date', '==', docData.date)
      );
      const existing = await getDocs(q);
      
      let hasConflict = false;
      for (const existingDoc of existing.docs) {
        const existingData = existingDoc.data();
        let existingDesc = '';
        if (existingData._encrypted_description) {
          try {
            const existingDescBytes = CryptoJS.AES.decrypt(existingData.description, groupKey);
            const existingDescStr = existingDescBytes.toString(CryptoJS.enc.Utf8);
            existingDesc = JSON.parse(existingDescStr);
          } catch (err) {
            // Continue
          }
        }
        if (existingDesc === description) {
          hasConflict = true;
          break;
        }
      }
      
      if (hasConflict && description) {
        description = `${description}-${userEmail}`;
        const jsonString = JSON.stringify(description);
        docData.description = CryptoJS.AES.encrypt(jsonString, groupKey).toString();
      } else {
        reencryptField(docData, 'description', personalKey, groupKey);
      }
      
      ['amount', 'type'].forEach(field => 
        reencryptField(docData, field, personalKey, groupKey)
      );
      
      const docRef = doc(db, 'activities', docSnapshot.id);
      batch.update(docRef, {
        ...docData,
        groupId,
        groupMemberId: userId,
      });
      counts.activities++;
    }

    // Merge trackers
    const trackersQuery = query(collection(db, 'trackers'), where('userId', '==', userId));
    const trackersSnapshot = await getDocs(trackersQuery);
    const trackersToMerge = trackersSnapshot.docs.filter(doc => !doc.data().groupId);
    
    for (const docSnapshot of trackersToMerge) {
      const docData = { ...docSnapshot.data() };
      
      ['isDone', 'completedAt'].forEach(field => 
        reencryptField(docData, field, personalKey, groupKey)
      );
      
      const docRef = doc(db, 'trackers', docSnapshot.id);
      batch.update(docRef, {
        ...docData,
        groupId,
        groupMemberId: userId,
      });
      counts.trackers++;
    }

    await batch.commit();
    return counts;
  } catch (error) {
    console.error('Error auto-merging data to group:', error);
    throw error;
  }
};

/**
 * Remove current user's data from group and restore to personal account
 * Called when user leaves a group
 * Removes email suffix from names during transfer
 * @returns {Promise<Object>} Counts of removed items per collection
 */
/**
 * Internal helper to remove a specific member's data from group
 * @private
 * @param {string} userId - Member's user ID
 * @param {string} groupId - Group ID
 * @returns {Promise<Object>} Migration counts
 */
const _removeMemberDataFromGroupByUserId = async (userId, groupId) => {
  try {
    // Get user's email
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const userEmail = userDoc.exists() ? userDoc.data().email : userId;

    const personalKey = generateEncryptionKey(userId, null);
    const groupKey = generateEncryptionKey(userId, groupId);
    
    let counts = {
      activities: 0,
      trackables: 0,
      trackers: 0,
      banks: 0,
    };

    // Helper to re-encrypt field
    const reencryptField = (data, fieldName, fromKey, toKey) => {
      if (!data[`_encrypted_${fieldName}`] || !data[fieldName]) return;
      try {
        const decryptedBytes = CryptoJS.AES.decrypt(data[fieldName], fromKey);
        const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
        const decryptedValue = JSON.parse(decryptedString);
        const jsonString = JSON.stringify(decryptedValue);
        data[fieldName] = CryptoJS.AES.encrypt(jsonString, toKey).toString();
      } catch (err) {
        console.error(`Failed to re-encrypt field ${fieldName}:`, err);
      }
    };

    // Helper to remove email suffix from name
    const removeEmailSuffix = (name, email) => {
      const suffix = `-${email}`;
      if (name.endsWith(suffix)) {
        return name.slice(0, -suffix.length);
      }
      return name;
    };

    const batch = writeBatch(db);

    // Process all collections for this user
    const collections = ['bankAccounts', 'trackables', 'activities', 'trackers'];
    
    for (const collectionName of collections) {
      const q = query(collection(db, collectionName), where('groupMemberId', '==', userId));
      const snapshot = await getDocs(q);
      
      for (const docSnapshot of snapshot.docs) {
        const docData = { ...docSnapshot.data() };
        
        // Remove email suffix from name/description if present
        const nameFields = ['name', 'cardName', 'description'];
        for (const nameField of nameFields) {
          if (docData[`_encrypted_${nameField}`] && docData[nameField]) {
            try {
              const decryptedBytes = CryptoJS.AES.decrypt(docData[nameField], groupKey);
              const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
              let decryptedValue = JSON.parse(decryptedString);
              
              // Remove email suffix
              decryptedValue = removeEmailSuffix(decryptedValue, userEmail);
              
              // Re-encrypt with personal key
              const jsonString = JSON.stringify(decryptedValue);
              docData[nameField] = CryptoJS.AES.encrypt(jsonString, personalKey).toString();
            } catch (err) {
              console.error(`Failed to process ${nameField}:`, err);
            }
          }
        }
        
        // Re-encrypt all other encrypted fields with personal key
        const allFields = ['amount', 'type', 'accountNumber', 'trackerAmount', 'includeInTracker', 'isDone', 'completedAt'];
        for (const field of allFields) {
          if (docData[`_encrypted_${field}`] && docData[field]) {
            reencryptField(docData, field, groupKey, personalKey);
          }
        }
        
        const docRef = doc(db, collectionName, docSnapshot.id);
        batch.update(docRef, {
          ...docData,
          groupId: null,
          groupMemberId: null,
          userId: userId,
        });
        
        // Increment counter based on collection
        if (collectionName === 'bankAccounts') counts.banks++;
        else if (collectionName === 'trackables') counts.trackables++;
        else if (collectionName === 'activities') counts.activities++;
        else if (collectionName === 'trackers') counts.trackers++;
      }
    }

    await batch.commit();
    return counts;
  } catch (error) {
    console.error('Error removing member data from group:', error);
    throw error;
  }
};

/**
 * Remove current user's data from group and migrate to personal account
 * @returns {Promise<Object>} Migration counts
 */
export const removeMemberDataFromGroup = async () => {
  try {
    const userId = getUserId();
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    const groupId = userDoc.data()?.groupId;
    
    if (!groupId) {
      throw new Error('User is not in a group');
    }

    return await _removeMemberDataFromGroupByUserId(userId, groupId);
  } catch (error) {
    console.error('Error removing member data from group:', error);
    throw error;
  }
};
/**
 * Register a biometric credential (fingerprint/Face ID) for the user
 * Stores credential metadata in Firestore for later authentication
 * @param {string} credentialData - Raw credential data from WebAuthn registration
 * @param {string} deviceName - Optional device name to identify the credential
 * @returns {Promise<Object>} Stored credential with metadata
 */
export const registerBiometricCredential = async (credentialData, deviceName = null) => {
  try {
    const userId = getUserId();
    const serializedCredential = {
      id: credentialData.id,
      rawId: Array.from(new Uint8Array(credentialData.rawId)),
      type: credentialData.type,
      response: {
        attestationObject: Array.from(new Uint8Array(credentialData.response.attestationObject)),
        clientDataJSON: Array.from(new Uint8Array(credentialData.response.clientDataJSON)),
      },
      registeredAt: serverTimestamp(),
      deviceName: deviceName || `Device`,
      verified: true,
    };

    // Store credential in user's biometric credentials subcollection
    const credentialsRef = collection(db, 'users', userId, 'biometricCredentials');
    const docRef = await addDoc(credentialsRef, serializedCredential);

    return {
      id: docRef.id,
      ...serializedCredential,
    };
  } catch (error) {
    console.error('Error registering biometric credential:', error);
    throw error;
  }
};

/**
 * Get all registered biometric credentials for the user
 * @returns {Promise<Array>} List of registered credentials
 */
export const getBiometricCredentials = async () => {
  try {
    const userId = getUserId();
    const credentialsRef = collection(db, 'users', userId, 'biometricCredentials');
    const snapshot = await getDocs(credentialsRef);

    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
    }));
  } catch (error) {
    console.error('Error getting biometric credentials:', error);
    return [];
  }
};

/**
 * Delete a biometric credential
 * @param {string} credentialId - ID of the credential to delete
 * @returns {Promise<void>}
 */
export const deleteBiometricCredential = async (credentialId) => {
  try {
    const userId = getUserId();
    const credentialDocRef = doc(db, 'users', userId, 'biometricCredentials', credentialId);
    await deleteDoc(credentialDocRef);
  } catch (error) {
    console.error('Error deleting biometric credential:', error);
    throw error;
  }
};

/**
 * Check if user has any registered biometric credentials
 * @returns {Promise<boolean>}
 */
export const hasBiometricCredentials = async () => {
  try {
    const credentials = await getBiometricCredentials();
    return credentials.length > 0;
  } catch (error) {
    console.error('Error checking biometric credentials:', error);
    return false;
  }
};

/**
 * Store biometric authentication attempt in user preferences
 * @param {boolean} rememberDevice - Whether to remember this device for biometric auth
 * @returns {Promise<void>}
 */
export const setBiometricPreference = async (rememberDevice = true) => {
  try {
    const userId = getUserId();
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      biometricEnabled: rememberDevice,
      lastBiometricUsed: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error setting biometric preference:', error);
    throw error;
  }
};

/**
 * Get user's biometric preferences
 * @returns {Promise<Object>} User biometric settings
 */
export const getBiometricPreference = async () => {
  try {
    const userId = getUserId();
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);

    if (userDoc.exists()) {
      return {
        biometricEnabled: userDoc.data().biometricEnabled || false,
        lastBiometricUsed: userDoc.data().lastBiometricUsed || null,
      };
    }

    return {
      biometricEnabled: false,
      lastBiometricUsed: null,
    };
  } catch (error) {
    console.error('Error getting biometric preference:', error);
    return {
      biometricEnabled: false,
      lastBiometricUsed: null,
    };
  }
};

/**
 * Register Google MFA biometric credential
 * @param {string} credentialId - Biometric credential ID
 * @param {Object} credentialPublicKey - Public key object
 * @returns {Promise<void>}
 */
export const registerGoogleMFABiometric = async (credentialId, credentialPublicKey) => {
  try {
    const userId = getUserId();
    const credentialDocRef = doc(db, 'users', userId, 'googleMFACredentials', credentialId);
    await setDoc(credentialDocRef, {
      credentialId,
      publicKey: JSON.stringify(credentialPublicKey),
      createdAt: serverTimestamp(),
      enabled: true,
      authMethod: 'google',
    });
  } catch (error) {
    console.error('Error registering Google MFA biometric:', error);
    throw error;
  }
};

/**
 * Get user's Google MFA biometric credentials
 * @returns {Promise<Array>}
 */
export const getGoogleMFACredentials = async () => {
  try {
    const userId = getUserId();
    const credentialsRef = collection(db, 'users', userId, 'googleMFACredentials');
    const q = query(credentialsRef, where('enabled', '==', true));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data(),
      publicKey: JSON.parse(doc.data().publicKey),
    }));
  } catch (error) {
    console.error('Error getting Google MFA credentials:', error);
    return [];
  }
};

/**
 * Check if user has Google MFA biometric enabled
 * @returns {Promise<boolean>}
 */
export const hasGoogleMFABiometric = async () => {
  try {
    const credentials = await getGoogleMFACredentials();
    return credentials.length > 0;
  } catch (error) {
    console.error('Error checking Google MFA:', error);
    return false;
  }
};

/**
 * Store Google MFA status in user preferences
 * @param {boolean} enabled - Whether Google MFA is enabled
 * @returns {Promise<void>}
 */
export const setGoogleMFAStatus = async (enabled = true) => {
  try {
    const userId = getUserId();
    const userDocRef = doc(db, 'users', userId);
    await setDoc(userDocRef, {
      googleMFAEnabled: enabled,
      lastGoogleMFAUpdate: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error setting Google MFA status:', error);
    throw error;
  }
};

/**
 * Get Google MFA status
 * @returns {Promise<boolean>}
 */
export const getGoogleMFAStatus = async () => {
  try {
    const userId = getUserId();
    const userDocRef = doc(db, 'users', userId);
    const userDoc = await getDoc(userDocRef);
    return userDoc.exists() ? userDoc.data().googleMFAEnabled || false : false;
  } catch (error) {
    console.error('Error getting Google MFA status:', error);
    return false;
  }
};

/**
 * Delete Google MFA biometric credential
 * @param {string} credentialId - Credential ID to delete
 * @returns {Promise<void>}
 */
export const deleteGoogleMFACredential = async (credentialId) => {
  try {
    const userId = getUserId();
    const credentialDocRef = doc(db, 'users', userId, 'googleMFACredentials', credentialId);
    await deleteDoc(credentialDocRef);
  } catch (error) {
    console.error('Error deleting Google MFA credential:', error);
    throw error;
  }
};