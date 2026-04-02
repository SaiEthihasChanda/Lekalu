import React, { useState, useEffect } from 'react';
import { Fingerprint, AlertCircle, LogOut } from 'lucide-react';
import { useBiometricAuth } from '../hooks/useBiometricAuth.js';
import { logoutUser } from '../fb/index.js';
import { isMobileDevice } from '../utils/webauthn.js';
import { useAuth } from '../contexts/AuthContext.jsx';

/**
 * Post-Login Biometric Verification Component
 * Final security layer after successful login/registration
 * Only shows if user has registered biometric credentials
 * Mobile devices only - cleared on page refresh
 */
export const PostLoginBiometricVerification = ({ onVerificationSuccess }) => {
  const { user } = useAuth();
  const { authenticateWithBiometric, isBiometricSupported } = useBiometricAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const [hasCredentials, setHasCredentials] = useState(false);
  const MAX_ATTEMPTS = 2;

  // Check if user has registered biometric credentials
  useEffect(() => {
    if (user) {
      const credentials = JSON.parse(
        localStorage.getItem(`biometricCredentials_${user.uid}`) || '[]'
      );
      const hasCredsFlag = credentials.length > 0;
      setHasCredentials(hasCredsFlag);
      console.log('[PostLoginBiometric] User:', user.uid, 'Has credentials:', hasCredsFlag, 'Count:', credentials.length);
      console.log('[PostLoginBiometric] All localStorage keys:', Object.keys(localStorage));
      console.log('[PostLoginBiometric] Credentials data:', credentials);
    }
  }, [user]);

  // Clear biometric session on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      console.log('[PostLoginBiometric] Page unloading, clearing session');
      sessionStorage.removeItem('biometricVerified');
    };
    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Auto-verify if previous session had biometric verification
  useEffect(() => {
    const biometricVerified = sessionStorage.getItem('biometricVerified');
    const biometricTimestamp = sessionStorage.getItem('biometricVerifiedTime');
    const now = Date.now();
    
    // Check if session is still valid (within 30 minutes)
    if (biometricVerified === 'true' && biometricTimestamp) {
      const sessionAge = now - parseInt(biometricTimestamp);
      console.log('[PostLoginBiometric] Checking session age (ms):', sessionAge);
      
      if (sessionAge < 30 * 60 * 1000) { // 30 minutes
        console.log('[PostLoginBiometric] Auto-verifying from previous session');
        if (onVerificationSuccess) onVerificationSuccess();
      } else {
        console.log('[PostLoginBiometric] Session expired, requiring re-verification');
        sessionStorage.removeItem('biometricVerified');
        sessionStorage.removeItem('biometricVerifiedTime');
      }
    }
  }, [onVerificationSuccess]);

  const handleBiometricVerification = async () => {
    setError('');
    setLoading(true);
    setVerificationAttempts(prev => prev + 1);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[PostLoginBiometric] Attempting biometric verification for user:', user.uid);
      const verified = await authenticateWithBiometric(user.uid);
      
      console.log('[PostLoginBiometric] Verified result:', verified);
      
      if (verified) {
        console.log('[PostLoginBiometric] Biometric verification successful');
        sessionStorage.setItem('biometricVerified', 'true');
        sessionStorage.setItem('biometricVerifiedTime', Date.now().toString());
        console.log('[PostLoginBiometric] Session storage set, calling callback');
        if (onVerificationSuccess) {
          console.log('[PostLoginBiometric] Calling onVerificationSuccess callback');
          onVerificationSuccess();
          console.log('[PostLoginBiometric] Callback executed');
        }
      } else {
        setError('Biometric verification failed - no assertion returned');
      }
    } catch (err) {
      console.error('[PostLoginBiometric] Biometric error:', err);
      setError(err.message || 'Biometric verification failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Skip biometric and continue to app
    console.log('[PostLoginBiometric] Skipping biometric, continuing to app');
    sessionStorage.setItem('biometricVerified', 'true');
    if (onVerificationSuccess) onVerificationSuccess();
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="fixed inset-0 bg-primary flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md">
        <div className="bg-secondary rounded-lg border border-gray-700 p-8 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-accent/10 rounded-full">
              <Fingerprint size={48} className="text-accent" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">Security Verification</h2>
          <p className="text-gray-400 mb-6 text-sm">
            {hasCredentials && isBiometricSupported
              ? 'Verify with your registered biometric'
              : 'Ready to access your account'}
          </p>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* Show biometric button only if user has credentials and device supports it */}
          {hasCredentials && isBiometricSupported && (
            <button
              onClick={handleBiometricVerification}
              disabled={loading}
              className="w-full bg-accent hover:bg-blue-600 text-white font-semibold py-3 rounded-lg mb-3 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                  <span>Verifying...</span>
                </>
              ) : (
                <>
                  <Fingerprint size={20} />
                  <span>Verify with Biometric</span>
                </>
              )}
            </button>
          )}

          {/* Continue Button - ONLY if NO credentials registered */}
          {!hasCredentials && (
            <button
              onClick={handleContinue}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg mb-3 transition-colors"
            >
              Continue to App
            </button>
          )}

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full bg-red-600/50 hover:bg-red-600 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>

          <p className="text-xs text-gray-500 mt-6">
            Verification expires when you leave the app or close the tab.
          </p>
        </div>
      </div>
    </div>
  );
};
