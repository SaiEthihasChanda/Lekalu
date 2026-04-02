import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { auth, db, getUserGroup as fetchUserGroup } from '../fb/index.js';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

/**
 * @typedef {Object} AuthContextType
 * @property {Object|null} user - Current authenticated user
 * @property {Object|null} group - Current user's group (if in a group)
 * @property {boolean} loading - Loading state during auth check
 * @property {Error|null} error - Authentication error
 */

const AuthContext = createContext();

/**
 * Auth Context Provider
 * @param {Object} props
 * @param {React.ReactNode} props.children - Child components
 * @returns {JSX.Element}
 */
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isBiometricVerified, setIsBiometricVerified] = useState(false);
  const unsubscribeUserDocRef = useRef(null);
  const currentGroupIdRef = useRef(null);
  const groupFetchTimeoutRef = useRef(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = auth.onAuthStateChanged(
      async (currentUser) => {
        try {
          // Clean up previous user doc listener
          if (unsubscribeUserDocRef.current) {
            unsubscribeUserDocRef.current();
          }
          
          // Clean up any pending group fetch
          if (groupFetchTimeoutRef.current) {
            clearTimeout(groupFetchTimeoutRef.current);
          }

          setUser(currentUser);
          
          // Reset group and biometric on logout
          if (!currentUser) {
            setGroup(null);
            setIsBiometricVerified(false);
            currentGroupIdRef.current = null;
            setLoading(false);
            return;
          }
          
          // Store user email in Firestore if user is authenticated
          const userDocRef = doc(db, 'users', currentUser.uid);
          await setDoc(userDocRef, {
            email: currentUser.email,
            photoURL: currentUser.photoURL,
            displayName: currentUser.displayName,
          }, { merge: true });

          // Listen to user document changes to detect group changes in real-time
          unsubscribeUserDocRef.current = onSnapshot(userDocRef, async (docSnapshot) => {
            const newGroupId = docSnapshot.exists() ? docSnapshot.data().groupId : null;
            
            // Only fetch if groupId actually changed (prevents duplicate fetches)
            if (newGroupId === currentGroupIdRef.current) {
              setLoading(false);
              return;
            }
            
            currentGroupIdRef.current = newGroupId;

            if (newGroupId) {
              // User has a group - debounce fetch to avoid rapid re-encryptions
              if (groupFetchTimeoutRef.current) {
                clearTimeout(groupFetchTimeoutRef.current);
              }
              
              groupFetchTimeoutRef.current = setTimeout(async () => {
                try {
                  const userGroup = await fetchUserGroup();
                  setGroup(userGroup);
                } catch (groupError) {
                  console.error('Error fetching user group:', groupError);
                  setGroup(null);
                }
                setLoading(false);
              }, 300); // 300ms debounce to ensure state consistency
            } else {
              // User left the group
              setGroup(null);
              setLoading(false);
            }
          }, (err) => {
            console.error('Error listening to user document:', err);
            setGroup(null);
            currentGroupIdRef.current = null;
            setLoading(false);
          });
          
          setError(null);
        } catch (err) {
          console.error('Error in auth state change:', err);
          setError(err);
          setGroup(null);
          currentGroupIdRef.current = null;
          setLoading(false);
        }
      },
      (err) => {
        console.error('Auth state change error:', err);
        setError(err);
        setGroup(null);
        currentGroupIdRef.current = null;
        setLoading(false);
      }
    );

    return () => {
      unsubscribe();
      if (unsubscribeUserDocRef.current) {
        unsubscribeUserDocRef.current();
      }
      if (groupFetchTimeoutRef.current) {
        clearTimeout(groupFetchTimeoutRef.current);
      }
    };
  }, []);

  return (
    <AuthContext.Provider value={{ user, group, loading, error, isBiometricVerified, setIsBiometricVerified }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use Auth Context
 * @returns {AuthContextType} Auth context value with user, group, loading, and error
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
