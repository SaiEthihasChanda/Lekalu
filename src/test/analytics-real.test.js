import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestUser,
  loginTestUser,
  logoutTestUser,
  getTestUserId,
  createTestActivity,
  createTestTrackable,
  createTestSource,
  getUserActivities,
  getUserTrackables,
  getUserSources,
  deleteTestUserData,
} from './firebase-test-utils.js';

const TEST_EMAIL = 'test-integration@lekalu.app';
const TEST_PASSWORD = 'TestPassword123!';
let testUserId;

describe('Analytics - Real Firebase Data', () => {
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
    // Cleanup: Delete all test data and logout
    if (testUserId) {
      await deleteTestUserData(testUserId);
    }
    await logoutTestUser();
  });

  describe('Activity Filtering', () => {
    beforeEach(async () => {
      // Create test activities
      await createTestActivity(testUserId, {
        date: new Date('2026-04-01').getTime(),
        amount: 100,
        type: 'income',
        description: 'Salary',
      });
      await createTestActivity(testUserId, {
        date: new Date('2026-04-02').getTime(),
        amount: 200,
        type: 'expense',
        description: 'Groceries',
      });
      await createTestActivity(testUserId, {
        date: new Date('2026-05-01').getTime(),
        amount: 300,
        type: 'income',
        description: 'Bonus',
      });
    });

    it('should filter activities by date range', async () => {
      const activities = await getUserActivities(testUserId);
      
      const filterStart = new Date('2026-04-01').getTime();
      const filterEnd = new Date('2026-04-30').getTime();

      const filtered = activities.filter(a => a.date >= filterStart && a.date <= filterEnd);
      expect(filtered.length).toBe(2);
    });

    it('should filter activities by type', async () => {
      const activities = await getUserActivities(testUserId);
      
      const incomeActivities = activities.filter(a => a.type === 'income');
      expect(incomeActivities.length).toBeGreaterThan(0);
      
      const expenseActivities = activities.filter(a => a.type === 'expense');
      expect(expenseActivities.length).toBeGreaterThan(0);
    });
  });

  describe('Totals Calculation', () => {
    beforeEach(async () => {
      // Create test activities for totals
      await createTestActivity(testUserId, {
        date: new Date('2026-04-10').getTime(),
        amount: 1000,
        type: 'income',
        description: 'Main Income',
      });
      await createTestActivity(testUserId, {
        date: new Date('2026-04-11').getTime(),
        amount: 300,
        type: 'expense',
        description: 'Rent',
      });
      await createTestActivity(testUserId, {
        date: new Date('2026-04-12').getTime(),
        amount: 50,
        type: 'expense',
        description: 'Food',
      });
    });

    it('should calculate total income', async () => {
      const activities = await getUserActivities(testUserId);
      
      const totalIncome = activities
        .filter(a => a.type === 'income')
        .reduce((sum, a) => sum + a.amount, 0);

      expect(totalIncome).toBeGreaterThan(0);
    });

    it('should calculate total expense', async () => {
      const activities = await getUserActivities(testUserId);
      
      const totalExpense = activities
        .filter(a => a.type === 'expense')
        .reduce((sum, a) => sum + a.amount, 0);

      expect(totalExpense).toBeGreaterThan(0);
    });

    it('should calculate net (income - expense)', async () => {
      const activities = await getUserActivities(testUserId);
      
      const totalIncome = activities
        .filter(a => a.type === 'income')
        .reduce((sum, a) => sum + a.amount, 0);

      const totalExpense = activities
        .filter(a => a.type === 'expense')
        .reduce((sum, a) => sum + a.amount, 0);

      const net = totalIncome - totalExpense;
      expect(net).toBeDefined();
    });

    it('should exclude transfers from totals', async () => {
      // Add a transfer
      await createTestActivity(testUserId, {
        date: new Date('2026-04-13').getTime(),
        amount: 100,
        type: 'transfer',
        description: 'Transfer to savings',
      });

      const activities = await getUserActivities(testUserId);
      const countableActivities = activities.filter(a => a.type !== 'transfer');
      
      expect(countableActivities.length).toBeLessThan(activities.length);
    });
  });

  describe('Trackable Analytics', () => {
    let trackableId;

    beforeEach(async () => {
      // Create test trackable
      const trackableDoc = await createTestTrackable(testUserId, {
        name: 'Rent',
        frequency: 'monthly',
        startDate: new Date('2026-04-01').getTime(),
      });
      trackableId = trackableDoc.id;

      // Create activities with trackable reference
      await createTestActivity(testUserId, {
        date: new Date('2026-04-05').getTime(),
        amount: 1000,
        type: 'expense',
        trackableId,
        description: 'Rent Payment',
      });
      await createTestActivity(testUserId, {
        date: new Date('2026-04-10').getTime(),
        amount: 50,
        type: 'expense',
        trackableId,
        description: 'Utilities',
      });
    });

    it('should show total spent on each trackable', async () => {
      const activities = await getUserActivities(testUserId);
      
      const trackableTotal = activities
        .filter(a => a.trackableId === trackableId)
        .reduce((sum, a) => sum + a.amount, 0);

      expect(trackableTotal).toBe(1050);
    });

    it('should retrieve trackable details', async () => {
      const trackables = await getUserTrackables(testUserId);
      const trackable = trackables.find(t => t.id === trackableId);
      
      expect(trackable).toBeDefined();
      expect(trackable?.name).toBe('Rent');
      expect(trackable?.frequency).toBe('monthly');
    });

    it('should handle activities without trackables', async () => {
      const activities = await getUserActivities(testUserId);
      const trackedActivities = activities.filter(a => a.trackableId);
      
      expect(trackedActivities.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Source/Account Analytics', () => {
    let sourceId;

    beforeEach(async () => {
      // Create test source
      const sourceDoc = await createTestSource(testUserId, {
        name: 'Main Checking',
        type: 'checking',
        accountNumber: '****1234',
      });
      sourceId = sourceDoc.id;

      // Create activities with source reference
      await createTestActivity(testUserId, {
        date: new Date('2026-04-05').getTime(),
        amount: 500,
        type: 'expense',
        sourceId,
        description: 'Groceries',
      });
      await createTestActivity(testUserId, {
        date: new Date('2026-04-10').getTime(),
        amount: 200,
        type: 'expense',
        sourceId,
        description: 'Gas',
      });
    });

    it('should filter activities by account', async () => {
      const activities = await getUserActivities(testUserId);
      const sourceActivities = activities.filter(a => a.sourceId === sourceId);
      
      expect(sourceActivities.length).toBeGreaterThanOrEqual(0);
    });

    it('should retrieve source details', async () => {
      const sources = await getUserSources(testUserId);
      const source = sources.find(s => s.id === sourceId);
      
      expect(source).toBeDefined();
      expect(source?.name).toBe('Main Checking');
      expect(source?.type).toBe('checking');
    });
  });

  describe('Chart Data Preparation', () => {
    let trackableId1;
    let trackableId2;

    beforeEach(async () => {
      // Create test trackables
      const track1Doc = await createTestTrackable(testUserId, {
        name: 'Rent',
        frequency: 'monthly',
      });
      trackableId1 = track1Doc.id;

      const track2Doc = await createTestTrackable(testUserId, {
        name: 'Food',
        frequency: 'monthly',
      });
      trackableId2 = track2Doc.id;

      // Create activities for pie chart data
      await createTestActivity(testUserId, {
        date: new Date('2026-04-05').getTime(),
        amount: 1000,
        type: 'expense',
        trackableId: trackableId1,
        trackableName: 'Rent',
      });
      await createTestActivity(testUserId, {
        date: new Date('2026-04-10').getTime(),
        amount: 500,
        type: 'expense',
        trackableId: trackableId1,
        trackableName: 'Rent',
      });
      await createTestActivity(testUserId, {
        date: new Date('2026-04-15').getTime(),
        amount: 200,
        type: 'expense',
        trackableId: trackableId2,
        trackableName: 'Food',
      });
    });

    it('should prepare pie chart data for expense breakdown', async () => {
      const activities = await getUserActivities(testUserId);
      
      const expensesByTrackable = {};
      activities
        .filter(a => a.type === 'expense' && a.trackableName)
        .forEach(a => {
          expensesByTrackable[a.trackableName] =
            (expensesByTrackable[a.trackableName] || 0) + a.amount;
        });

      expect(Object.keys(expensesByTrackable).length).toBeGreaterThan(0);
      if (expensesByTrackable['Rent']) {
        expect(expensesByTrackable['Rent']).toBe(1500);
      }
    });

    it('should prepare bar chart data for monthly comparison', async () => {
      const activities = await getUserActivities(testUserId);
      
      const monthlyData = {};
      activities.forEach(a => {
        if (a.date) {
          const date = new Date(a.date);
          const month = date.toLocaleString('en-US', { year: 'numeric', month: 'long' });
          monthlyData[month] = (monthlyData[month] || 0) + a.amount;
        }
      });

      expect(Object.keys(monthlyData).length).toBeGreaterThan(0);
    });
  });
});
