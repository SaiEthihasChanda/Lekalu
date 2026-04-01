import React, { useState } from 'react';
import { Fingerprint, Check, X, AlertCircle, Loader } from 'lucide-react';
import { setGoogleMFAStatus, registerGoogleMFABiometric, getGoogleMFAStatus } from '../fb/index.js';
import { registerBiometric, authenticateWithBiometric, isBiometricAvailable } from '../utils/webauthn.js';

/**
 * Google MFA Biometric Verification Component
 * Appears after Google login to optionally add biometric 2FA
 */
export const GoogleMFABiometric = ({ userId, email, onComplete, onSkip }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isSupportedDevice, setIsSupportedDevice] = useState(null);
  const [verificationMode, setVerificationMode] = useState('register'); // 'register' or 'verify'

  React.useEffect(() => {
    checkBiometricSupport();
  }, []);

  /**
   * Check if device supports biometric authentication
   */
  const checkBiometricSupport = async () => {
    try {
      const supported = await isBiometricAvailable();
      setIsSupportedDevice(supported);
    } catch (err) {
      setIsSupportedDevice(false);
    }
  };

  /**
   * Register biometric for Google MFA
   */
  const handleRegisterBiometric = async () => {
    setError('');
    setLoading(true);

    try {
      // Register biometric credential
      const credential = await registerBiometric(userId, email);

      // Save to Firebase
      if (credential.id && credential.response.publicKey) {
        await registerGoogleMFABiometric(credential.id, {
          alg: credential.response.publicKey.alg,
          type: credential.response.publicKey.type,
        });

        // Enable Google MFA
        await setGoogleMFAStatus(true);

        onComplete?.();
      }
    } catch (err) {
      const errorMsg = err.code === 'NotAllowedError'
        ? 'Biometric registration cancelled'
        : err.code === 'InvalidStateError'
        ? 'This credential already exists'
        : err.code === 'NotSupportedError'
        ? 'Biometric not supported on this device'
        : err.message || 'Failed to register biometric';
      setError(errorMsg);
    } finally {
      setLoading(false);
    }
  };

  /**
   * Skip biometric registration
   */
  const handleSkip = () => {
    onSkip?.();
  };

  if (isSupportedDevice === null) {
    return (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
        <div className="bg-secondary rounded-lg border border-gray-700 p-6 max-w-sm w-full">
          <div className="flex justify-center mb-4">
            <Loader size={32} className="text-accent animate-spin" />
          </div>
          <p className="text-center text-gray-300">Checking biometric support...</p>
        </div>
      </div>
    );
  }

  if (!isSupportedDevice) {
    return null; // Device doesn't support biometric
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-secondary rounded-lg border border-gray-700 p-8 max-w-sm w-full">
        {/* Header */}
        <div className="text-center mb-6">
          <Fingerprint size={48} className="mx-auto text-accent mb-3" />
          <h2 className="text-2xl font-bold text-white mb-2">Secure Your Account</h2>
          <p className="text-gray-400 text-sm">
            Add biometric authentication for Google login
          </p>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-gap-3">
            <AlertCircle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Benefits */}
        <div className="mb-6 space-y-3">
          <div className="flex items-center gap-3">
            <Check size={18} className="text-success flex-shrink-0" />
            <p className="text-gray-300 text-sm">Faster login with fingerprint/Face ID</p>
          </div>
          <div className="flex items-center gap-3">
            <Check size={18} className="text-success flex-shrink-0" />
            <p className="text-gray-300 text-sm">Extra layer of security</p>
          </div>
          <div className="flex items-center gap-3">
            <Check size={18} className="text-success flex-shrink-0" />
            <p className="text-gray-300 text-sm">Works on this device only</p>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Register Button */}
          <button
            onClick={handleRegisterBiometric}
            disabled={loading}
            className="w-full bg-accent hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <Loader size={18} className="animate-spin" />
                Registering...
              </>
            ) : (
              <>
                <Fingerprint size={18} />
                Register Biometric
              </>
            )}
          </button>

          {/* Skip Button */}
          <button
            onClick={handleSkip}
            disabled={loading}
            className="w-full bg-gray-700 hover:bg-gray-600 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <X size={18} />
            Skip for Now
          </button>
        </div>

        {/* Info */}
        <p className="text-xs text-gray-500 text-center mt-4">
          You can enable this later in Settings
        </p>
      </div>
    </div>
  );
};

/**
 * Google MFA Biometric Settings Component
 * Manage Google MFA biometric credentials
 */
export const GoogleMFASettings = () => {
  const [hasGoogleMFA, setHasGoogleMFA] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    loadGoogleMFAStatus();
  }, []);

  const loadGoogleMFAStatus = async () => {
    try {
      const status = await getGoogleMFAStatus();
      setHasGoogleMFA(status);
    } catch (err) {
      console.error('Error loading Google MFA status:', err);
    }
  };

  const handleDisableGoogleMFA = async () => {
    setError('');
    setLoading(true);

    try {
      await setGoogleMFAStatus(false);
      setHasGoogleMFA(false);
    } catch (err) {
      setError(err.message || 'Failed to disable Google MFA');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-secondary rounded-lg border border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
          <Fingerprint size={20} className="text-accent" />
          Google MFA Biometric
        </h3>
        <span className={`px-3 py-1 rounded text-xs font-semibold ${
          hasGoogleMFA
            ? 'bg-success/20 text-success border border-success/50'
            : 'bg-gray-600/20 text-gray-400 border border-gray-600/50'
        }`}>
          {hasGoogleMFA ? 'Enabled' : 'Disabled'}
        </span>
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
          <p className="text-red-400 text-sm">{error}</p>
        </div>
      )}

      <p className="text-gray-400 text-sm mb-4">
        {hasGoogleMFA
          ? 'Your Google account is protected with biometric authentication.'
          : 'Add biometric authentication to secure your Google login.'}
      </p>

      {hasGoogleMFA && (
        <button
          onClick={handleDisableGoogleMFA}
          disabled={loading}
          className="w-full bg-red-500/20 hover:bg-red-500/30 disabled:opacity-50 disabled:cursor-not-allowed text-red-400 font-semibold py-2 rounded-lg transition-colors"
        >
          {loading ? 'Disabling...' : 'Disable Google MFA'}
        </button>
      )}
    </div>
  );
};
