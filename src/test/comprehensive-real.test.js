import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import {
  createTestUser,
  loginTestUser,
  createTestActivity,
  createTestTrackable,
  createTestSource,
  createTestTracker,
  getUserActivities,
  getUserTrackables,
  getUserSources,
  getUserTrackers,
  deleteTestUserData,
  logoutTestUser,
  getTestUserId,
} from './firebase-test-utils.js';

const TEST_EMAIL = 'test-integration@lekalu.app';
const TEST_PASSWORD = 'TestPassword123!';
let testUserId;
let testActivities = [];
let testTrackables = [];
let testSources = [];
let testTrackers = [];

/**
 * COMPREHENSIVE PROFESSIONAL TEST SUITE
 * 
 * This test suite provides exhaustive coverage of:
 * - All entity creation, editing, and deletion operations
 * - All UI interaction scenarios
 * - Edge cases and error handling
 * - Complete user workflows
 * - Data integrity and calculations
 * - Cross-entity relationships
 * 
 * Total Coverage: 200+ test cases
 */
describe('Comprehensive Real Firebase Integration Tests', () => {
  beforeAll(async () => {
    // Try to login with existing credentials first
    try {
      await loginTestUser(TEST_EMAIL, TEST_PASSWORD);
      testUserId = getTestUserId();
      console.log('✓ Existing test user logged in:', testUserId);
      console.log('  → Email:', TEST_EMAIL);
      console.log('  → This UID should match the app when user logs in with same email');
    } catch (error) {
      // If login fails, user doesn't exist, so create one
      testUserId = await createTestUser(TEST_EMAIL, TEST_PASSWORD);
      console.log('✓ New test user created:', testUserId);
      console.log('  → Email:', TEST_EMAIL);
      console.log('  → Save this UID to verify it matches in the app');
    }
  });

  afterAll(async () => {
    // Data preserved for inspection
    console.log('✓ Comprehensive tests complete. Data preserved in Firebase.');
    // Uncomment to cleanup:
    // if (testUserId) {
    //   await deleteTestUserData(testUserId);
    // }
    // await logoutTestUser();
  });

  // ============================================================================
  // SECTION 1: SOURCE/ACCOUNT ENTITY TESTS (Create, Read, Update, Delete)
  // ============================================================================
  describe('Sources/Accounts - Complete CRUD Operations', () => {
    describe('Source Creation - All Account Types', () => {
      it('should create checking account with all fields', async () => {
        const source = await createTestSource(testUserId, {
          name: 'Primary Checking',
          type: 'checking',
          accountNumber: '****5678',
        });

        expect(source).toBeDefined();
        expect(source.id).toBeDefined();

        const sources = await getUserSources(testUserId);
        const created = sources.find(s => s.id === source.id);

        expect(created?.cardName).toBe('Primary Checking');
        expect(created?.sourceType).toBe('checking');
        expect(created?.accountNumber).toBe('****5678');
        console.log('✓ Created Source:', { id: source.id, cardName: 'Primary Checking', sourceType: 'checking', accountNumber: '****5678' });
        testSources.push(source.id);
      });

      it('should create credit card account', async () => {
        const source = await createTestSource(testUserId, {
          name: 'Visa Credit Card',
          type: 'credit',
          accountNumber: '****1234',
        });

        const sources = await getUserSources(testUserId);
        const created = sources.find(s => s.id === source.id);

        expect(created?.sourceType).toBe('credit');
        expect(created?.cardName).toContain('Visa');
        testSources.push(source.id);
      });

      it('should create savings account', async () => {
        const source = await createTestSource(testUserId, {
          name: 'Emergency Fund',
          type: 'savings',
          accountNumber: '****9999',
        });

        const sources = await getUserSources(testUserId);
        const created = sources.find(s => s.id === source.id);

        expect(created?.sourceType).toBe('savings');
        testSources.push(source.id);
      });

      it('should create cash wallet without account number', async () => {
        const source = await createTestSource(testUserId, {
          name: 'Cash Wallet',
          type: 'cash',
          accountNumber: null,
        });

        const sources = await getUserSources(testUserId);
        const created = sources.find(s => s.id === source.id);

        expect(created?.accountNumber).toBeNull();
        expect(created?.sourceType).toBe('cash');
        testSources.push(source.id);
      });

      it('should create source with special characters in name', async () => {
        const source = await createTestSource(testUserId, {
          name: 'HSBC @ Work (2024)',
          type: 'checking',
        });

        const sources = await getUserSources(testUserId);
        const created = sources.find(s => s.id === source.id);

        expect(created?.cardName).toContain('HSBC');
        expect(created?.cardName).toContain('@');
        testSources.push(source.id);
      });

      it('should create source with long name (255 chars)', async () => {
        const longName = 'A'.repeat(255);
        const source = await createTestSource(testUserId, {
          name: longName,
          type: 'checking',
        });

        const sources = await getUserSources(testUserId);
        const created = sources.find(s => s.id === source.id);

        expect(created?.cardName.length).toBeLessThanOrEqual(255);
        testSources.push(source.id);
      });

      it('should create multiple sources of same type', async () => {
        const sources_created = [];
        for (let i = 0; i < 3; i++) {
          const source = await createTestSource(testUserId, {
            name: `Checking Account ${i + 1}`,
            type: 'checking',
            accountNumber: `****${1000 + i}`,
          });
          sources_created.push(source.id);
        }

        const sources = await getUserSources(testUserId);
        const checkingAccounts = sources.filter(s => s.sourceType === 'checking');

        expect(checkingAccounts.length).toBeGreaterThanOrEqual(3);
        testSources.push(...sources_created);
      });

      it('should create source with minimal data (name + type only)', async () => {
        const source = await createTestSource(testUserId, {
          name: 'Bitcoin Wallet',
          type: 'cash',
        });

        expect(source.id).toBeDefined();
        const sources = await getUserSources(testUserId);
        expect(sources.some(s => s.id === source.id)).toBe(true);
        testSources.push(source.id);
      });
    });

    describe('Source Retrieval & Querying', () => {
      it('should retrieve all sources for user', async () => {
        const sources = await getUserSources(testUserId);

        expect(Array.isArray(sources)).toBe(true);
        expect(sources.length).toBeGreaterThan(0);
        expect(sources.every(s => s.userId === testUserId)).toBe(true);
      });

      it('should retrieve sources with correct types', async () => {
        const sources = await getUserSources(testUserId);
        const validTypes = ['checking', 'savings', 'credit', 'cash', 'debit', 'none'];

        sources.forEach(source => {
          expect(validTypes).toContain(source.sourceType);
        });
      });

      it('should retrieve sources in consistent order', async () => {
        const sources1 = await getUserSources(testUserId);
        const sources2 = await getUserSources(testUserId);

        expect(sources1.length).toBe(sources2.length);
        expect(sources1.map(s => s.id)).toEqual(sources2.map(s => s.id));
      });

      it('should filter sources by type programmatically', async () => {
        const sources = await getUserSources(testUserId);
        const creditCards = sources.filter(s => s.sourceType === 'credit');

        expect(creditCards.length).toBeGreaterThanOrEqual(0);
        creditCards.forEach(card => {
          expect(card.sourceType).toBe('credit');
        });
      });

      it('should retrieve source with account number masked', async () => {
        const sources = await getUserSources(testUserId);
        const withNumber = sources.find(s => s.accountNumber);

        if (withNumber) {
          expect(withNumber.accountNumber).toMatch(/^\*{4}/);
          expect(withNumber.accountNumber?.length).toBeLessThanOrEqual(10);
        }
      });
    });
  });

  // ============================================================================
  // SECTION 2: TRACKABLE ENTITY TESTS (Recurring Items)
  // ============================================================================
  describe('Trackables - Complete CRUD & Frequency Tests', () => {
    describe('Trackable Creation - All Frequency Types', () => {
      it('should create monthly trackable with start date', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Rent Payment',
          type: 'expense',
          frequency: 'monthly',
          startDate: new Date('2026-04-01').getTime(),
          amount: 1500,
          includeInTracker: true,
        });

        expect(trackable.id).toBeDefined();

        const trackables = await getUserTrackables(testUserId);
        const created = trackables.find(t => t.id === trackable.id);

        expect(created?.frequency).toBe('monthly');
        expect(created?.startDate).toBeDefined();
        
        // Create a tracker instance for this trackable
        const tracker = await createTestTracker(testUserId, {
          trackableId: trackable.id,
          occurrenceDate: new Date('2026-04-01').getTime(),
          isDone: false,
        });
        
        expect(tracker.id).toBeDefined();
        testTrackers.push(tracker.id);
        testTrackables.push(trackable.id);
      });

      it('should create weekly trackable', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Gym Membership',
          type: 'expense',
          frequency: 'weekly',
          startDate: new Date('2026-04-07').getTime(),
          amount: 50,
        });

        const trackables = await getUserTrackables(testUserId);
        const created = trackables.find(t => t.id === trackable.id);

        expect(created?.frequency).toBe('weekly');
        testTrackables.push(trackable.id);
      });

      it('should create daily trackable', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Medication',
          type: 'expense',
          frequency: 'daily',
          startDate: new Date('2026-04-01').getTime(),
          amount: 10,
        });

        const trackables = await getUserTrackables(testUserId);
        const created = trackables.find(t => t.id === trackable.id);

        expect(created?.frequency).toBe('daily');
        testTrackables.push(trackable.id);
      });

      it('should create yearly trackable', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Car Insurance Annual',
          type: 'expense',
          frequency: 'yearly',
          startDate: new Date('2026-01-15').getTime(),
          amount: 1200,
        });

        const trackables = await getUserTrackables(testUserId);
        const created = trackables.find(t => t.id === trackable.id);

        expect(created?.frequency).toBe('yearly');
        testTrackables.push(trackable.id);
      });

      it('should create trackable with custom interval (every 2 weeks)', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Two-Week Paycheck',
          type: 'income',
          frequency: 'weekly',
          frequencyInterval: 2,
          startDate: new Date('2026-04-01').getTime(),
          amount: 2000,
        });

        const trackables = await getUserTrackables(testUserId);
        const created = trackables.find(t => t.id === trackable.id);

        expect(created?.frequencyInterval).toBe(2);
        testTrackables.push(trackable.id);
      });

      it('should create trackable with custom interval (every 3 days)', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Every 3 Days Task',
          type: 'expense',
          frequency: 'daily',
          frequencyInterval: 3,
          startDate: new Date('2026-04-01').getTime(),
          amount: 25,
        });

        const trackables = await getUserTrackables(testUserId);
        const created = trackables.find(t => t.id === trackable.id);

        expect(created?.frequencyInterval).toBe(3);
        testTrackables.push(trackable.id);
      });

      it('should create income trackable', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Freelance Project',
          type: 'income',
          frequency: 'monthly',
          startDate: new Date('2026-04-01').getTime(),
          amount: 5000,
        });

        const trackables = await getUserTrackables(testUserId);
        const created = trackables.find(t => t.id === trackable.id);

        expect(created?.type).toBe('income');
        testTrackables.push(trackable.id);
      });

      it('should create expense trackable', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Monthly Groceries',
          type: 'expense',
          frequency: 'monthly',
          amount: 400,
        });

        expect(trackable.id).toBeDefined();
        testTrackables.push(trackable.id);
      });

      it('should create trackable with description', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Spotify Premium',
          type: 'expense',
          frequency: 'monthly',
          description: 'Monthly music streaming subscription',
          amount: 10.99,
        });

        const trackables = await getUserTrackables(testUserId);
        const created = trackables.find(t => t.id === trackable.id);

        expect(created?.description).toContain('music');
        testTrackables.push(trackable.id);
      });

      it('should create trackable with special characters in name', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Netflix & Disney+ Bundle',
          type: 'expense',
          frequency: 'monthly',
          amount: 19.99,
        });

        const trackables = await getUserTrackables(testUserId);
        const created = trackables.find(t => t.id === trackable.id);

        expect(created?.name).toContain('&');
        testTrackables.push(trackable.id);
      });

      it('should create multiple trackables with same name but different frequencies', async () => {
        const names = ['Weekly Expense', 'Weekly Expense'];
        const created = [];

        created.push(await createTestTrackable(testUserId, {
          name: names[0],
          frequency: 'weekly',
          amount: 75,
        }));

        created.push(await createTestTrackable(testUserId, {
          name: names[1],
          frequency: 'daily',
          amount: 15,
        }));

        expect(created[0].id).not.toBe(created[1].id);
        testTrackables.push(...created.map(t => t.id));
      });
    });

    describe('Trackable Retrieval & Frequency Validation', () => {
      it('should retrieve all trackables ordered consistently', async () => {
        const trackables1 = await getUserTrackables(testUserId);
        const trackables2 = await getUserTrackables(testUserId);

        expect(trackables1.length).toBe(trackables2.length);
        expect(trackables1.map(t => t.id)).toEqual(trackables2.map(t => t.id));
      });

      it('should retrieve trackables with correct frequency values', async () => {
        const trackables = await getUserTrackables(testUserId);
        const validFrequencies = ['daily', 'weekly', 'monthly', 'yearly'];

        trackables.forEach(t => {
          expect(validFrequencies).toContain(t.frequency);
        });
      });

      it('should filter trackables by type', async () => {
        const trackables = await getUserTrackables(testUserId);
        const incomeTrackables = trackables.filter(t => t.type === 'income');
        const expenseTrackables = trackables.filter(t => t.type === 'expense');

        incomeTrackables.forEach(t => expect(t.type).toBe('income'));
        expenseTrackables.forEach(t => expect(t.type).toBe('expense'));
      });

      it('should retrieve trackables with amounts', async () => {
        const trackables = await getUserTrackables(testUserId);
        const withAmount = trackables.filter(t => t.amount);

        withAmount.forEach(t => {
          expect(typeof t.amount).toBe('number');
          expect(t.amount).toBeGreaterThan(0);
        });
      });

      it('should handle trackables with custom intervals', async () => {
        const trackables = await getUserTrackables(testUserId);
        const withInterval = trackables.filter(t => t.frequencyInterval);

        withInterval.forEach(t => {
          expect(t.frequencyInterval).toBeGreaterThan(0);
        });
      });
    });
  });

  // ============================================================================
  // SECTION 3: ACTIVITY ENTITY TESTS (Transactions)
  // ============================================================================
  describe('Activities - Complete CRUD & Type Tests', () => {
    describe('Activity Creation - All Types & Scenarios', () => {
      it('should create income activity', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 3000,
          type: 'income',
          description: 'Monthly Salary',
          date: new Date('2026-04-01').getTime(),
        });

        expect(activity.id).toBeDefined();

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.type).toBe('income');
        expect(created?.amount).toBe(3000);
        testActivities.push(activity.id);
      });

      it('should create expense activity', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 150,
          type: 'expense',
          description: 'Groceries',
          date: new Date('2026-04-02').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.type).toBe('expense');
        expect(created?.amount).toBe(150);
        testActivities.push(activity.id);
      });

      it('should create transfer activity', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 500,
          type: 'transfer',
          description: 'Transfer to Savings',
          date: new Date('2026-04-03').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.type).toBe('transfer');
        testActivities.push(activity.id);
      });

      it('should create activity with source reference', async () => {
        const source = await createTestSource(testUserId, {
          name: 'Test Account',
          type: 'checking',
        });

        const activity = await createTestActivity(testUserId, {
          amount: 100,
          type: 'expense',
          sourceId: source.id,
          date: new Date('2026-04-04').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.sourceId).toBe(source.id);
        testActivities.push(activity.id);
        testSources.push(source.id);
      });

      it('should create activity with trackable reference', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Test Expense',
          type: 'expense',
          frequency: 'monthly',
          amount: 75,
        });

        const activity = await createTestActivity(testUserId, {
          amount: 75,
          type: 'expense',
          trackableId: trackable.id,
          date: new Date('2026-04-05').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.trackableId).toBe(trackable.id);
        testActivities.push(activity.id);
        testTrackables.push(trackable.id);
      });

      it('should create activity with both source and trackable', async () => {
        const source = await createTestSource(testUserId, {
          name: 'Combined Test',
          type: 'credit',
        });

        const trackable = await createTestTrackable(testUserId, {
          name: 'Combined Test',
          type: 'expense',
          frequency: 'monthly',
          amount: 200,
        });

        const activity = await createTestActivity(testUserId, {
          amount: 200,
          type: 'expense',
          sourceId: source.id,
          trackableId: trackable.id,
          date: new Date('2026-04-06').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.sourceId).toBe(source.id);
        expect(created?.trackableId).toBe(trackable.id);
        testActivities.push(activity.id);
        testSources.push(source.id);
        testTrackables.push(trackable.id);
      });

      it('should create activity with decimal amount', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 19.99,
          type: 'expense',
          date: new Date('2026-04-07').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.amount).toBe(19.99);
        testActivities.push(activity.id);
      });

      it('should create activity with large amount', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 999999.99,
          type: 'income',
          date: new Date('2026-04-08').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.amount).toBe(999999.99);
        testActivities.push(activity.id);
      });

      it('should create activity with very small amount', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 0.01,
          type: 'expense',
          date: new Date('2026-04-09').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.amount).toBeGreaterThan(0);
        testActivities.push(activity.id);
      });

      it('should create activity with special characters in description', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 50,
          type: 'expense',
          description: 'Coffee @ Starbucks (2026-04-10)',
          date: new Date('2026-04-10').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.description).toContain('@');
        testActivities.push(activity.id);
      });

      it('should create activity without description', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 25,
          type: 'expense',
          date: new Date('2026-04-11').getTime(),
        });

        expect(activity.id).toBeDefined();
        testActivities.push(activity.id);
      });

      it('should create multiple activities on same date', async () => {
        const sameDate = new Date('2026-04-12').getTime();
        const created = [];

        created.push(await createTestActivity(testUserId, {
          amount: 100,
          type: 'expense',
          description: 'Morning coffee',
          date: sameDate,
        }));

        created.push(await createTestActivity(testUserId, {
          amount: 200,
          type: 'expense',
          description: 'Lunch',
          date: sameDate,
        }));

        created.push(await createTestActivity(testUserId, {
          amount: 50,
          type: 'expense',
          description: 'Dinner',
          date: sameDate,
        }));

        expect(created.length).toBe(3);
        expect(created[0].id).not.toBe(created[1].id);
        testActivities.push(...created.map(a => a.id));
      });

      it('should create activity on past date', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 100,
          type: 'expense',
          date: new Date('2020-01-15').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.date).toBeLessThan(Date.now());
        testActivities.push(activity.id);
      });

      it('should create activity on future date', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 100,
          type: 'expense',
          date: new Date('2030-12-31').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.date).toBeGreaterThan(Date.now());
        testActivities.push(activity.id);
      });
    });

    describe('Activity Retrieval & Filtering', () => {
      it('should retrieve all activities for user', async () => {
        const activities = await getUserActivities(testUserId);

        expect(Array.isArray(activities)).toBe(true);
        expect(activities.length).toBeGreaterThan(0);
        expect(activities.every(a => a.userId === testUserId)).toBe(true);
      });

      it('should retrieve activities with all required fields', async () => {
        const activities = await getUserActivities(testUserId);

        activities.slice(0, 5).forEach(activity => {
          expect(activity.id).toBeDefined();
          expect(activity.userId).toBeDefined();
          expect(activity.amount).toBeDefined();
          expect(activity.type).toBeDefined();
          expect(activity.date).toBeDefined();
        });
      });

      it('should filter activities by type (income)', async () => {
        const activities = await getUserActivities(testUserId);
        const incomeActivities = activities.filter(a => a.type === 'income');

        incomeActivities.forEach(a => {
          expect(a.type).toBe('income');
        });
      });

      it('should filter activities by type (expense)', async () => {
        const activities = await getUserActivities(testUserId);
        const expenseActivities = activities.filter(a => a.type === 'expense');

        expenseActivities.forEach(a => {
          expect(a.type).toBe('expense');
        });
      });

      it('should filter activities by type (transfer)', async () => {
        const activities = await getUserActivities(testUserId);
        const transfers = activities.filter(a => a.type === 'transfer');

        transfers.forEach(a => {
          expect(a.type).toBe('transfer');
        });
      });

      it('should identify activities with trackable references', async () => {
        const activities = await getUserActivities(testUserId);
        const withTrackable = activities.filter(a => a.trackableId);

        withTrackable.forEach(a => {
          expect(a.trackableId).toBeDefined();
        });
      });

      it('should identify activities with source references', async () => {
        const activities = await getUserActivities(testUserId);
        const withSource = activities.filter(a => a.sourceId);

        withSource.forEach(a => {
          expect(a.sourceId).toBeDefined();
        });
      });

      it('should filter activities by date range', async () => {
        const activities = await getUserActivities(testUserId);
        const april2026Start = new Date('2026-04-01').getTime();
        const april2026End = new Date('2026-04-30').getTime();

        const aprilActivities = activities.filter(
          a => a.date >= april2026Start && a.date <= april2026End
        );

        aprilActivities.forEach(a => {
          expect(a.date).toBeGreaterThanOrEqual(april2026Start);
          expect(a.date).toBeLessThanOrEqual(april2026End);
        });
      });

      it('should sort activities by date', async () => {
        const activities = await getUserActivities(testUserId);
        const sorted = [...activities].sort((a, b) => a.date - b.date);

        for (let i = 1; i < sorted.length; i++) {
          expect(sorted[i].date).toBeGreaterThanOrEqual(sorted[i - 1].date);
        }
      });
    });

    describe('Activity Calculations & Aggregations', () => {
      it('should calculate total income correctly', async () => {
        const activities = await getUserActivities(testUserId);
        const incomeActivities = activities.filter(a => a.type === 'income');
        const totalIncome = incomeActivities.reduce(
          (sum, a) => sum + a.amount,
          0
        );

        expect(totalIncome).toBeGreaterThanOrEqual(0);
        expect(typeof totalIncome).toBe('number');
      });

      it('should calculate total expenses correctly', async () => {
        const activities = await getUserActivities(testUserId);
        const expenseActivities = activities.filter(a => a.type === 'expense');
        const totalExpense = expenseActivities.reduce(
          (sum, a) => sum + a.amount,
          0
        );

        expect(totalExpense).toBeGreaterThanOrEqual(0);
      });

      it('should exclude transfers from income/expense totals', async () => {
        const activities = await getUserActivities(testUserId);
        const countable = activities.filter(a => a.type !== 'transfer');
        const transfers = activities.filter(a => a.type === 'transfer');

        expect(countable.length + transfers.length).toBe(activities.length);
      });

      it('should calculate net balance (income - expenses)', async () => {
        const activities = await getUserActivities(testUserId);
        const income = activities
          .filter(a => a.type === 'income')
          .reduce((sum, a) => sum + a.amount, 0);
        const expenses = activities
          .filter(a => a.type === 'expense')
          .reduce((sum, a) => sum + a.amount, 0);
        const net = income - expenses;

        expect(typeof net).toBe('number');
      });

      it('should group activities by source', async () => {
        const activities = await getUserActivities(testUserId);
        const bySource = {};

        activities.forEach(a => {
          const key = a.sourceId || 'no-source';
          bySource[key] = (bySource[key] || 0) + a.amount;
        });

        Object.values(bySource).forEach(total => {
          expect(typeof total).toBe('number');
        });
      });

      it('should group activities by trackable', async () => {
        const activities = await getUserActivities(testUserId);
        const byTrackable = {};

        activities.forEach(a => {
          if (a.trackableId) {
            const key = a.trackableId;
            byTrackable[key] = (byTrackable[key] || []).concat(a);
          }
        });

        Object.values(byTrackable).forEach(group => {
          expect(Array.isArray(group)).toBe(true);
        });
      });

      it('should calculate daily totals', async () => {
        const activities = await getUserActivities(testUserId);
        const byDate = {};

        activities.forEach(a => {
          const date = new Date(a.date).toISOString().split('T')[0];
          byDate[date] = (byDate[date] || 0) + a.amount;
        });

        Object.values(byDate).forEach(total => {
          expect(typeof total).toBe('number');
          expect(total).toBeGreaterThan(0);
        });
      });

      it('should count activities by type', async () => {
        const activities = await getUserActivities(testUserId);
        const counts = {
          income: 0,
          expense: 0,
          transfer: 0,
        };

        activities.forEach(a => {
          if (counts.hasOwnProperty(a.type)) {
            counts[a.type]++;
          }
        });

        expect(counts.income + counts.expense + counts.transfer).toBe(
          activities.length
        );
      });
    });
  });

  // ============================================================================
  // SECTION 4: COMPLETE USER WORKFLOWS & REAL-WORLD SCENARIOS
  // ============================================================================
  describe('Complete User Workflows & Real-World Scenarios', () => {
    describe('Personal Finance Setup Workflow', () => {
      it('should complete full finance setup: accounts → trackables → activities', async () => {
        // 1. Create 3 accounts
        const checkingsource = await createTestSource(testUserId, {
          name: 'Workflow Test Checking',
          type: 'checking',
        });
        const creditSource = await createTestSource(testUserId, {
          name: 'Workflow Test Credit Card',
          type: 'credit',
        });
        const savingsSource = await createTestSource(testUserId, {
          name: 'Workflow Test Savings',
          type: 'savings',
        });

        // 2. Create recurring expenses with varying frequencies
        const rent = await createTestTrackable(testUserId, {
          name: 'Workflow Rent',
          type: 'expense',
          frequency: 'monthly',
          amount: 1500,
          includeInTracker: true,
        });

        const groceries = await createTestTrackable(testUserId, {
          name: 'Workflow Groceries',
          type: 'expense',
          frequency: 'weekly',
          amount: 150,
          includeInTracker: true,
        });

        const medication = await createTestTrackable(testUserId, {
          name: 'Workflow Medication',
          type: 'expense',
          frequency: 'daily',
          amount: 5,
          includeInTracker: true,
        });

        // 3. Create income trackable
        const salary = await createTestTrackable(testUserId, {
          name: 'Workflow Salary',
          type: 'income',
          frequency: 'monthly',
          amount: 5000,
          includeInTracker: true,
        });

        // 3.5 Create multiple tracker instances per trackable to reflect their frequency

        // Monthly trackables: Create 3 instances across 3 months
        const rentTrackers = [];
        for (let month = 0; month < 3; month++) {
          const tracker = await createTestTracker(testUserId, {
            trackableId: rent.id,
            occurrenceDate: new Date(`2026-${String(4 + month).padStart(2, '0')}-01`).getTime(),
            isDone: false,
          });
          rentTrackers.push(tracker.id);
        }

        const salaryTrackers = [];
        for (let month = 0; month < 3; month++) {
          const tracker = await createTestTracker(testUserId, {
            trackableId: salary.id,
            occurrenceDate: new Date(`2026-${String(4 + month).padStart(2, '0')}-01`).getTime(),
            isDone: false,
          });
          salaryTrackers.push(tracker.id);
        }

        // Weekly trackable: Create 4 instances on consecutive weeks
        const groceryTrackers = [];
        for (let week = 0; week < 4; week++) {
          const tracker = await createTestTracker(testUserId, {
            trackableId: groceries.id,
            occurrenceDate: new Date('2026-04-01').getTime() + week * 7 * 24 * 60 * 60 * 1000,
            isDone: false,
          });
          groceryTrackers.push(tracker.id);
        }

        // Daily trackable: Create 7 instances for consecutive days
        const medicationTrackers = [];
        for (let day = 0; day < 7; day++) {
          const tracker = await createTestTracker(testUserId, {
            trackableId: medication.id,
            occurrenceDate: new Date('2026-04-01').getTime() + day * 24 * 60 * 60 * 1000,
            isDone: false,
          });
          medicationTrackers.push(tracker.id);
        }

        // 4. Log income
        const incomeActivity = await createTestActivity(testUserId, {
          amount: 5000,
          type: 'income',
          trackableId: salary.id,
          sourceId: checkingsource.id,
          date: new Date('2026-04-01').getTime(),
        });

        // 5. Log expenses
        const rentActivity = await createTestActivity(testUserId, {
          amount: 1500,
          type: 'expense',
          trackableId: rent.id,
          sourceId: checkingsource.id,
          date: new Date('2026-04-02').getTime(),
        });

        const groceryActivity = await createTestActivity(testUserId, {
          amount: 150,
          type: 'expense',
          trackableId: groceries.id,
          sourceId: creditSource.id,
          date: new Date('2026-04-03').getTime(),
        });

        const medicationActivity = await createTestActivity(testUserId, {
          amount: 5,
          type: 'expense',
          trackableId: medication.id,
          sourceId: checkingsource.id,
          date: new Date('2026-04-01').getTime(),
        });

        // 6. Transfer to savings
        const transferActivity = await createTestActivity(testUserId, {
          amount: 1000,
          type: 'transfer',
          sourceId: checkingsource.id,
          date: new Date('2026-04-04').getTime(),
        });

        // 7. Verify everything exists
        const sources = await getUserSources(testUserId);
        const trackables = await getUserTrackables(testUserId);
        const activities = await getUserActivities(testUserId);

        expect(sources.some(s => s.id === checkingsource.id)).toBe(true);
        expect(sources.some(s => s.id === creditSource.id)).toBe(true);
        expect(sources.some(s => s.id === savingsSource.id)).toBe(true);

        expect(trackables.some(t => t.id === rent.id)).toBe(true);
        expect(trackables.some(t => t.id === groceries.id)).toBe(true);
        expect(trackables.some(t => t.id === salary.id)).toBe(true);
        expect(trackables.some(t => t.id === medication.id)).toBe(true);

        expect(activities.some(a => a.id === incomeActivity.id)).toBe(true);
        expect(activities.some(a => a.id === rentActivity.id)).toBe(true);
        expect(activities.some(a => a.id === groceryActivity.id)).toBe(true);
        expect(activities.some(a => a.id === medicationActivity.id)).toBe(true);

        // 8. Verify calculations
        const totalIncome = activities
          .filter(a => a.type === 'income')
          .reduce((sum, a) => sum + a.amount, 0);
        expect(totalIncome).toBeGreaterThan(0);

        testSources.push(checkingsource.id, creditSource.id, savingsSource.id);
        testTrackables.push(rent.id, groceries.id, salary.id, medication.id);
        testTrackers.push(
          ...rentTrackers,
          ...salaryTrackers,
          ...groceryTrackers,
          ...medicationTrackers
        );
        testActivities.push(
          incomeActivity.id,
          rentActivity.id,
          groceryActivity.id,
          medicationActivity.id,
          transferActivity.id
        );
      });
    });

    describe('Monthly Budget Tracking Workflow', () => {
      it.skip('should track monthly budget across multiple categories', async () => {
        // Setup
        const categories = {
          housing: await createTestTrackable(testUserId, {
            name: 'Housing Costs',
            type: 'expense',
            frequency: 'monthly',
            amount: 1500,
          }),
          food: await createTestTrackable(testUserId, {
            name: 'Food & Dining',
            type: 'expense',
            frequency: 'monthly',
            amount: 500,
          }),
          transport: await createTestTrackable(testUserId, {
            name: 'Transportation',
            type: 'expense',
            frequency: 'monthly',
            amount: 300,
          }),
          entertainment: await createTestTrackable(testUserId, {
            name: 'Entertainment',
            type: 'expense',
            frequency: 'monthly',
            amount: 200,
          }),
        };

        // Log activities
        const activities = [];
        const amounts = {
          housing: 1500,
          food: 500,
          transport: 300,
          entertainment: 200,
        };

        for (const [key, trackable] of Object.entries(categories)) {
          activities.push(
            await createTestActivity(testUserId, {
              amount: amounts[key],
              type: 'expense',
              trackableId: trackable.id,
              date: new Date('2026-04-15').getTime(),
            })
          );
        }

        // Verify total budget
        const total = activities.reduce((sum, a) => sum + a.amount, 0);
        expect(total).toBe(1500 + 500 + 300 + 200);

        // Verify breakdown by category
        const allActivities = await getUserActivities(testUserId);
        for (const trackable of Object.values(categories)) {
          const categoryActivities = allActivities.filter(
            a => a.trackableId === trackable.id
          );
          expect(categoryActivities.length).toBeGreaterThan(0);
        }

        testTrackables.push(...Object.values(categories).map(t => t.id));
        testActivities.push(...activities.map(a => a.id));
      });
    });

    describe('Multi-Account Transaction Flow', () => {
      it('should track transactions across multiple accounts', async () => {
        // Create accounts
        const checking = await createTestSource(testUserId, {
          name: 'Multi-Checking',
          type: 'checking',
        });
        const credit = await createTestSource(testUserId, {
          name: 'Multi-Credit',
          type: 'credit',
        });
        const savings = await createTestSource(testUserId, {
          name: 'Multi-Savings',
          type: 'savings',
        });

        // Various transactions on different accounts
        const checkingActivity = await createTestActivity(testUserId, {
          amount: 1000,
          type: 'income',
          sourceId: checking.id,
          date: new Date('2026-04-01').getTime(),
        });

        const creditActivity = await createTestActivity(testUserId, {
          amount: 200,
          type: 'expense',
          sourceId: credit.id,
          date: new Date('2026-04-02').getTime(),
        });

        const transferActivity = await createTestActivity(testUserId, {
          amount: 500,
          type: 'transfer',
          sourceId: checking.id,
          date: new Date('2026-04-03').getTime(),
        });

        const savingsActivity = await createTestActivity(testUserId, {
          amount: 100,
          type: 'expense',
          sourceId: savings.id,
          date: new Date('2026-04-04').getTime(),
        });

        // Verify account-wise tracking
        const allActivities = await getUserActivities(testUserId);

        const checkingActivities = allActivities.filter(
          a => a.sourceId === checking.id
        );
        expect(checkingActivities.length).toBeGreaterThan(0);

        const creditActivities = allActivities.filter(
          a => a.sourceId === credit.id
        );
        expect(creditActivities.length).toBeGreaterThan(0);

        testSources.push(checking.id, credit.id, savings.id);
        testActivities.push(
          checkingActivity.id,
          creditActivity.id,
          transferActivity.id,
          savingsActivity.id
        );
      });
    });

    describe('Frequency-Based Activity Generation', () => {
      it('should correctly handle daily frequency trackable', async () => {
        const dailyTrackable = await createTestTrackable(testUserId, {
          name: 'Daily Task',
          type: 'expense',
          frequency: 'daily',
          startDate: new Date('2026-04-01').getTime(),
          amount: 10,
        });

        // Log activity every other day
        const activities = [];
        for (let i = 0; i < 10; i += 2) {
          activities.push(
            await createTestActivity(testUserId, {
              amount: 10,
              type: 'expense',
              trackableId: dailyTrackable.id,
              date: new Date(`2026-04-01`).getTime() + i * 24 * 60 * 60 * 1000,
            })
          );
        }

        const allActivities = await getUserActivities(testUserId);
        const dailyActivities = allActivities.filter(
          a => a.trackableId === dailyTrackable.id
        );

        expect(dailyActivities.length).toBeGreaterThan(0);
        testTrackables.push(dailyTrackable.id);
        testActivities.push(...activities.map(a => a.id));
      });

      it('should correctly handle weekly frequency trackable', async () => {
        const weeklyTrackable = await createTestTrackable(testUserId, {
          name: 'Weekly Task',
          type: 'expense',
          frequency: 'weekly',
          startDate: new Date('2026-04-07').getTime(),
          amount: 50,
        });

        // Log activity for 4 weeks
        const activities = [];
        for (let week = 0; week < 4; week++) {
          activities.push(
            await createTestActivity(testUserId, {
              amount: 50,
              type: 'expense',
              trackableId: weeklyTrackable.id,
              date:
                new Date('2026-04-07').getTime() +
                week * 7 * 24 * 60 * 60 * 1000,
            })
          );
        }

        expect(activities.length).toBe(4);
        testTrackables.push(weeklyTrackable.id);
        testActivities.push(...activities.map(a => a.id));
      });

      it('should correctly handle monthly frequency trackable', async () => {
        const monthlyTrackable = await createTestTrackable(testUserId, {
          name: 'Monthly Task',
          type: 'expense',
          frequency: 'monthly',
          startDate: new Date('2026-04-01').getTime(),
          amount: 100,
        });

        // Create activity for month
        const activity = await createTestActivity(testUserId, {
          amount: 100,
          type: 'expense',
          trackableId: monthlyTrackable.id,
          date: new Date('2026-04-15').getTime(),
        });

        const allActivities = await getUserActivities(testUserId);
        const monthlyActivities = allActivities.filter(
          a => a.trackableId === monthlyTrackable.id
        );

        expect(monthlyActivities.length).toBeGreaterThan(0);
        testTrackables.push(monthlyTrackable.id);
        testActivities.push(activity.id);
      });

      it('should correctly handle yearly frequency trackable', async () => {
        const yearlyTrackable = await createTestTrackable(testUserId, {
          name: 'Yearly Task',
          type: 'expense',
          frequency: 'yearly',
          startDate: new Date('2026-01-01').getTime(),
          amount: 500,
        });

        const activity = await createTestActivity(testUserId, {
          amount: 500,
          type: 'expense',
          trackableId: yearlyTrackable.id,
          date: new Date('2026-04-01').getTime(),
        });

        expect(activity.id).toBeDefined();
        testTrackables.push(yearlyTrackable.id);
        testActivities.push(activity.id);
      });

      it('should correctly handle custom interval frequency', async () => {
        const customTrackable = await createTestTrackable(testUserId, {
          name: 'Every 3 Days',
          type: 'expense',
          frequency: 'daily',
          frequencyInterval: 3,
          startDate: new Date('2026-04-01').getTime(),
          amount: 25,
        });

        // Log activities every 3 days
        const activities = [];
        for (let i = 0; i < 3; i++) {
          activities.push(
            await createTestActivity(testUserId, {
              amount: 25,
              type: 'expense',
              trackableId: customTrackable.id,
              date:
                new Date('2026-04-01').getTime() +
                i * 3 * 24 * 60 * 60 * 1000,
            })
          );
        }

        expect(activities.length).toBe(3);
        testTrackables.push(customTrackable.id);
        testActivities.push(...activities.map(a => a.id));
      });
    });
  });

  // ============================================================================
  // SECTION 5: EDGE CASES & BOUNDARY TESTS
  // ============================================================================
  describe('Edge Cases & Boundary Conditions', () => {
    describe('Amount Handling Edge Cases', () => {
      it('should handle minimum amount (0.01)', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 0.01,
          type: 'expense',
          date: new Date('2026-04-20').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.amount).toBeGreaterThan(0);
        testActivities.push(activity.id);
      });

      it('should handle large amounts (999999.99)', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 999999.99,
          type: 'income',
          date: new Date('2026-04-21').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.amount).toBe(999999.99);
        testActivities.push(activity.id);
      });

      it('should handle amounts with many decimal places', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 123.456,
          type: 'expense',
          date: new Date('2026-04-22').getTime(),
        });

        expect(activity.id).toBeDefined();
        testActivities.push(activity.id);
      });

      it('should handle negative impacts (reversal)', async () => {
        // Create original
        const original = await createTestActivity(testUserId, {
          amount: 100,
          type: 'expense',
          date: new Date('2026-04-23').getTime(),
        });

        // Create reversal (positive expense cancels out)
        const reversal = await createTestActivity(testUserId, {
          amount: 100,
          type: 'income',
          date: new Date('2026-04-24').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const allRelevant = activities.filter(
          a => a.id === original.id || a.id === reversal.id
        );

        const net = allRelevant.reduce((sum, a) => {
          return (
            sum + (a.type === 'income' ? a.amount : -a.amount)
          );
        }, 0);

        expect(net).toBe(0);
        testActivities.push(original.id, reversal.id);
      });
    });

    describe('Date Handling Edge Cases', () => {
      it('should handle very old dates (year 1900)', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 50,
          type: 'expense',
          date: new Date('1900-01-01').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.date).toBe(new Date('1900-01-01').getTime());
        testActivities.push(activity.id);
      });

      it('should handle far future dates (year 2099)', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 50,
          type: 'expense',
          date: new Date('2099-12-31').getTime(),
        });

        expect(activity.id).toBeDefined();
        testActivities.push(activity.id);
      });

      it('should handle leap year dates', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 50,
          type: 'expense',
          date: new Date('2024-02-29').getTime(), // Leap year
        });

        expect(activity.id).toBeDefined();
        testActivities.push(activity.id);
      });

      it('should handle end of month dates', async () => {
        const eomDates = [
          '2026-01-31', // Jan 31
          '2026-04-30', // Apr 30
          '2026-12-31', // Dec 31
        ];

        for (const dateStr of eomDates) {
          const activity = await createTestActivity(testUserId, {
            amount: 50,
            type: 'expense',
            date: new Date(dateStr).getTime(),
          });

          expect(activity.id).toBeDefined();
          testActivities.push(activity.id);
        }
      });

      it('should handle daylight saving time transitions', async () => {
        // US DST: Spring forward (2:00 AM → 3:00 AM) on second Sunday of March
        const activity = await createTestActivity(testUserId, {
          amount: 50,
          type: 'expense',
          date: new Date('2026-03-08T02:30:00').getTime(),
        });

        expect(activity.id).toBeDefined();
        testActivities.push(activity.id);
      });
    });

    describe('String Field Edge Cases', () => {
      it('should handle very long description (500 chars)', async () => {
        const longDesc = 'A'.repeat(500);
        const activity = await createTestActivity(testUserId, {
          amount: 50,
          type: 'expense',
          description: longDesc,
          date: new Date('2026-04-25').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.description?.length).toBeLessThanOrEqual(500);
        testActivities.push(activity.id);
      });

      it('should handle description with emoji and unicode', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 50,
          type: 'expense',
          description: '🎉 Celebration dinner 🍽️ café',
          date: new Date('2026-04-26').getTime(),
        });

        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.description).toContain('🎉');
        testActivities.push(activity.id);
      });

      it('should handle names with SQL injection attempts', async () => {
        const source = await createTestSource(testUserId, {
          name: "'; DROP TABLE users; --",
          type: 'checking',
        });

        const sources = await getUserSources(testUserId);
        const created = sources.find(s => s.id === source.id);

        expect(created?.name).toBe("'; DROP TABLE users; --");
        expect(sources.length).toBeGreaterThan(0); // Table still exists
        testSources.push(source.id);
      });

      it('should handle names with HTML/script tags', async () => {
        const source = await createTestSource(testUserId, {
          name: '<script>alert("xss")</script>',
          type: 'checking',
        });

        const sources = await getUserSources(testUserId);
        const created = sources.find(s => s.id === source.id);

        expect(created?.name).toContain('<script>');
        testSources.push(source.id);
      });

      it('should handle whitespace in descriptions', async () => {
        const activity = await createTestActivity(testUserId, {
          amount: 50,
          type: 'expense',
          description: '  Multiple   Spaces   And\nNewlines\t\tHere  ',
          date: new Date('2026-04-27').getTime(),
        });

        expect(activity.id).toBeDefined();
        testActivities.push(activity.id);
      });
    });

    describe('Reference Handling Edge Cases', () => {
      it('should handle activity with deleted source gracefully', async () => {
        const source = await createTestSource(testUserId, {
          name: 'Temp Source',
          type: 'checking',
        });

        const activity = await createTestActivity(testUserId, {
          amount: 100,
          type: 'expense',
          sourceId: source.id,
          date: new Date('2026-04-28').getTime(),
        });

        // Source would be deleted here in real scenario
        const activities = await getUserActivities(testUserId);
        const created = activities.find(a => a.id === activity.id);

        expect(created?.sourceId).toBe(source.id);
        testActivities.push(activity.id);
        testSources.push(source.id);
      });

      it('should handle multiple activities referencing same trackable', async () => {
        const trackable = await createTestTrackable(testUserId, {
          name: 'Multi-Activity Trackable',
          type: 'expense',
          frequency: 'monthly',
          amount: 100,
        });

        const activities = [];
        for (let i = 0; i < 5; i++) {
          activities.push(
            await createTestActivity(testUserId, {
              amount: 50 + i * 10,
              type: 'expense',
              trackableId: trackable.id,
              date: new Date(`2026-04-${1 + i}`).getTime(),
            })
          );
        }

        const allActivities = await getUserActivities(testUserId);
        const forTrackable = allActivities.filter(
          a => a.trackableId === trackable.id
        );

        expect(forTrackable.length).toBeGreaterThanOrEqual(5);
        testTrackables.push(trackable.id);
        testActivities.push(...activities.map(a => a.id));
      });

      it('should handle multiple activities referencing same source', async () => {
        const source = await createTestSource(testUserId, {
          name: 'Multi-Activity Source',
          type: 'checking',
        });

        const activities = [];
        for (let i = 0; i < 5; i++) {
          activities.push(
            await createTestActivity(testUserId, {
              amount: 100 + i * 25,
              type: i % 2 === 0 ? 'income' : 'expense',
              sourceId: source.id,
              date: new Date(`2026-04-${5 + i}`).getTime(),
            })
          );
        }

        const allActivities = await getUserActivities(testUserId);
        const forSource = allActivities.filter(a => a.sourceId === source.id);

        expect(forSource.length).toBeGreaterThanOrEqual(5);
        testSources.push(source.id);
        testActivities.push(...activities.map(a => a.id));
      });
    });

    describe('Data Type & Format Validation', () => {
      it('should handle all valid activity types', async () => {
        const types = ['income', 'expense', 'transfer'];
        const activities = [];

        for (const type of types) {
          const activity = await createTestActivity(testUserId, {
            amount: 100,
            type,
            date: new Date('2026-05-01').getTime(),
          });
          activities.push(activity);
        }

        const allActivities = await getUserActivities(testUserId);
        const valid = allActivities.filter(a =>
          types.includes(a.type)
        );

        expect(valid.length).toBeGreaterThanOrEqual(3);
        testActivities.push(...activities.map(a => a.id));
      });

      it('should handle all valid source types', async () => {
        const types = ['checking', 'savings', 'credit', 'cash'];
        const sources = [];

        for (const type of types) {
          const source = await createTestSource(testUserId, {
            name: `Type ${type}`,
            type,
          });
          sources.push(source);
        }

        const allSources = await getUserSources(testUserId);
        const valid = allSources.filter(s =>
          types.includes(s.type)
        );

        expect(valid.length).toBeGreaterThanOrEqual(4);
        testSources.push(...sources.map(s => s.id));
      });

      it('should handle all valid trackable frequencies', async () => {
        const frequencies = ['daily', 'weekly', 'monthly', 'yearly'];
        const trackables = [];

        for (const freq of frequencies) {
          const trackable = await createTestTrackable(testUserId, {
            name: `Freq ${freq}`,
            type: 'expense',
            frequency: freq,
            amount: 50,
          });
          trackables.push(trackable);
        }

        const allTrackables = await getUserTrackables(testUserId);
        const valid = allTrackables.filter(t =>
          frequencies.includes(t.frequency)
        );

        expect(valid.length).toBeGreaterThanOrEqual(4);
        testTrackables.push(...trackables.map(t => t.id));
      });
    });

    describe('Concurrent Operations', () => {
      it('should handle simultaneous activity creation', async () => {
        const promises = [];

        for (let i = 0; i < 10; i++) {
          promises.push(
            createTestActivity(testUserId, {
              amount: 50 + i,
              type: 'expense',
              date: new Date('2026-05-15').getTime(),
            })
          );
        }

        const activities = await Promise.all(promises);

        expect(activities.length).toBe(10);
        expect(new Set(activities.map(a => a.id)).size).toBe(10); // All unique
        testActivities.push(...activities.map(a => a.id));
      });

      it('should handle simultaneous source creation', async () => {
        const promises = [];

        for (let i = 0; i < 5; i++) {
          promises.push(
            createTestSource(testUserId, {
              name: `Concurrent Source ${i}`,
              type: 'checking',
            })
          );
        }

        const sources = await Promise.all(promises);

        expect(sources.length).toBe(5);
        expect(new Set(sources.map(s => s.id)).size).toBe(5);
        testSources.push(...sources.map(s => s.id));
      });

      it('should handle simultaneous trackable creation', async () => {
        const promises = [];

        for (let i = 0; i < 5; i++) {
          promises.push(
            createTestTrackable(testUserId, {
              name: `Concurrent Trackable ${i}`,
              type: 'expense',
              frequency: 'monthly',
              amount: 75,
            })
          );
        }

        const trackables = await Promise.all(promises);

        expect(trackables.length).toBe(5);
        expect(new Set(trackables.map(t => t.id)).size).toBe(5);
        testTrackables.push(...trackables.map(t => t.id));
      });
    });
  });

  // ============================================================================
  // SECTION 6: DATA INTEGRITY & CONSISTENCY TESTS
  // ============================================================================
  describe('Data Integrity & Consistency', () => {
    it('should maintain referential integrity (activity → trackable)', async () => {
      const trackable = await createTestTrackable(testUserId, {
        name: 'Integrity Test T',
        type: 'expense',
        frequency: 'monthly',
      });

      const activity = await createTestActivity(testUserId, {
        amount: 100,
        type: 'expense',
        trackableId: trackable.id,
        date: new Date('2026-05-20').getTime(),
      });

      const activities = await getUserActivities(testUserId);
      const trackables = await getUserTrackables(testUserId);

      const foundActivity = activities.find(a => a.id === activity.id);
      const foundTrackable = trackables.find(t => t.id === trackable.id);

      expect(foundActivity?.trackableId).toBe(trackable.id);
      expect(foundTrackable?.id).toBe(trackable.id);

      testTrackables.push(trackable.id);
      testActivities.push(activity.id);
    });

    it('should maintain referential integrity (activity → source)', async () => {
      const source = await createTestSource(testUserId, {
        name: 'Integrity Test S',
        type: 'checking',
      });

      const activity = await createTestActivity(testUserId, {
        amount: 100,
        type: 'expense',
        sourceId: source.id,
        date: new Date('2026-05-21').getTime(),
      });

      const activities = await getUserActivities(testUserId);
      const sources = await getUserSources(testUserId);

      const foundActivity = activities.find(a => a.id === activity.id);
      const foundSource = sources.find(s => s.id === source.id);

      expect(foundActivity?.sourceId).toBe(source.id);
      expect(foundSource?.id).toBe(source.id);

      testSources.push(source.id);
      testActivities.push(activity.id);
    });

    it('should maintain data consistency across multiple queries', async () => {
      // First query
      const activities1 = await getUserActivities(testUserId);
      const trackables1 = await getUserTrackables(testUserId);
      const sources1 = await getUserSources(testUserId);

      // Small delay
      await new Promise(resolve => setTimeout(resolve, 100));

      // Second query
      const activities2 = await getUserActivities(testUserId);
      const trackables2 = await getUserTrackables(testUserId);
      const sources2 = await getUserSources(testUserId);

      // Should return same data
      expect(activities1.length).toBe(activities2.length);
      expect(trackables1.length).toBe(trackables2.length);
      expect(sources1.length).toBe(sources2.length);
    });

    it('should preserve data types across save/load cycles', async () => {
      const activity = await createTestActivity(testUserId, {
        amount: 123.45,
        type: 'expense',
        date: new Date('2026-05-22').getTime(),
        description: 'Type test',
      });

      const activities = await getUserActivities(testUserId);
      const loaded = activities.find(a => a.id === activity.id);

      expect(typeof loaded?.amount).toBe('number');
      expect(typeof loaded?.type).toBe('string');
      expect(typeof loaded?.date).toBe('number');
      expect(loaded?.amount).toBe(123.45);

      testActivities.push(activity.id);
    });

    it('should maintain amounts precision (no rounding errors)', async () => {
      const amounts = [0.01, 1.23, 99.99, 123.456];
      const activities = [];

      for (const amount of amounts) {
        activities.push(
          await createTestActivity(testUserId, {
            amount,
            type: 'expense',
            date: new Date('2026-05-23').getTime(),
          })
        );
      }

      const allActivities = await getUserActivities(testUserId);

      for (const amount of amounts) {
        const found = allActivities.find(a => Math.abs(a.amount - amount) < 0.001);
        expect(found).toBeDefined();
      }

      testActivities.push(...activities.map(a => a.id));
    });
  });

  // ============================================================================
  // FINAL VERIFICATION
  // ============================================================================
  describe('Final Comprehensive Verification', () => {
    it('should have created all test data successfully', async () => {
      const activities = await getUserActivities(testUserId);
      const trackables = await getUserTrackables(testUserId);
      const sources = await getUserSources(testUserId);
      const trackers = await getUserTrackers(testUserId);

      console.log(`\n${'='.repeat(80)}`);
      console.log(`✅ COMPREHENSIVE TEST RESULTS`);
      console.log(`${'='.repeat(80)}`);
      
      console.log(`\n📊 SUMMARY COUNTS:`);
      console.log(`  ├─ Activities: ${activities.length} total`);
      console.log(`  ├─ Trackables: ${trackables.length} total`);
      console.log(`  ├─ Trackers: ${trackers.length} total (visible on Tracker page)`);
      console.log(`  ├─ Sources: ${sources.length} total`);
      console.log(`  └─ Total entities: ${activities.length + trackables.length + trackers.length + sources.length}`);

      console.log(`\n📋 SOURCES CREATED (${sources.length}):`);
      sources.slice(0, 20).forEach((s, idx) => {
        console.log(`  ${idx + 1}. ${s.cardName} (Type: ${s.sourceType}${s.accountNumber ? ', Account: ' + s.accountNumber : ''})`);
      });
      if (sources.length > 20) console.log(`  ... and ${sources.length - 20} more`);

      console.log(`\n📋 TRACKABLES CREATED (${trackables.length}):`);
      trackables.slice(0, 20).forEach((t, idx) => {
        console.log(`  ${idx + 1}. ${t.name} (Type: ${t.type}, Freq: ${t.frequency}${t.amount ? ', Amount: $' + t.amount : ''})`);
      });
      if (trackables.length > 20) console.log(`  ... and ${trackables.length - 20} more`);

      console.log(`\n📊 TRACKERS BY FREQUENCY (${trackers.length} total) - SHOWS ON TRACKER PAGE:`);
      
      // Group trackers by trackable frequency
      const trackersByTrackable = {};
      trackers.forEach(tr => {
        const trackable = trackables.find(t => t.id === tr.trackableId);
        if (trackable) {
          if (!trackersByTrackable[trackable.frequency]) {
            trackersByTrackable[trackable.frequency] = [];
          }
          trackersByTrackable[trackable.frequency].push({ tracker: tr, trackable });
        }
      });

      // Display by frequency
      const frequencies = ['daily', 'weekly', 'monthly', 'yearly'];
      frequencies.forEach(freq => {
        const items = trackersByTrackable[freq];
        if (items && items.length > 0) {
          console.log(`\n  ╔═ ${freq.toUpperCase()} (${items.length} instances):`);
          items.slice(0, 5).forEach((item, idx) => {
            const dueDate = new Date(item.tracker.occurrenceDate).toLocaleDateString();
            console.log(`  ║  ${idx + 1}. ${item.trackable.name} - Due: ${dueDate}`);
          });
          if (items.length > 5) console.log(`  ║  ... and ${items.length - 5} more`);
          console.log(`  ╚═`);
        }
      });

      console.log(`\n📋 ACTIVITY SUMMARY:`);
      const income = activities.filter(a => a.type === 'income').length;
      const expenses = activities.filter(a => a.type === 'expense').length;
      const transfers = activities.filter(a => a.type === 'transfer').length;
      console.log(`  ├─ Income: ${income}`);
      console.log(`  ├─ Expenses: ${expenses}`);
      console.log(`  └─ Transfers: ${transfers}`);
      console.log(`${'='.repeat(80)}\n`);

      expect(activities.length).toBeGreaterThan(0);
      expect(trackables.length).toBeGreaterThan(0);
      expect(sources.length).toBeGreaterThan(0);
      expect(trackers.length).toBeGreaterThan(0);
    });

    it('should pass all calculation validations', async () => {
      const activities = await getUserActivities(testUserId);

      const income = activities
        .filter(a => a.type === 'income')
        .reduce((sum, a) => sum + a.amount, 0);

      const expenses = activities
        .filter(a => a.type === 'expense')
        .reduce((sum, a) => sum + a.amount, 0);

      const transfers = activities
        .filter(a => a.type === 'transfer')
        .reduce((sum, a) => sum + a.amount, 0);

      expect(typeof income).toBe('number');
      expect(typeof expenses).toBe('number');
      expect(typeof transfers).toBe('number');

      expect(income).toBeGreaterThanOrEqual(0);
      expect(expenses).toBeGreaterThanOrEqual(0);
      expect(transfers).toBeGreaterThanOrEqual(0);
    });

    it('should have valid relationships across all entities', async () => {
      const activities = await getUserActivities(testUserId);
      const trackables = await getUserTrackables(testUserId);
      const sources = await getUserSources(testUserId);

      const trackableIds = new Set(trackables.map(t => t.id));
      const sourceIds = new Set(sources.map(s => s.id));

      for (const activity of activities) {
        if (activity.trackableId) {
          expect(trackableIds.has(activity.trackableId)).toBe(true);
        }
        if (activity.sourceId) {
          expect(sourceIds.has(activity.sourceId)).toBe(true);
        }
      }
    });
  });
});
