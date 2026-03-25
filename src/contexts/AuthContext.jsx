import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth } from '../fb/index.js';

/**
 * @typedef {Object} AuthContextType
 * @property {Object|null} user - Current authenticated user
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = auth.onAuthStateChanged(
      (currentUser) => {
        try {
          setUser(currentUser);
          setError(null);
        } catch (err) {
          setError(err);
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setError(err);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, error }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * Hook to use Auth Context
 * @returns {AuthContextType} Auth context value
 */
export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return context;
};
