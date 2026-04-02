import { useState, useCallback, useEffect } from 'react';
import {
  registerBiometric as registerBiometricWebAuthn,
  authenticateWithBiometric as authenticateWithBiometricWebAuthn,
  isMobileDevice,
  isBiometricAvailable,
  formatBiometricError,
} from '../utils/webauthn.js';
import {
  registerBiometricCredential,
  getBiometricCredentials,
  deleteBiometricCredential,
  setBiometricPreference,
  getBiometricPreference,
} from '../fb/index.js';

/**
 * Hook for managing biometric authentication
 * @returns {Object} Biometric auth state and functions
 */
export const useBiometricAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [credentials, setCredentials] = useState([]);

  // Check biometric support on mount and update state
  useEffect(() => {
    const checkSupport = async () => {
      try {
        const isMobile = isMobileDevice();
        const isAvailable = await isBiometricAvailable();
        const supported = isMobile && isAvailable;
        console.log(`[useBiometricAuth] Mobile: ${isMobile}, Available: ${isAvailable}, Supported: ${supported}`);
        setIsBiometricSupported(supported);
      } catch (err) {
        console.error('[useBiometricAuth] Error checking biometric support:', err);
        setIsBiometricSupported(false);
      }
    };
    
    checkSupport();
  }, []);

  // Register new biometric credential
  const registerBiometric = useCallback(async (userId, email, deviceName) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get WebAuthn credential from device
      const credentialData = await registerBiometricWebAuthn(userId, email);

      // Store in Firestore
      const storedCredential = await registerBiometricCredential(
        credentialData,
        deviceName
      );

      // Enable biometric preference
      await setBiometricPreference(true);

      // Update local state
      const allCredentials = await getBiometricCredentials();
      setCredentials(allCredentials);

      setIsLoading(false);
      return storedCredential;
    } catch (err) {
      const errorMessage = formatBiometricError(err);
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Authenticate with biometric
  const authenticateWithBiometric = useCallback(async (userId) => {
    setIsLoading(true);
    setError(null);

    try {
      if (!userId) {
        throw new Error('User ID is required for biometric authentication');
      }

      console.log('[useBiometricAuth] Authenticating with biometric for user:', userId);
      const assertion = await authenticateWithBiometricWebAuthn(userId);

      if (!assertion) {
        throw new Error('Biometric authentication failed');
      }

      console.log('[useBiometricAuth] Biometric authentication successful');
      setIsLoading(false);
      return assertion;
    } catch (err) {
      const errorMessage = formatBiometricError(err);
      console.error('[useBiometricAuth] Authentication error:', err);
      setError(errorMessage);
      setIsLoading(false);
      throw err;
    }
  }, []);

  // Load user's credentials
  const loadCredentials = useCallback(async () => {
    try {
      const allCredentials = await getBiometricCredentials();
      setCredentials(allCredentials);
    } catch (err) {
      console.error('Error loading credentials:', err);
    }
  }, []);

  // Remove a credential
  const removeCredential = useCallback(async (credentialId) => {
    try {
      await deleteBiometricCredential(credentialId);
      await loadCredentials();
    } catch (err) {
      setError('Failed to remove credential');
      console.error('Error removing credential:', err);
    }
  }, [loadCredentials]);

  // Get user preferences
  const getBiometricPreference_hook = useCallback(async () => {
    try {
      return await getBiometricPreference();
    } catch (err) {
      console.error('Error getting preference:', err);
      return { biometricEnabled: false, lastBiometricUsed: null };
    }
  }, []);

  return {
    isLoading,
    error,
    isBiometricSupported,
    credentials,
    registerBiometric,
    authenticateWithBiometric,
    loadCredentials,
    removeCredential,
    getBiometricPreference: getBiometricPreference_hook,
  };
};
