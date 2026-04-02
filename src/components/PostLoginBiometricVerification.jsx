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
  const MAX_ATTEMPTS = 2;

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
    setVerificationAttempts(prev => prev + 1);

    try {
      const verified = await authenticateWithBiometric();
      if (verified) {
        sessionStorage.setItem('biometricVerified', 'true');
        if (onVerificationSuccess) onVerificationSuccess();
      } else {
        setError('Biometric verification failed');
      }
    } catch (err) {
      console.error('Biometric error:', err);
      setError('Passkey not setup yet. Use Continue button instead.');
    } finally {
      setLoading(false);
    }
  };

  const handleContinue = () => {
    // Skip biometric and continue to app
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
            Optional: Secure your account with biometric or continue without it
          </p>

          {/* Error */}
          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg">
              <p className="text-red-400 text-xs">{error}</p>
            </div>
          )}

          {/* Continue Button (PRIMARY) */}
          <button
            onClick={handleContinue}
            className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 rounded-lg mb-3 transition-colors"
          >
            Continue to App
          </button>

          {/* Biometric Button (OPTIONAL) */}
          {isBiometricSupported && verificationAttempts < MAX_ATTEMPTS && (
            <button
              onClick={handleBiometricVerification}
              disabled={loading}
              className="w-full bg-accent/50 hover:bg-accent/70 disabled:opacity-50 text-white font-semibold py-2 rounded-lg flex items-center justify-center gap-2 transition-colors mb-3"
            >
              <Fingerprint size={16} />
              {loading ? 'Setting up...' : 'Add Biometric (Optional)'}
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
            Verification expires on page refresh. You can setup biometric later in Settings.
          </p>
        </div>
      </div>
    </div>
  );
};
