/**
 * WebAuthn/FIDO2 Biometric Authentication Utilities
 * Handles fingerprint and Face ID authentication on mobile and desktop
 */

/**
 * Check if WebAuthn is supported on current device/browser
 * @returns {boolean}
 */
export const isWebAuthnSupported = () => {
  return (
    window.PublicKeyCredential !== undefined &&
    navigator.credentials !== undefined
  );
};

/**
 * Check if device has biometric capability (mobile specific)
 * @returns {Promise<boolean>}
 */
export const isBiometricAvailable = async () => {
  if (!isWebAuthnSupported()) return false;
  
  try {
    // Check if device has any biometric capability
    return await PublicKeyCredential.isUserVerifyingPlatformAuthenticatorAvailable();
  } catch (error) {
    console.error('Biometric check failed:', error);
    return false;
  }
};

/**
 * Register a new biometric credential (fingerprint or Face ID)
 * @param {string} userId - User's Firebase UID
 * @param {string} email - User's email
 * @returns {Promise<PublicKeyCredential>}
 */
export const registerBiometric = async (userId, email) => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn not supported on this device');
  }

  try {
    // Challenge should come from server in production
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const credential = await navigator.credentials.create({
      publicKey: {
        challenge,
        rp: {
          name: 'Lekalu',
          id: window.location.hostname,
        },
        user: {
          id: new TextEncoder().encode(userId),
          name: email,
          displayName: email,
        },
        pubKeyCredParams: [
          { alg: -7, type: 'public-key' },  // ES256
          { alg: -257, type: 'public-key' }, // RS256
        ],
        authenticatorSelection: {
          authenticatorAttachment: 'platform', // Use device's built-in biometric
          userVerification: 'preferred',
          residentKey: 'preferred',
        },
        timeout: 60000,
        attestation: 'direct',
      },
    });

    if (!credential) {
      throw new Error('Biometric registration cancelled');
    }

    return credential;
  } catch (error) {
    console.error('Biometric registration failed:', error);
    throw error;
  }
};

/**
 * Authenticate using biometric credential
 * Verifies against credentials stored in localStorage
 * @param {string} userId - User's Firebase UID (required to look up stored credentials)
 * @returns {Promise<PublicKeyCredential>}
 */
export const authenticateWithBiometric = async (userId) => {
  if (!isWebAuthnSupported()) {
    throw new Error('WebAuthn not supported on this device');
  }

  try {
    // Get stored credentials for this user
    const storedCredentials = JSON.parse(
      localStorage.getItem(`biometricCredentials_${userId}`) || '[]'
    );

    if (storedCredentials.length === 0) {
      throw new Error('No biometric credentials registered for this user');
    }

    // Convert stored credential IDs back to Uint8Array format
    const allowCredentials = storedCredentials.map(cred => ({
      type: 'public-key',
      id: new Uint8Array(cred.rawId),
      transports: ['internal'], // Use internal authenticator (fingerprint/face)
    }));

    console.log('[WebAuthn] Retrieved stored credentials, count:', allowCredentials.length);

    // Challenge should come from server in production
    const challenge = new Uint8Array(32);
    crypto.getRandomValues(challenge);

    const assertion = await navigator.credentials.get({
      publicKey: {
        challenge,
        allowCredentials,
        timeout: 60000,
        userVerification: 'preferred',
      },
    });

    if (!assertion) {
      throw new Error('Biometric authentication cancelled');
    }

    console.log('[WebAuthn] Biometric authentication successful');
    return assertion;
  } catch (error) {
    console.error('[WebAuthn] Biometric authentication failed:', error);
    throw error;
  }
};

/**
 * Store biometric credential metadata in Firestore
 * Used to remember device for future authentication
 * @param {Object} credentialData
 * @returns {Object} Serializable credential metadata
 */
export const serializeCredential = (credentialData) => {
  return {
    id: credentialData.id,
    rawId: Array.from(new Uint8Array(credentialData.rawId)),
    type: credentialData.type,
    response: {
      attestationObject: Array.from(
        new Uint8Array(credentialData.response.attestationObject)
      ),
      clientDataJSON: Array.from(
        new Uint8Array(credentialData.response.clientDataJSON)
      ),
    },
    registeredAt: new Date().toISOString(),
    deviceName: `${navigator.userAgent.split('/')[0]} Device`,
  };
};

/**
 * Convert stored credential back to usable format
 * @param {Object} storedCredential
 * @returns {Object}
 */
export const deserializeCredential = (storedCredential) => {
  return {
    id: storedCredential.id,
    rawId: new Uint8Array(storedCredential.rawId).buffer,
    type: storedCredential.type,
    response: {
      attestationObject: new Uint8Array(
        storedCredential.response.attestationObject
      ).buffer,
      clientDataJSON: new Uint8Array(
        storedCredential.response.clientDataJSON
      ).buffer,
    },
  };
};

/**
 * Check if current browser/device is mobile
 * Used to decide whether to prompt for biometric auth
 * @returns {boolean}
 */
export const isMobileDevice = () => {
  const userAgent = navigator.userAgent.toLowerCase();
  return /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(
    userAgent
  );
};

/**
 * Format error message for user display
 * @param {Error} error
 * @returns {string}
 */
export const formatBiometricError = (error) => {
  if (error.message.includes('cancelled')) {
    return 'Biometric authentication cancelled';
  }
  if (error.message.includes('timeout')) {
    return 'Biometric authentication timed out. Please try again.';
  }
  if (error.message.includes('not supported')) {
    return 'Biometric authentication is not supported on this device';
  }
  if (error.message.includes('NotAllowedError')) {
    return 'Biometric authentication is disabled or unavailable';
  }
  return 'Biometric authentication failed. Please use password login.';
};
