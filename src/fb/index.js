import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, query, where, getDocs, updateDoc, deleteDoc, doc, setDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import { getAuth, signInAnonymously, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, GoogleAuthProvider, signInWithPopup } from 'firebase/auth';

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

    // Delete all documents from each collection for this user
    for (const collectionName of collectionNames) {
      const q = query(collection(db, collectionName), where('userId', '==', userId));
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

    // Remove all members from group
    for (const memberId of group.members) {
      const userDocRef = doc(db, 'users', memberId);
      await setDoc(userDocRef, { groupId: null }, { merge: true });
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
