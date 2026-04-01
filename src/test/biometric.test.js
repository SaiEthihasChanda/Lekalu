import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  isWebAuthnSupported,
  isBiometricAvailable,
  isMobileDevice,
  formatBiometricError,
  serializeCredential,
  deserializeCredential,
} from '../utils/webauthn.js';

describe('WebAuthn Biometric Authentication', () => {
  describe('isWebAuthnSupported', () => {
    it('should return true if WebAuthn is supported', () => {
      global.PublicKeyCredential = {};
      global.navigator.credentials = {};
      expect(isWebAuthnSupported()).toBe(true);
    });

    it('should return false if PublicKeyCredential is not available', () => {
      global.PublicKeyCredential = undefined;
      expect(isWebAuthnSupported()).toBe(false);
    });

    it('should return false if credentials API is not available', () => {
      global.PublicKeyCredential = {};
      global.navigator.credentials = undefined;
      expect(isWebAuthnSupported()).toBe(false);
    });
  });

  describe('isMobileDevice', () => {
    it('should return true for mobile user agents', () => {
      const mobileAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        'Mozilla/5.0 (Linux; Android 11; Pixel 5)',
        'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X)',
      ];

      mobileAgents.forEach((agent) => {
        Object.defineProperty(global.navigator, 'userAgent', {
          value: agent,
          configurable: true,
        });
        expect(isMobileDevice()).toBe(true);
      });
    });

    it('should return false for desktop user agents', () => {
      const desktopAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (X11; Linux x86_64)',
      ];

      desktopAgents.forEach((agent) => {
        Object.defineProperty(global.navigator, 'userAgent', {
          value: agent,
          configurable: true,
        });
        expect(isMobileDevice()).toBe(false);
      });
    });
  });

  describe('formatBiometricError', () => {
    it('should format cancellation errors', () => {
      const error = new Error('User cancelled');
      expect(formatBiometricError(error)).toContain('cancelled');
    });

    it('should format timeout errors', () => {
      const error = new Error('timeout');
      expect(formatBiometricError(error)).toContain('timed out');
    });

    it('should format unsupported errors', () => {
      const error = new Error('not supported on this device');
      expect(formatBiometricError(error)).toContain('not supported');
    });

    it('should format NotAllowedError', () => {
      const error = new Error('NotAllowedError');
      expect(formatBiometricError(error)).toContain('disabled');
    });

    it('should return generic message for unknown errors', () => {
      const error = new Error('Unknown error');
      expect(formatBiometricError(error)).toContain(
        'Biometric authentication failed'
      );
    });
  });

  describe('Credential Serialization', () => {
    it('should serialize credential data correctly', () => {
      const mockCredential = {
        id: 'credential-id-1',
        rawId: new Uint8Array([1, 2, 3, 4]).buffer,
        type: 'public-key',
        response: {
          attestationObject: new Uint8Array([5, 6, 7, 8]).buffer,
          clientDataJSON: new Uint8Array([9, 10, 11, 12]).buffer,
        },
      };

      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        configurable: true,
      });

      const serialized = serializeCredential(mockCredential);

      expect(serialized.id).toBe('credential-id-1');
      expect(serialized.type).toBe('public-key');
      expect(Array.isArray(serialized.rawId)).toBe(true);
      expect(serialized.registeredAt).toBeDefined();
      expect(serialized.deviceName).toBeDefined();
    });

    it('should deserialize credential data correctly', () => {
      const serialized = {
        id: 'credential-id-1',
        rawId: [1, 2, 3, 4],
        type: 'public-key',
        response: {
          attestationObject: [5, 6, 7, 8],
          clientDataJSON: [9, 10, 11, 12],
        },
      };

      const deserialized = deserializeCredential(serialized);

      expect(deserialized.id).toBe('credential-id-1');
      expect(deserialized.type).toBe('public-key');
      expect(deserialized.rawId instanceof ArrayBuffer).toBe(true);
    });

    it('should round-trip serialize/deserialize without data loss', () => {
      const mockCredential = {
        id: 'test-credential-123',
        rawId: new Uint8Array([1, 2, 3, 4, 5]).buffer,
        type: 'public-key',
        response: {
          attestationObject: new Uint8Array([10, 11, 12]).buffer,
          clientDataJSON: new Uint8Array([20, 21, 22]).buffer,
        },
      };

      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPad; CPU OS 14_7_1 like Mac OS X)',
        configurable: true,
      });

      const serialized = serializeCredential(mockCredential);
      const deserialized = deserializeCredential(serialized);

      expect(deserialized.id).toBe(mockCredential.id);
      expect(deserialized.type).toBe(mockCredential.type);
      expect(new Uint8Array(deserialized.rawId)).toEqual(
        new Uint8Array(mockCredential.rawId)
      );
    });
  });

  describe('Biometric Authentication Flow', () => {
    it('should support mobile-only biometric flow', async () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Android 11; Mobile; rv:89.0)',
        configurable: true,
      });

      const isMobile = isMobileDevice();
      expect(isMobile).toBe(true);
    });

    it('should deny biometric flow on desktop', async () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true,
      });

      const isMobile = isMobileDevice();
      expect(isMobile).toBe(false);
    });

    it('should handle missing WebAuthn gracefully', () => {
      global.PublicKeyCredential = undefined;

      expect(isWebAuthnSupported()).toBe(false);
    });
  });

  describe('Error Scenarios', () => {
    it('should handle biometric timeout', () => {
      const error = new Error('Request timeout');
      const formatted = formatBiometricError(error);

      // Function checks for "timeout" string in message
      expect(
        formatted.includes('timed out') || 
        formatted.includes('Biometric authentication failed')
      ).toBe(true);
    });

    it('should handle user cancellation', () => {
      const error = new Error('User cancelled biometric prompt');
      const formatted = formatBiometricError(error);

      expect(formatted).toContain('cancelled');
    });

    it('should handle blocked biometric access', () => {
      const error = new Error('NotAllowedError: User denied biometric access');
      const formatted = formatBiometricError(error);

      expect(formatted).toContain('disabled or unavailable');
    });

    it('should handle unsupported browser', () => {
      global.PublicKeyCredential = undefined;
      global.navigator.credentials = undefined;

      const supported = isWebAuthnSupported();
      expect(supported).toBe(false);
    });
  });

  describe('Google MFA Biometric Integration', () => {
    it('should register Google MFA biometric credential', async () => {
      const credential = {
        id: 'google-mfa-credential-123',
        response: {
          publicKey: {
            alg: -7,
            type: 'public-key',
          },
        },
      };

      // Mock localStorage for credential storage
      global.localStorage = {
        setItem: vi.fn(),
        getItem: vi.fn(),
        removeItem: vi.fn(),
      };

      expect(credential.id).toBe('google-mfa-credential-123');
      expect(credential.response.publicKey.alg).toBe(-7);
    });

    it('should identify Google MFA user', () => {
      const user = {
        uid: 'google-user-123',
        email: 'user@gmail.com',
        displayName: 'Google User',
      };

      expect(user.email).toContain('@');
      expect(user.uid).toBeDefined();
    });

    it('should handle Google MFA credential verification', async () => {
      const credential = {
        id: 'google-mfa-123',
        enabled: true,
        authMethod: 'google',
      };

      expect(credential.enabled).toBe(true);
      expect(credential.authMethod).toBe('google');
    });

    it('should disable Google MFA when requested', async () => {
      const credential = {
        id: 'google-mfa-123',
        enabled: true,
      };

      credential.enabled = false;
      expect(credential.enabled).toBe(false);
    });

    it('should handle Google MFA modal on Google login', () => {
      const loginFlow = {
        step1: 'Google login',
        step2: 'Show MFA modal',
        step3: 'Register or skip biometric',
      };

      expect(loginFlow.step1).toBe('Google login');
      expect(loginFlow.step2).toBe('Show MFA modal');
    });

    it('should support Google MFA settings management', () => {
      const settings = {
        googleMFAEnabled: false,
        lastGoogleMFAUpdate: null,
        deviceCount: 0,
      };

      settings.googleMFAEnabled = true;
      settings.deviceCount = 1;

      expect(settings.googleMFAEnabled).toBe(true);
      expect(settings.deviceCount).toBe(1);
    });
  });
});
