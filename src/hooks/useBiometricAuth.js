import { useState, useCallback } from 'react';
import {
  registerBiometric,
  authenticateWithBiometric,
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

  // Check biometric support on mount
  const checkBiometricSupport = useCallback(async () => {
    const isMobile = isMobileDevice();
    const isAvailable = await isBiometricAvailable();
    setIsBiometricSupported(isMobile && isAvailable);
  }, []);

  // Register new biometric credential
  const registerBiometric = useCallback(async (userId, email, deviceName) => {
    setIsLoading(true);
    setError(null);

    try {
      // Get WebAuthn credential from device
      const credentialData = await registerBiometric(userId, email);

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
  const authenticateWithBiometric = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const assertion = await authenticateWithBiometric();

      if (!assertion) {
        throw new Error('Biometric authentication failed');
      }

      setIsLoading(false);
      return assertion;
    } catch (err) {
      const errorMessage = formatBiometricError(err);
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
    checkBiometricSupport,
    registerBiometric,
    authenticateWithBiometric,
    loadCredentials,
    removeCredential,
    getBiometricPreference: getBiometricPreference_hook,
  };
};
