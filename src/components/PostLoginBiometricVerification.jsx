import React, { useState, useEffect } from 'react';
import { Fingerprint, AlertCircle, LogOut } from 'lucide-react';
import { useBiometricAuth } from '../hooks/useBiometricAuth.js';
import { logoutUser } from '../fb/index.js';
import { isMobileDevice } from '../utils/webauthn.js';

/**
 * Post-Login Biometric Verification Component
 * Final security layer after successful login/registration
 * Requires biometric verification before entering the app
 * Mobile devices only - cleared on page refresh
 */
export const PostLoginBiometricVerification = ({ onVerificationSuccess }) => {
  const { authenticateWithBiometric, isBiometricSupported } = useBiometricAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [verificationAttempts, setVerificationAttempts] = useState(0);
  const MAX_ATTEMPTS = 3;

  // Clear biometric session on page unload/refresh
  useEffect(() => {
    const handleBeforeUnload = () => {
      sessionStorage.removeItem('biometricVerified');
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, []);

  // Auto-verify if previous session had biometric verification
  useEffect(() => {
    const biometricVerified = sessionStorage.getItem('biometricVerified');
    if (biometricVerified === 'true' && onVerificationSuccess) {
      onVerificationSuccess();
    }
  }, [onVerificationSuccess]);

  const handleBiometricVerification = async () => {
    setError('');
    setLoading(true);

    try {
      // Check mobile device
      if (!isMobileDevice()) {
        setError('Biometric verification is only available on mobile devices');
        setLoading(false);
        return;
      }

      // Check biometric support
      if (!isBiometricSupported) {
        setError('Biometric not supported on this device.');
        setLoading(false);
        return;
      }

      const verified = await authenticateWithBiometric();

      if (verified) {
        // Store biometric verification in session (will be cleared on refresh)
        sessionStorage.setItem('biometricVerified', 'true');
        if (onVerificationSuccess) onVerificationSuccess();
      } else {
        setVerificationAttempts(prev => prev + 1);
        if (verificationAttempts + 1 >= MAX_ATTEMPTS) {
          setError(`Too many failed attempts. Please logout and try again.`);
        } else {
          setError(`Verification failed. Attempts: ${verificationAttempts + 1}/${MAX_ATTEMPTS}`);
        }
      }
    } catch (err) {
      console.error('Biometric error:', err);
      setVerificationAttempts(prev => prev + 1);
      if (verificationAttempts + 1 >= MAX_ATTEMPTS) {
        setError(`Too many failed attempts. Please logout and try again.`);
      } else {
        setError(`Error: ${err.message || 'Verification failed'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logoutUser();
      window.location.href = '/login';
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  const handleSkip = () => {
    // Allow access without biometric if support not available
    sessionStorage.setItem('biometricVerified', 'true');
    if (onVerificationSuccess) onVerificationSuccess();
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
          <h2 className="text-2xl font-bold text-white mb-2">Verify Your Identity</h2>
          <p className="text-gray-400 mb-6">
            {isBiometricSupported 
              ? 'Use your fingerprint or Face ID' 
              : 'Biometric not available'}
          </p>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-sm">{error}</p>
            </div>
          )}

          {/* Buttons */}
          {isBiometricSupported ? (
            <>
              <button
                onClick={handleBiometricVerification}
                disabled={loading || verificationAttempts >= MAX_ATTEMPTS}
                className="w-full bg-accent hover:bg-blue-600 disabled:opacity-50 text-white font-semibold py-3 rounded-lg mb-3 flex items-center justify-center gap-2"
              >
                <Fingerprint size={20} />
                {loading ? 'Verifying...' : 'Verify Biometric'}
              </button>
            </>
          ) : (
            <button
              onClick={handleSkip}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg mb-3"
            >
              Continue
            </button>
          )}

          {verificationAttempts >= MAX_ATTEMPTS && (
            <button
              onClick={handleSkip}
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-semibold py-2 rounded-lg mb-3"
            >
              Skip
            </button>
          )}

          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>

          <p className="text-xs text-gray-500 mt-6">Verification expires on page refresh</p>
        </div>
      </div>
    </div>
  );
};
