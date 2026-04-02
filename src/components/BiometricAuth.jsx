import React, { useState, useEffect } from 'react';
import { Fingerprint, Loader } from 'lucide-react';
import { isMobileDevice, isBiometricAvailable } from '../utils/webauthn.js';

/**
 * BiometricLoginButton Component
 * Shows biometric login option on mobile devices
 * @param {Function} onBiometricLogin - Callback when biometric auth succeeds
 * @param {Function} onBiometricRegister - Callback to register new biometric
 * @param {boolean} isLoading - Loading state
 * @param {string} error - Error message
 */
export const BiometricLoginButton = ({
  onBiometricLogin,
  onBiometricRegister = null,
  isLoading = false,
  error = null,
  hasBiometric = false,
  className = '',
}) => {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [showBiometric, setShowBiometric] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const isMobile = isMobileDevice();
      const isAvailable = await isBiometricAvailable();
      setIsBiometricSupported(isMobile && isAvailable);
      setShowBiometric(isMobile && isAvailable && hasBiometric);
    };

    checkSupport();
  }, [hasBiometric]);

  if (!showBiometric) {
    return null;
  }

  return (
    <div className={`mb-4 ${className}`}>
      <button
        onClick={onBiometricLogin}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-accent hover:bg-[#3370cc] text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        title="Use fingerprint or Face ID to login"
      >
        {isLoading ? (
          <>
            <Loader size={20} className="animate-spin" />
            <span>Authenticating...</span>
          </>
        ) : (
          <>
            <Fingerprint size={20} />
            <span>Login with Biometric</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-red-400 text-sm mt-2 text-center">{error}</p>
      )}
    </div>
  );
};

/**
 * BiometricRegistrationButton Component
 * Shows option to register biometric authentication
 * Used after successful password login
 * @param {Function} onRegister - Callback when biometric registration succeeds
 * @param {boolean} isLoading - Loading state
 * @param {string} error - Error message
 */
export const BiometricRegistrationButton = ({
  onRegister,
  isLoading = false,
  error = null,
  className = '',
}) => {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const isMobile = isMobileDevice();
      const isAvailable = await isBiometricAvailable();
      setIsBiometricSupported(isMobile && isAvailable);
    };

    checkSupport();
  }, []);

  if (!isBiometricSupported) {
    return null;
  }

  return (
    <div className={`mb-4 ${className}`}>
      <p className="text-gray-400 text-sm mb-2">
        Enable biometric login for faster access
      </p>
      <button
        onClick={onRegister}
        disabled={isLoading}
        className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-secondary border border-gray-700 hover:border-accent text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {isLoading ? (
          <>
            <Loader size={18} className="animate-spin" />
            <span>Setting up...</span>
          </>
        ) : (
          <>
            <Fingerprint size={18} />
            <span>Enable Biometric Login</span>
          </>
        )}
      </button>

      {error && (
        <p className="text-red-400 text-sm mt-2">{error}</p>
      )}
    </div>
  );
};

/**
 * BiometricSettings Component
 * Shows registered biometric credentials and management options
 * @param {Array} credentials - List of registered credentials
 * @param {Function} onRemove - Callback to remove a credential
 * @param {Function} onRegister - Callback to register new biometric
 * @param {boolean} isLoading - Loading state
 */
export const BiometricSettings = ({
  credentials = [],
  onRemove,
  onRegister,
  isLoading = false,
}) => {
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const checkSupport = async () => {
      const isMobile = isMobileDevice();
      const isAvailable = await isBiometricAvailable();
      setIsBiometricSupported(isMobile && isAvailable);
    };

    checkSupport();
  }, []);

  if (!isBiometricSupported) {
    return null;
  }

  const handleRegisterClick = async () => {
    setIsRegistering(true);
    try {
      if (onRegister) {
        await onRegister();
      }
    } finally {
      setIsRegistering(false);
    }
  };

  return (
    <div className="bg-primary border border-accent/30 rounded-lg p-4">
      <div className="flex items-start gap-3 mb-4">
        <Fingerprint size={20} className="text-accent flex-shrink-0 mt-0.5" />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-white mb-1">Biometric Settings</h3>
          <p className="text-sm text-gray-400">
            {credentials.length === 0
              ? 'Set up fingerprint or Face ID for faster, more secure login'
              : `${credentials.length} biometric device${credentials.length !== 1 ? 's' : ''} registered`}
          </p>
        </div>
      </div>

      {credentials.length === 0 ? (
        <button
          onClick={handleRegisterClick}
          disabled={isRegistering || isLoading}
          className="w-full bg-accent hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
        >
          {isRegistering ? (
            <>
              <Loader size={18} className="animate-spin" />
              <span>Setting up...</span>
            </>
          ) : (
            <>
              <Fingerprint size={18} />
              <span>Add Biometric</span>
            </>
          )}
        </button>
      ) : (
        <div className="space-y-2">
          {credentials.map((credential) => (
            <div
              key={credential.id}
              className="flex items-center justify-between p-3 bg-secondary rounded border border-gray-700"
            >
              <div className="flex items-center gap-2">
                <Fingerprint size={18} className="text-accent" />
                <div>
                  <p className="text-white text-sm font-medium">
                    {credential.deviceName || 'Biometric Device'}
                  </p>
                  <p className="text-gray-400 text-xs">
                    Registered{' '}
                    {credential.registeredAt
                      ? new Date(credential.registeredAt).toLocaleDateString()
                      : 'Recently'}
                  </p>
                </div>
              </div>

              <button
                onClick={() => onRemove(credential.id)}
                disabled={isLoading}
                className="px-3 py-1 text-red-400 hover:text-red-300 text-sm font-semibold transition-colors disabled:opacity-50"
              >
                Remove
              </button>
            </div>
          ))}

          <button
            onClick={handleRegisterClick}
            disabled={isRegistering || isLoading}
            className="w-full mt-3 bg-secondary border border-accent/30 hover:border-accent text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {isRegistering ? (
              <>
                <Loader size={18} className="animate-spin" />
                <span>Adding...</span>
              </>
            ) : (
              <>
                <Fingerprint size={18} />
                <span>Add Another Device</span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};
