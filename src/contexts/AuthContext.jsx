import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, getUserGroup as fetchUserGroup } from '../fb/index.js';
import { doc, setDoc } from 'firebase/firestore';

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

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = auth.onAuthStateChanged(
      async (currentUser) => {
        try {
          setUser(currentUser);
          
          // Reset group on logout
          if (!currentUser) {
            setGroup(null);
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

          // Fetch and cache user's group once
          try {
            const userGroup = await fetchUserGroup();
            setGroup(userGroup);
          } catch (groupError) {
            console.error('Error fetching user group:', groupError);
            setGroup(null);
          }
          
          setError(null);
        } catch (err) {
          console.error('Error in auth state change:', err);
          setError(err);
          setGroup(null);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        console.error('Auth state change error:', err);
        setError(err);
        setGroup(null);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, group, loading, error }}>
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
