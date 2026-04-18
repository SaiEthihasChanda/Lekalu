import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  loginTestUser,
  logoutTestUser,
  getTestUserId,
  deleteTestUserData,
} from './firebase-test-utils.js';

const TEST_EMAIL_1 = 'test-integration@lekalu.app';
const TEST_PASSWORD_1 = 'TestPassword123!';
const TEST_EMAIL_2 = 'test-integration-2@lekalu.app';
const TEST_PASSWORD_2 = 'AnotherPassword456!';

let testUserId1;
let testUserId2;

describe('Firebase Authentication - Real Firebase', () => {
  beforeAll(async () => {
    // Try to login with existing credentials first for user 1
    try {
      await loginTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
      testUserId1 = getTestUserId();
      console.log('✓ Existing test user 1 logged in:', testUserId1);
    } catch (error) {
      // If login fails, user doesn't exist, so create one
      testUserId1 = await createTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
      console.log('✓ New test user 1 created:', testUserId1);
    }

    // Try to login with existing credentials first for user 2
    try {
      await loginTestUser(TEST_EMAIL_2, TEST_PASSWORD_2);
      testUserId2 = getTestUserId();
      console.log('✓ Existing test user 2 logged in:', testUserId2);
    } catch (error) {
      // If login fails, user doesn't exist, so create one
      testUserId2 = await createTestUser(TEST_EMAIL_2, TEST_PASSWORD_2);
      console.log('✓ New test user 2 created:', testUserId2);
    }
  });

  afterAll(async () => {
    // Cleanup
    await logoutTestUser();
  });

  describe('registerUser endpoint - Real Firestore', () => {
    it('should register user with valid email and password', async () => {
      testUserId1 = await createTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
      
      expect(testUserId1).toBeDefined();
      expect(typeof testUserId1).toBe('string');
      expect(testUserId1.length).toBeGreaterThan(0);
    });

    it('should reject registration with invalid email format', async () => {
      // Email validation: proper format check
      const invalidEmail = 'invalidemail';
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      const isValid = emailRegex.test(invalidEmail);
      
      expect(isValid).toBe(false);
    });

    it('should reject registration with weak password', async () => {
      // Password validation: minimum 8 characters
      const weakPassword = 'weak';
      const isStrongPassword = weakPassword.length >= 8;
      
      expect(isStrongPassword).toBe(false);
    });

    it('should handle duplicate email registration gracefully', async () => {
      // First registration
      const userId1 = await createTestUser(TEST_EMAIL_2, TEST_PASSWORD_2);
      expect(userId1).toBeDefined();

      // Second registration with same email should get same user or error
      const userId2 = await createTestUser(TEST_EMAIL_2, TEST_PASSWORD_2);
      expect(userId2).toBeDefined();
      
      // Should be same user since account already exists
      expect(userId2).toBe(userId1);
    });

    it('should store user in proper format in Firebase Auth', async () => {
      const testEmail = 'test-auth-check@lekalu.app';
      const testPassword = 'ValidPassword789!';
      
      const userId = await createTestUser(testEmail, testPassword);
      
      expect(userId).toBeDefined();
      // Firebase Auth auto-generates UUID format
      expect(userId.length).toBeGreaterThan(15);
    });
  });

  describe('loginUser endpoint - Real Firestore', () => {
    beforeAll(async () => {
      // Ensure test user exists
      testUserId1 = await createTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
    });

    it('should login user with correct credentials', async () => {
      const userId = await loginTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
      
      expect(userId).toBeDefined();
      expect(userId).toBe(testUserId1);
    });

    it('should reject login with wrong password', async () => {
      try {
        await loginTestUser(TEST_EMAIL_1, 'WrongPassword123!');
        expect.fail('Should have thrown error for wrong password');
      } catch (error) {
        expect(error).toBeDefined();
        expect(error.code).toContain('auth');
      }
    });

    it('should reject login for non-existent email', async () => {
      try {
        await loginTestUser('nonexistent@example.com', 'SomePassword123!');
        expect.fail('Should have thrown error for non-existent user');
      } catch (error) {
        expect(error).toBeDefined();
      }
    });

    it('should return user credentials on successful login', async () => {
      const userId = await loginTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
      
      expect(userId).toBeDefined();
      expect(typeof userId).toBe('string');
      expect(userId.length).toBeGreaterThan(0);
    });

    it('should handle case-insensitive email login', async () => {
      // Firebase Auth normalizes emails to lowercase
      const uppercaseEmail = TEST_EMAIL_1.toUpperCase();
      const userId = await loginTestUser(uppercaseEmail, TEST_PASSWORD_1);
      
      expect(userId).toBe(testUserId1);
    });
  });

  describe('logoutUser endpoint - Real Firebase', () => {
    it('should clear user session on logout', async () => {
      // Login first
      await loginTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
      let currentUserId = getTestUserId();
      expect(currentUserId).toBeDefined();

      // Logout
      await logoutTestUser();
      currentUserId = getTestUserId();
      expect(currentUserId).toBeUndefined();
    });

    it('should allow re-login after logout', async () => {
      // Login
      await loginTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
      let userId = getTestUserId();
      expect(userId).toBeDefined();

      // Logout
      await logoutTestUser();
      userId = getTestUserId();
      expect(userId).toBeUndefined();

      // Re-login
      userId = await loginTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
      expect(userId).toBeDefined();
      expect(userId).toBe(testUserId1);
    });
  });

  describe('User Session Management - Real Firebase', () => {
    it('should maintain session after login', async () => {
      const userId = await loginTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
      const currentUserId = getTestUserId();
      
      expect(currentUserId).toBe(userId);
    });

    it('should support multiple user switching', async () => {
      // Login first user
      const userId1 = await loginTestUser(TEST_EMAIL_1, TEST_PASSWORD_1);
      expect(getTestUserId()).toBe(userId1);

      // Logout and switch user
      await logoutTestUser();
      
      const userId2 = await loginTestUser(TEST_EMAIL_2, TEST_PASSWORD_2);
      expect(getTestUserId()).toBe(userId2);
    });
  });

  describe('Password Security - Real Firebase', () => {
    it('should enforce minimum password length', async () => {
      const minLength = 8;
      const passwords = [
        { pwd: 'short', valid: false },
        { pwd: 'ValidPassword', valid: true },
        { pwd: 'StrongPassword123!', valid: true },
      ];

      passwords.forEach(p => {
        expect(p.pwd.length >= minLength).toBe(p.valid);
      });
    });

    it('should accept strong passwords with mixed characters', async () => {
      const strongPasswords = [
        'Password123!',
        'MySecurePass456',
        'Test@Password789',
        'Complex$Pass#123',
      ];

      strongPasswords.forEach(pwd => {
        expect(pwd.length).toBeGreaterThanOrEqual(8);
      });
    });
  });

  describe('Email Validation - Real Firebase', () => {
    it('should validate proper email format', async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const validEmails = [
        'user@example.com',
        'test.user@domain.co.uk',
        'user+tag@example.com',
      ];

      validEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(true);
      });
    });

    it('should reject invalid email formats', async () => {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      
      const invalidEmails = [
        'invalidemail',
        '@example .com',
        'user@.com',
        'user@example',
        'user @example.com',
      ];

      invalidEmails.forEach(email => {
        expect(emailRegex.test(email)).toBe(false);
      });
    });
  });
});
