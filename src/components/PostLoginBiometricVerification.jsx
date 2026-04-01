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
    if (biometricVerified === 'true') {
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
        return;
      }

      // Check biometric support
      if (!isBiometricSupported) {
        setError('Biometric authentication not available on this device');
        return;
      }

      const verified = await authenticateWithBiometric();

      if (verified) {
        // Store biometric verification in session (will be cleared on refresh)
        sessionStorage.setItem('biometricVerified', 'true');
        onVerificationSuccess();
      } else {
        setVerificationAttempts(prev => prev + 1);
        if (verificationAttempts + 1 >= MAX_ATTEMPTS) {
          setError(`Too many failed attempts. Logging out for security.`);
          setTimeout(() => {
            logoutUser();
            window.location.href = '/login';
          }, 2000);
        } else {
          setError(`Biometric verification failed. Attempts remaining: ${MAX_ATTEMPTS - verificationAttempts - 1}`);
        }
      }
    } catch (err) {
      console.error('Biometric verification error:', err);
      setVerificationAttempts(prev => prev + 1);
      if (verificationAttempts + 1 >= MAX_ATTEMPTS) {
        setError(`Too many failed attempts. Logging out for security.`);
        setTimeout(() => {
          logoutUser();
          window.location.href = '/login';
        }, 2000);
      } else {
        setError(`Verification error: ${err.message || 'Please try again'}`);
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

  return (
    <div className="fixed inset-0 bg-primary flex items-center justify-center p-4 z-50">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-secondary rounded-lg border border-gray-700 p-8 text-center">
          {/* Icon */}
          <div className="mb-6 flex justify-center">
            <div className="p-4 bg-accent/10 rounded-full">
              <Fingerprint size={48} className="text-accent" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-2xl font-bold text-white mb-2">
            Verify Your Identity
          </h2>
          <p className="text-gray-400 mb-6">
            Use your fingerprint or Face ID to access the app
          </p>

          {/* Error Message */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-gap-3">
              <AlertCircle size={20} className="text-red-500 flex-shrink-0" />
              <p className="text-red-400 text-sm text-left">{error}</p>
            </div>
          )}

          {/* Attempt Counter */}
          {verificationAttempts > 0 && (
            <div className="mb-4 text-sm text-gray-400">
              Attempts: {verificationAttempts}/{MAX_ATTEMPTS}
            </div>
          )}

          {/* Biometric Button */}
          <button
            onClick={handleBiometricVerification}
            disabled={loading || verificationAttempts >= MAX_ATTEMPTS}
            className="w-full bg-accent hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors mb-3 flex items-center justify-center gap-2"
          >
            <Fingerprint size={20} />
            {loading ? 'Verifying...' : 'Verify with Biometric'}
          </button>

          {/* Logout Button */}
          <button
            onClick={handleLogout}
            className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-2 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <LogOut size={18} />
            Logout
          </button>

          {/* Info */}
          <p className="text-xs text-gray-500 mt-6">
            This verification expires when you refresh or leave the page. You'll need to authenticate again.
          </p>
        </div>
      </div>
    </div>
  );
};
