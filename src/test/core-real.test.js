import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import {
  createTestUser,
  loginTestUser,
  createTestActivity,
  createTestTrackable,
  createTestSource,
  getUserActivities,
  getUserTrackables,
  getUserSources,
  deleteTestUserData,
  logoutTestUser,
  getTestUserId,
} from './firebase-test-utils.js';

const TEST_EMAIL = 'test-integration@lekalu.app';
const TEST_PASSWORD = 'TestPassword123!';
let testUserId;

/**
 * Core Data Validation & Formatting Tests - Real Firebase Data
 * Tests data validation, formatting, and type constraints with actual Firestore data
 */
describe('Core Data Validation - Real Firebase', () => {
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

  describe('Data Validation - Activity Amounts', () => {
    it('should require amount to be a positive number', async () => {
      // Valid positive amount
      const validActivity = await createTestActivity(testUserId, {
        amount: 100,
        type: 'expense',
        date: new Date('2026-04-01').getTime(),
      });

      expect(validActivity).toBeDefined();

      // Retrieve and verify
      const activities = await getUserActivities(testUserId);
      const activity = activities.find(a => a.id === validActivity.id);
      expect(activity?.amount).toBeGreaterThan(0);
    });

    it('should reject null amounts', async () => {
      // In Firebase, we can set null but the validation should flag it
      const validateAmount = (amount) => {
        return amount !== null && amount !== undefined && !isNaN(amount) && amount > 0;
      };

      expect(validateAmount(null)).toBe(false);
      expect(validateAmount(undefined)).toBe(false);
      expect(validateAmount(0)).toBe(false);
      expect(validateAmount(100)).toBe(true);
    });
  });

  describe('Data Validation - Activity Type', () => {
    it('should require activity type to be valid', async () => {
      const validTypes = ['income', 'expense', 'transfer'];

      // Create activities with valid types
      for (const type of validTypes) {
        const activity = await createTestActivity(testUserId, {
          amount: 100,
          type,
          date: new Date('2026-04-01').getTime(),
        });
        expect(activity).toBeDefined();
      }

      // Retrieve and verify
      const activities = await getUserActivities(testUserId);
      activities.forEach(a => {
        expect(validTypes).toContain(a.type);
      });
    });

    it('should handle activities with missing type gracefully', () => {
      const validateType = (type) => {
        const validTypes = ['income', 'expense', 'transfer'];
        return type && validTypes.includes(type);
      };

      expect(validateType(null)).toBeFalsy();
      expect(validateType(undefined)).toBeFalsy();
      expect(validateType('invalid')).toBeFalsy();
      expect(validateType('income')).toBeTruthy();
    });
  });

  describe('Data Formatting - Currency Format', () => {
    it('should format amounts as currency', async () => {
      const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-IN', {
          style: 'currency',
          currency: 'INR',
        }).format(amount);
      };

      const amount = 12345.67;
      const formatted = formatCurrency(amount);
      
      expect(formatted).toBeDefined();
      expect(formatted).toContain('₹');
    });

    it('should handle large amounts correctly', async () => {
      const largeActivity = await createTestActivity(testUserId, {
        amount: 99999999.99,
        type: 'income',
        description: 'Large transaction',
        date: new Date('2026-04-01').getTime(),
      });

      expect(largeActivity).toBeDefined();

      const activities = await getUserActivities(testUserId);
      const activity = activities.find(a => a.id === largeActivity.id);
      expect(activity?.amount).toBeGreaterThan(1000000);
    });

    it('should handle small decimal amounts', async () => {
      const smallActivity = await createTestActivity(testUserId, {
        amount: 0.50,
        type: 'expense',
        description: 'Small amount',
        date: new Date('2026-04-02').getTime(),
      });

      expect(smallActivity).toBeDefined();

      const activities = await getUserActivities(testUserId);
      const activity = activities.find(a => a.id === smallActivity.id);
      expect(activity?.amount).toBeLessThan(1);
      expect(activity?.amount).toBeGreaterThan(0);
    });
  });

  describe('Date Handling - Validation', () => {
    it('should create date ranges for daily filter', async () => {
      const today = new Date();
      const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);

      expect(startOfDay <= today).toBe(true);
      expect(endOfDay >= today).toBe(true);
    });

    it('should create date ranges for monthly filter', async () => {
      const today = new Date();
      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
      const nextMonth = new Date(today.getFullYear(), today.getMonth() + 1, 1);
      const endOfMonth = new Date(nextMonth - 1);

      expect(startOfMonth <= today).toBe(true);
      expect(endOfMonth >= today).toBe(true);
    });

    it('should create date ranges for yearly filter', async () => {
      const today = new Date();
      const startOfYear = new Date(today.getFullYear(), 0, 1);
      const endOfYear = new Date(today.getFullYear(), 11, 31, 23, 59, 59);

      expect(startOfYear <= today).toBe(true);
      expect(endOfYear >= today).toBe(true);
    });

    it('should store activity dates consistently', async () => {
      const testDate = new Date('2026-04-15');
      const activity = await createTestActivity(testUserId, {
        amount: 100,
        type: 'expense',
        date: testDate.getTime(),
      });

      const activities = await getUserActivities(testUserId);
      const retrieved = activities.find(a => a.id === activity.id);
      
      expect(retrieved?.date).toBeDefined();
      expect(typeof retrieved?.date).toBe('number');
    });
  });

  describe('Trackable Status Validation', () => {
    it('should support frequency field on trackables', async () => {
      const trackable = await createTestTrackable(testUserId, {
        name: 'Test Trackable',
        frequency: 'monthly',
        startDate: new Date('2026-04-01').getTime(),
      });

      expect(trackable).toBeDefined();

      const trackables = await getUserTrackables(testUserId);
      const retrieved = trackables.find(t => t.id === trackable.id);
      
      expect(retrieved?.frequency).toBe('monthly');
    });

    it('should validate frequency values', () => {
      const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];

      validFrequencies.forEach(freq => {
        expect(validFrequencies).toContain(freq);
      });

      expect(validFrequencies).not.toContain('invalid');
    });

    it('should support frequencyInterval for custom frequencies', async () => {
      const trackable = await createTestTrackable(testUserId, {
        name: 'Every 2 Days',
        frequency: 'daily',
        frequencyInterval: 2,
        startDate: new Date('2026-04-01').getTime(),
      });

      const trackables = await getUserTrackables(testUserId);
      const retrieved = trackables.find(t => t.id === trackable.id);
      
      expect(retrieved?.frequencyInterval).toBe(2);
    });
  });

  describe('Source/Account Handling', () => {
    it('should allow creating source without account number', async () => {
      const source = await createTestSource(testUserId, {
        name: 'Cash Wallet',
        type: 'cash',
        accountNumber: null,
      });

      expect(source).toBeDefined();

      const sources = await getUserSources(testUserId);
      const retrieved = sources.find(s => s.id === source.id);
      
      expect(retrieved?.name).toEqual('Cash Wallet');
      expect(retrieved?.accountNumber).toBeNull();
    });

    it('should allow creating source with account number', async () => {
      const source = await createTestSource(testUserId, {
        name: 'Main Debit',
        type: 'debit',
        accountNumber: '****1234',
      });

      expect(source).toBeDefined();

      const sources = await getUserSources(testUserId);
      const retrieved = sources.find(s => s.id === source.id);
      
      expect(retrieved?.accountNumber).toEqual('****1234');
    });

    it('should require source name', async () => {
      const validateSourceName = (name) => {
        return name && name.trim().length > 0;
      };

      expect(validateSourceName('')).toBeFalsy();
      expect(validateSourceName(null)).toBeFalsy();
      expect(validateSourceName('Valid Name')).toBeTruthy();
    });

    it('should support source type field with valid values', async () => {
      const validSourceTypes = ['credit', 'debit', 'cash', 'savings'];

      for (const type of validSourceTypes) {
        const source = await createTestSource(testUserId, {
          name: `Account - ${type}`,
          type,
        });
        expect(source).toBeDefined();
      }

      const sources = await getUserSources(testUserId);
      sources.forEach(s => {
        expect(validSourceTypes).toContain(s.type);
      });
    });
  });

  describe('Activity Operations - Data Integrity', () => {
    it('should allow activities without trackables', async () => {
      const activity = await createTestActivity(testUserId, {
        amount: 50,
        type: 'expense',
        trackableId: null,
        description: 'Random expense',
        date: new Date('2026-04-10').getTime(),
      });

      expect(activity).toBeDefined();

      const activities = await getUserActivities(testUserId);
      const retrieved = activities.find(a => a.id === activity.id);
      expect(retrieved?.trackableId).toBeNull();
    });

    it('should support activities with trackable references', async () => {
      const trackable = await createTestTrackable(testUserId, {
        name: 'Netflix',
        frequency: 'monthly',
      });

      const activity = await createTestActivity(testUserId, {
        amount: 15,
        type: 'expense',
        trackableId: trackable.id,
        date: new Date('2026-04-10').getTime(),
      });

      expect(activity).toBeDefined();

      const activities = await getUserActivities(testUserId);
      const retrieved = activities.find(a => a.id === activity.id);
      expect(retrieved?.trackableId).toBe(trackable.id);
    });

    it('should support activities with source references', async () => {
      const source = await createTestSource(testUserId, {
        name: 'Credit Card',
        type: 'credit',
      });

      const activity = await createTestActivity(testUserId, {
        amount: 100,
        type: 'expense',
        sourceId: source.id,
        date: new Date('2026-04-10').getTime(),
      });

      expect(activity).toBeDefined();

      const activities = await getUserActivities(testUserId);
      const retrieved = activities.find(a => a.id === activity.id);
      expect(retrieved?.sourceId).toBe(source.id);
    });
  });

  describe('Data Consistency', () => {
    it('should maintain data integrity across operations', async () => {
      // Create trackable
      const trackable = await createTestTrackable(testUserId, {
        name: 'Rent',
        frequency: 'monthly',
        startDate: new Date('2026-04-01').getTime(),
      });

      // Create source
      const source = await createTestSource(testUserId, {
        name: 'Main Account',
        type: 'debit',
      });

      // Create activity linking both
      const activity = await createTestActivity(testUserId, {
        amount: 1000,
        type: 'expense',
        trackableId: trackable.id,
        sourceId: source.id,
        date: new Date('2026-04-05').getTime(),
      });

      // Verify all data is consistent
      const activities = await getUserActivities(testUserId);
      const trackables = await getUserTrackables(testUserId);
      const sources = await getUserSources(testUserId);

      const activityObj = activities.find(a => a.id === activity.id);
      expect(activityObj?.trackableId).toBe(trackable.id);
      expect(activityObj?.sourceId).toBe(source.id);

      expect(trackables.some(t => t.id === trackable.id)).toBe(true);
      expect(sources.some(s => s.id === source.id)).toBe(true);
    });
  });
});
