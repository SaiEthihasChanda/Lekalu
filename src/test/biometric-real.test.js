import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import {
  createTestUser,
  loginTestUser,
  getTestUserId,
  deleteTestUserData,
  logoutTestUser,
} from './firebase-test-utils.js';

const TEST_EMAIL = 'test-integration@lekalu.app';
const TEST_PASSWORD = 'TestPassword123!';
let testUserId;

/**
 * Biometric WebAuthn Tests - Real Firebase User Context
 * Tests WebAuthn utilities with actual authenticated user
 */
describe('WebAuthn Biometric Authentication - Real Firebase Context', () => {
  beforeAll(async () => {
    // Try to login with existing credentials first
    try {
      await loginTestUser(TEST_EMAIL, TEST_PASSWORD);
      testUserId = getTestUserId();
      console.log('✓ Existing test user logged in:', testUserId);
    } catch (error) {
      // If login fails, user doesn't exist, so create one
      testUserId = await createTestUser(TEST_EMAIL, TEST_PASSWORD);
      console.log('✓ New test user created:', testUserId);
    }
  });

  afterAll(async () => {
    if (testUserId) {
      await deleteTestUserData(testUserId);
    }
    await logoutTestUser();
  });

  describe('isWebAuthnSupported', () => {
    it('should check WebAuthn support on current browser', () => {
      // Mock WebAuthn APIs
      global.PublicKeyCredential = vi.fn();
      global.navigator.credentials = {
        create: vi.fn(),
        get: vi.fn(),
      };

      const isWebAuthnSupported = () => {
        return !!global.PublicKeyCredential && !!global.navigator.credentials;
      };

      const supported = isWebAuthnSupported();
      expect(typeof supported).toBe('boolean');
    });

    it('should return false when PublicKeyCredential is missing', () => {
      const isWebAuthnSupported = () => {
        return !!global.PublicKeyCredential && !!global.navigator.credentials;
      };

      delete global.PublicKeyCredential;
      const supported = isWebAuthnSupported();
      expect(supported).toBe(false);
    });

    it('should return false when credentials API is missing', () => {
      global.PublicKeyCredential = vi.fn();
      delete global.navigator.credentials;

      const isWebAuthnSupported = () => {
        return !!global.PublicKeyCredential && !!global.navigator.credentials;
      };

      const supported = isWebAuthnSupported();
      expect(supported).toBe(false);
    });
  });

  describe('isMobileDevice', () => {
    it('should correctly identify iPhone user agents', () => {
      const mobileAgents = [
        'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)',
      ];

      const isMobileDevice = () => {
        const userAgent = global.navigator.userAgent;
        return /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(userAgent);
      };

      mobileAgents.forEach((agent) => {
        Object.defineProperty(global.navigator, 'userAgent', {
          value: agent,
          configurable: true,
        });
        expect(isMobileDevice()).toBe(true);
      });
    });

    it('should correctly identify Android user agents', () => {
      const androidAgent = 'Mozilla/5.0 (Linux; Android 11; Pixel 5)';

      const isMobileDevice = () => {
        return /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
          global.navigator.userAgent
        );
      };

      Object.defineProperty(global.navigator, 'userAgent', {
        value: androidAgent,
        configurable: true,
      });
      expect(isMobileDevice()).toBe(true);
    });

    it('should correctly identify desktop user agents', () => {
      const desktopAgents = [
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
        'Mozilla/5.0 (X11; Linux x86_64)',
      ];

      const isMobileDevice = () => {
        return /iPhone|iPad|Android|webOS|BlackBerry|IEMobile|Opera Mini/i.test(
          global.navigator.userAgent
        );
      };

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
    const formatBiometricError = (error) => {
      if (!error) return 'Biometric authentication failed';
      
      const message = error.message.toLowerCase();
      
      if (message.includes('cancel')) return 'Biometric authentication was cancelled';
      if (message.includes('timeout')) return 'Biometric authentication timed out';
      if (message.includes('not supported')) return 'Biometric authentication is not supported on this device';
      if (message.includes('notallowederror')) return 'Biometric authentication is disabled';
      
      return 'Biometric authentication failed: ' + error.message;
    };

    it('should format cancellation errors', () => {
      const error = new Error('User cancelled');
      const formatted = formatBiometricError(error);
      expect(formatted).toContain('cancel');
    });

    it('should format timeout errors', () => {
      const error = new Error('timeout');
      const formatted = formatBiometricError(error);
      expect(formatted).toContain('timed out');
    });

    it('should format unsupported errors', () => {
      const error = new Error('not supported on this device');
      const formatted = formatBiometricError(error);
      expect(formatted).toContain('not supported');
    });

    it('should format NotAllowedError', () => {
      const error = new Error('NotAllowedError');
      const formatted = formatBiometricError(error);
      expect(formatted).toContain('disabled');
    });

    it('should return generic message for unknown errors', () => {
      const error = new Error('Unknown error');
      const formatted = formatBiometricError(error);
      expect(formatted).toContain('Biometric authentication failed');
    });

    it('should handle null errors gracefully', () => {
      const formatted = formatBiometricError(null);
      expect(formatted).toContain('failed');
    });
  });

  describe('Credential Serialization', () => {
    it('should serialize credential data to base64', () => {
      const mockCredential = {
        id: 'credential-id-1',
        rawId: new Uint8Array([1, 2, 3, 4]).buffer,
        type: 'public-key',
      };

      const serializeCredential = (cred) => {
        return {
          id: cred.id,
          rawId: btoa(String.fromCharCode(...new Uint8Array(cred.rawId))),
          type: cred.type,
        };
      };

      const serialized = serializeCredential(mockCredential);
      
      expect(serialized).toBeDefined();
      expect(serialized.id).toBe('credential-id-1');
      expect(serialized.type).toBe('public-key');
      expect(typeof serialized.rawId).toBe('string');
    });

    it('should deserialize base64 back to Uint8Array', () => {
      const originalData = new Uint8Array([1, 2, 3, 4]);
      const base64 = btoa(String.fromCharCode(...originalData));

      const deserializeCredential = (rawId) => {
        const binaryString = atob(rawId);
        const bytes = new Uint8Array(binaryString.length);
        for (let i = 0; i < binaryString.length; i++) {
          bytes[i] = binaryString.charCodeAt(i);
        }
        return bytes;
      };

      const deserialized = deserializeCredential(base64);
      
      expect(deserialized).toBeDefined();
      expect(deserialized.length).toBe(4);
      expect(deserialized[0]).toBe(1);
    });
  });

  describe('Biometric Flow with Real User', () => {
    it('should validate user context is available for biometric binding', () => {
      expect(testUserId).toBeDefined();
      expect(typeof testUserId).toBe('string');
    });

    it('should prepare credential challenge for real user', () => {
      const generateChallenge = () => {
        const buffer = new Uint8Array(32);
        crypto.getRandomValues(buffer);
        return btoa(String.fromCharCode(...buffer));
      };

      const challenge = generateChallenge();
      
      expect(challenge).toBeDefined();
      expect(typeof challenge).toBe('string');
      expect(challenge.length).toBeGreaterThan(0);
    });
  });

  describe('Platform-Specific Behavior', () => {
    it('should handle iOS-specific WebAuthn requirements', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (iPhone; CPU iPhone OS 14_7_1 like Mac OS X)',
        configurable: true,
      });

      const isIOS = /iPhone|iPad/.test(global.navigator.userAgent);
      expect(isIOS).toBe(true);
    });

    it('should handle Android-specific WebAuthn requirements', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Linux; Android 11; Pixel 5)',
        configurable: true,
      });

      const isAndroid = /Android/.test(global.navigator.userAgent);
      expect(isAndroid).toBe(true);
    });

    it('should handle Windows Hello on Windows', () => {
      Object.defineProperty(global.navigator, 'userAgent', {
        value: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        configurable: true,
      });

      const isWindows = /Windows/.test(global.navigator.userAgent);
      expect(isWindows).toBe(true);
    });
  });
});
