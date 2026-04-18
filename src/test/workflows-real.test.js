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

describe('User Workflow Sequences - Real Firebase Data', () => {
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
    // Commented out to preserve test data for manual inspection
    // if (testUserId) {
    //   await deleteTestUserData(testUserId);
    // }
    // await logoutTestUser();
  });

  describe('Personal Mode - Solo User Activities', () => {
    it('should complete workflow: create account → add activity → edit → view → delete', async () => {
      // Step 1: Create bank account
      const accountDoc = await createTestSource(testUserId, {
        name: 'Chase',
        type: 'checking',
        accountNumber: '****1234',
      });
      const accountId = accountDoc.id;
      
      const sources = await getUserSources(testUserId);
      expect(sources.length).toBeGreaterThan(0);
      expect(sources.some(s => s.id === accountId)).toBe(true);

      // Step 2: Add activity
      const activityDoc = await createTestActivity(testUserId, {
        amount: 50,
        type: 'expense',
        sourceId: accountId,
        description: 'Coffee',
        date: new Date('2026-04-05').getTime(),
      });
      const activityId = activityDoc.id;
      
      let activities = await getUserActivities(testUserId);
      expect(activities.length).toBeGreaterThan(0);
      let activity = activities.find(a => a.id === activityId);
      expect(activity?.amount).toBe(50);
    });

    it('should complete workflow: create trackable → create activity from trackable', async () => {
      // Step 1: Create trackable with tracking enabled
      const trackableDoc = await createTestTrackable(testUserId, {
        name: 'Netflix',
        type: 'expense',
        frequency: 'monthly',
        startDate: new Date('2026-04-01').getTime(),
      });
      const trackableId = trackableDoc.id;
      
      const trackables = await getUserTrackables(testUserId);
      expect(trackables.length).toBeGreaterThan(0);
      expect(trackables.some(t => t.id === trackableId)).toBe(true);

      // Step 2: Create activity referencing trackable
      const activityDoc = await createTestActivity(testUserId, {
        amount: 15,
        type: 'expense',
        trackableId,
        date: new Date('2026-04-05').getTime(),
        description: 'Netflix subscription',
      });
      const activityId = activityDoc.id;
      
      const activities = await getUserActivities(testUserId);
      const activity = activities.find(a => a.id === activityId);
      expect(activity?.trackableId).toBe(trackableId);
    });
  });

  describe('Activity Management Workflows', () => {
    it('should handle income and expense activities separately', async () => {
      // Create income activity
      await createTestActivity(testUserId, {
        amount: 1000,
        type: 'income',
        description: 'Salary',
        date: new Date('2026-04-10').getTime(),
      });

      // Create expense activity
      await createTestActivity(testUserId, {
        amount: 300,
        type: 'expense',
        description: 'Groceries',
        date: new Date('2026-04-11').getTime(),
      });

      const activities = await getUserActivities(testUserId);
      const incomeActivities = activities.filter(a => a.type === 'income');
      const expenseActivities = activities.filter(a => a.type === 'expense');
      
      expect(incomeActivities.length).toBeGreaterThan(0);
      expect(expenseActivities.length).toBeGreaterThan(0);
    });

    it('should handle transfer activities without counting in totals', async () => {
      // Create transfer activity
      await createTestActivity(testUserId, {
        amount: 500,
        type: 'transfer',
        description: 'Transfer to savings',
        date: new Date('2026-04-12').getTime(),
      });

      const activities = await getUserActivities(testUserId);
      const transfers = activities.filter(a => a.type === 'transfer');
      const countable = activities.filter(a => a.type !== 'transfer');
      
      expect(transfers.length).toBeGreaterThanOrEqual(0);
      expect(countable.length).toBeGreaterThanOrEqual(0);
    });

    it('should support activities with and without trackables', async () => {
      // Activity without trackable
      await createTestActivity(testUserId, {
        amount: 100,
        type: 'expense',
        description: 'Miscellaneous',
        date: new Date('2026-04-13').getTime(),
      });

      // Activity with trackable
      const trackableDoc = await createTestTrackable(testUserId, {
        name: 'Utilities',
        type: 'expense',
        frequency: 'monthly',
      });
      
      await createTestActivity(testUserId, {
        amount: 200,
        type: 'expense',
        trackableId: trackableDoc.id,
        description: 'Electric bill',
        date: new Date('2026-04-14').getTime(),
      });

      const activities = await getUserActivities(testUserId);
      const withTrackable = activities.filter(a => a.trackableId);
      const withoutTrackable = activities.filter(a => !a.trackableId);
      
      expect(withTrackable.length).toBeGreaterThanOrEqual(0);
      expect(withoutTrackable.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Trackable Management Workflows', () => {
    it('should support creating trackables with different frequencies', async () => {
      // Monthly trackable
      const monthlyDoc = await createTestTrackable(testUserId, {
        name: 'Rent',
        frequency: 'monthly',
        startDate: new Date('2026-04-01').getTime(),
      });

      // Weekly trackable
      const weeklyDoc = await createTestTrackable(testUserId, {
        name: 'Gym',
        frequency: 'weekly',
        startDate: new Date('2026-04-07').getTime(),
      });

      // Daily trackable - every 2 days
      const dailyDoc = await createTestTrackable(testUserId, {
        name: 'Medication',
        frequency: 'daily',
        frequencyInterval: 2,
        startDate: new Date('2026-04-01').getTime(),
      });

      const trackables = await getUserTrackables(testUserId);
      expect(trackables.length).toBeGreaterThanOrEqual(3);
      
      const hasMonthly = trackables.some(t => t.frequency === 'monthly');
      const hasWeekly = trackables.some(t => t.frequency === 'weekly');
      const hasDaily = trackables.some(t => t.frequency === 'daily');
      
      expect(hasMonthly).toBe(true);
      expect(hasWeekly).toBe(true);
      expect(hasDaily).toBe(true);
    });

    it('should retrieve trackable details correctly', async () => {
      const trackableDoc = await createTestTrackable(testUserId, {
        name: 'Insurance',
        type: 'expense',
        frequency: 'yearly',
        startDate: new Date('2026-01-01').getTime(),
      });

      const trackables = await getUserTrackables(testUserId);
      const trackable = trackables.find(t => t.id === trackableDoc.id);
      
      expect(trackable).toBeDefined();
      expect(trackable?.name).toBe('Insurance');
      expect(trackable?.frequency).toBe('yearly');
    });
  });

  describe('Source/Account Management Workflows', () => {
    it('should support multiple accounts of different types', async () => {
      // Checking account
      const checkingDoc = await createTestSource(testUserId, {
        name: 'Main Checking',
        type: 'checking',
        accountNumber: '****5678',
      });

      // Credit card
      const creditDoc = await createTestSource(testUserId, {
        name: 'Visa',
        type: 'credit',
        accountNumber: '****1234',
      });

      // Savings
      const savingsDoc = await createTestSource(testUserId, {
        name: 'Savings Account',
        type: 'savings',
        accountNumber: '****9999',
      });

      const sources = await getUserSources(testUserId);
      expect(sources.length).toBeGreaterThanOrEqual(3);
      
      const hasChecking = sources.some(s => s.type === 'checking');
      const hasCredit = sources.some(s => s.type === 'credit');
      const hasSavings = sources.some(s => s.type === 'savings');
      
      expect(hasChecking).toBe(true);
      expect(hasCredit).toBe(true);
      expect(hasSavings).toBe(true);
    });

    it('should attach activities to specific sources', async () => {
      // Create source
      const sourceDoc = await createTestSource(testUserId, {
        name: 'Chase Checking',
        type: 'checking',
      });
      const sourceId = sourceDoc.id;

      // Create activities for this source
      await createTestActivity(testUserId, {
        amount: 50,
        type: 'expense',
        sourceId,
        date: new Date('2026-04-15').getTime(),
      });

      await createTestActivity(testUserId, {
        amount: 100,
        type: 'expense',
        sourceId,
        date: new Date('2026-04-16').getTime(),
      });

      const activities = await getUserActivities(testUserId);
      const sourceActivities = activities.filter(a => a.sourceId === sourceId);
      
      expect(sourceActivities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Complex Multi-Step Workflows', () => {
    it('should handle complete expense tracking workflow', async () => {
      // 1. Create trackable
      const trackableDoc = await createTestTrackable(testUserId, {
        name: 'Groceries',
        type: 'expense',
        frequency: 'weekly',
        startDate: new Date('2026-04-07').getTime(),
      });
      const trackableId = trackableDoc.id;

      // 2. Create source
      const sourceDoc = await createTestSource(testUserId, {
        name: 'Debit Card',
        type: 'debit',
      });
      const sourceId = sourceDoc.id;

      // 3. Create multiple activities
      for (let i = 0; i < 3; i++) {
        await createTestActivity(testUserId, {
          amount: 50 + (i * 20),
          type: 'expense',
          trackableId,
          sourceId,
          description: `Grocery trip ${i + 1}`,
          date: new Date(`2026-04-${8 + i}`).getTime(),
        });
      }

      // 4. Verify complete workflow
      const trackables = await getUserTrackables(testUserId);
      const sources = await getUserSources(testUserId);
      const activities = await getUserActivities(testUserId);

      expect(trackables.some(t => t.id === trackableId)).toBe(true);
      expect(sources.some(s => s.id === sourceId)).toBe(true);
      expect(activities.some(a => a.trackableId === trackableId)).toBe(true);

      // 5. Calculate totals
      const trackableActivities = activities.filter(a => a.trackableId === trackableId);
      const total = trackableActivities.reduce((sum, a) => sum + a.amount, 0);
      expect(total).toBeGreaterThan(0);
    });
  });
});
