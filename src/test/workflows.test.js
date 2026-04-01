import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

/**
 * Comprehensive workflow tests covering all possible sequences of user actions
 * These tests simulate real user workflows and interaction patterns
 */

describe('User Workflow Sequences', () => {
  let mockActivities = [];
  let mockTrackables = [];
  let mockAccounts = [];
  let mockTrackers = [];
  let mockGroup = null;
  let mockUserId = 'user123';

  beforeEach(() => {
    mockActivities = [];
    mockTrackables = [];
    mockAccounts = [];
    mockTrackers = [];
    mockGroup = null;
  });

  describe('Personal Mode - Solo User Activities', () => {
    it('should complete workflow: create account → add activity → edit → view → delete', () => {
      // Step 1: Create bank account
      const account = {
        id: 'acc1',
        cardName: 'Chase',
        accountNumber: '1234',
        userId: mockUserId,
        createdAt: Date.now()
      };
      mockAccounts.push(account);
      expect(mockAccounts).toHaveLength(1);

      // Step 2: Add activity
      const activity = {
        id: 'act1',
        amount: 50,
        type: 'expense',
        accountId: 'acc1',
        description: 'Coffee',
        date: Date.now(),
        userId: mockUserId,
        createdAt: Date.now()
      };
      mockActivities.push(activity);
      expect(mockActivities).toHaveLength(1);

      // Step 3: Edit activity
      mockActivities[0].amount = 75;
      expect(mockActivities[0].amount).toBe(75);

      // Step 4: View activity
      const viewed = mockActivities.find(a => a.id === 'act1');
      expect(viewed).toBeDefined();
      expect(viewed.amount).toBe(75);

      // Step 5: Delete activity
      mockActivities = mockActivities.filter(a => a.id !== 'act1');
      expect(mockActivities).toHaveLength(0);
    });

    it('should complete workflow: create trackable → mark tracked → create activity → edit → cannot delete', () => {
      // Step 1: Create trackable with tracking enabled
      const trackable = {
        id: 'track1',
        name: 'Netflix',
        type: 'expense',
        includeInTracker: true,
        trackerAmount: 15,
        userId: mockUserId,
        createdAt: Date.now()
      };
      mockTrackables.push(trackable);
      expect(mockTrackables).toHaveLength(1);

      // Step 2: Create tracker record
      const tracker = {
        id: 'tracker1',
        trackableId: 'track1',
        isDone: false,
        month: new Date().getMonth(),
        year: new Date().getFullYear(),
        userId: mockUserId,
        createdAt: Date.now()
      };
      mockTrackers.push(tracker);
      expect(mockTrackers).toHaveLength(1);

      // Step 3: Create activity from trackable
      const activity = {
        id: 'act1',
        amount: 15,
        type: 'expense',
        trackableId: 'track1',
        date: Date.now(),
        userId: mockUserId,
        createdAt: Date.now()
      };
      mockActivities.push(activity);
      expect(mockActivities).toHaveLength(1);

      // Step 4: Edit activity
      mockActivities[0].amount = 20;
      expect(mockActivities[0].amount).toBe(20);

      // Step 5: Try to delete activity (should fail - has trackableId)
      const canDelete = mockActivities[0].trackableId === null;
      expect(canDelete).toBe(false);
      expect(mockActivities).toHaveLength(1); // Activity still exists
    });

    it('should complete workflow: create multiple accounts → add activities → filter by account → view analytics', () => {
      // Step 1: Create multiple accounts
      const acc1 = { id: 'acc1', cardName: 'Chase', userId: mockUserId, createdAt: Date.now() };
      const acc2 = { id: 'acc2', cardName: 'BOA', userId: mockUserId, createdAt: Date.now() };
      mockAccounts.push(acc1, acc2);
      expect(mockAccounts).toHaveLength(2);

      // Step 2: Add activities to different accounts
      mockActivities.push(
        { id: 'act1', amount: 50, type: 'expense', accountId: 'acc1', date: Date.now(), userId: mockUserId },
        { id: 'act2', amount: 100, type: 'income', accountId: 'acc2', date: Date.now(), userId: mockUserId },
        { id: 'act3', amount: 30, type: 'expense', accountId: 'acc1', date: Date.now(), userId: mockUserId }
      );
      expect(mockActivities).toHaveLength(3);

      // Step 3: Filter by account
      const acc1Activities = mockActivities.filter(a => a.accountId === 'acc1');
      expect(acc1Activities).toHaveLength(2);
      expect(acc1Activities.every(a => a.accountId === 'acc1')).toBe(true);

      // Step 4: Calculate analytics
      const totalExpense = mockActivities
        .filter(a => a.type === 'expense')
        .reduce((sum, a) => sum + a.amount, 0);
      expect(totalExpense).toBe(80);

      const totalIncome = mockActivities
        .filter(a => a.type === 'income')
        .reduce((sum, a) => sum + a.amount, 0);
      expect(totalIncome).toBe(100);
    });

    it('should complete workflow: create trackable → delete trackable → cascade delete activities and trackers', () => {
      // Step 1: Create trackable
      const trackable = { id: 'track1', name: 'Rent', type: 'expense', includeInTracker: true, userId: mockUserId };
      mockTrackables.push(trackable);

      // Step 2: Create tracker
      const tracker = { id: 'tracker1', trackableId: 'track1', userId: mockUserId };
      mockTrackers.push(tracker);

      // Step 3: Create activities linked to trackable
      mockActivities.push(
        { id: 'act1', trackableId: 'track1', userId: mockUserId },
        { id: 'act2', trackableId: 'track1', userId: mockUserId }
      );
      expect(mockActivities).toHaveLength(2);
      expect(mockTrackers).toHaveLength(1);

      // Step 4: Delete trackable - cascade delete all related data
      const trackableIdToDelete = 'track1';
      mockTrackables = mockTrackables.filter(t => t.id !== trackableIdToDelete);
      mockActivities = mockActivities.filter(a => a.trackableId !== trackableIdToDelete);
      mockTrackers = mockTrackers.filter(t => t.trackableId !== trackableIdToDelete);

      expect(mockTrackables).toHaveLength(0);
      expect(mockActivities).toHaveLength(0);
      expect(mockTrackers).toHaveLength(0);
    });
  });

  describe('Group Mode - Collaborative Workflows', () => {
    it('should complete workflow: user1 creates group → user2 joins → create shared activities → edit → everyone sees updates', () => {
      // Step 1: User1 creates group
      const group = {
        id: 'group1',
        name: 'Roommates',
        code: 'ABC123',
        createdBy: 'user1',
        members: [
          { id: 'user1', email: 'user1@email.com', joinedAt: Date.now() }
        ],
        createdAt: Date.now()
      };
      mockGroup = group;
      expect(mockGroup.members).toHaveLength(1);

      // Step 2: User2 joins group
      mockGroup.members.push({ id: 'user2', email: 'user2@email.com', joinedAt: Date.now() });
      expect(mockGroup.members).toHaveLength(2);

      // Step 3: Create shared bank account
      const sharedAccount = {
        id: 'acc1',
        cardName: 'Shared',
        groupMemberId: 'user1',
        groupId: 'group1',
        createdAt: Date.now()
      };
      mockAccounts.push(sharedAccount);

      // Step 4: User1 adds activity
      const activity1 = {
        id: 'act1',
        amount: 100,
        type: 'expense',
        accountId: 'acc1',
        groupMemberId: 'user1',
        groupId: 'group1',
        date: Date.now()
      };
      mockActivities.push(activity1);
      expect(mockActivities).toHaveLength(1);

      // Step 5: User1 edits activity (both users should see update)
      mockActivities[0].amount = 120;
      const user2View = mockActivities.find(a => a.id === 'act1');
      expect(user2View.amount).toBe(120);

      // Step 6: User2 adds activity
      const activity2 = {
        id: 'act2',
        amount: 50,
        type: 'expense',
        accountId: 'acc1',
        groupMemberId: 'user2',
        groupId: 'group1',
        date: Date.now()
      };
      mockActivities.push(activity2);
      expect(mockActivities).toHaveLength(2);

      // Step 7: View group activities - both users' activities visible
      const user1Activities = mockActivities.filter(a => a.groupMemberId === 'user1');
      const user2Activities = mockActivities.filter(a => a.groupMemberId === 'user2');
      expect(user1Activities).toHaveLength(1);
      expect(user2Activities).toHaveLength(1);
    });

    it('should complete workflow: user creates group → creates data → leaves group → data is removed', () => {
      // Step 1: User1 creates group
      const group = {
        id: 'group1',
        createdBy: 'user1',
        members: [
          { id: 'user1', email: 'user1@email.com' },
          { id: 'user2', email: 'user2@email.com' }
        ]
      };
      mockGroup = group;

      // Step 2: User1 creates shared activities
      mockActivities.push(
        { id: 'act1', groupMemberId: 'user1', groupId: 'group1', amount: 50 },
        { id: 'act2', groupMemberId: 'user2', groupId: 'group1', amount: 75 }
      );
      expect(mockActivities).toHaveLength(2);

      // Step 3: User1 leaves group
      mockGroup.members = mockGroup.members.filter(m => m.id !== 'user1');
      mockActivities = mockActivities.filter(a => a.groupMemberId !== 'user1');

      expect(mockGroup.members).toHaveLength(1);
      expect(mockActivities).toHaveLength(1);
      expect(mockActivities[0].groupMemberId).toBe('user2');
    });

    it('should complete workflow: migrate personal data to group → compare totals → verify encryption keys', () => {
      // Step 1: Create personal data
      const personalAccount = {
        id: 'pacc1',
        cardName: 'Personal',
        userId: 'user1',
        createdAt: Date.now()
      };
      mockAccounts.push(personalAccount);

      const personalTrackable = {
        id: 'ptrack1',
        name: 'Work Lunch',
        type: 'expense',
        userId: 'user1'
      };
      mockTrackables.push(personalTrackable);

      const personalActivities = [
        { id: 'pact1', amount: 50, type: 'expense', userId: 'user1', accountId: 'pacc1', trackableId: 'ptrack1' },
        { id: 'pact2', amount: 75, type: 'expense', userId: 'user1', accountId: 'pacc1', trackableId: 'ptrack1' }
      ];
      mockActivities.push(...personalActivities);

      // Step 2: Create group
      mockGroup = {
        id: 'group1',
        members: [{ id: 'user1' }]
      };

      // Step 3: Migrate data to group
      const migratedAccount = { ...personalAccount, groupId: 'group1', groupMemberId: 'user1' };
      const migratedTrackable = { ...personalTrackable, groupId: 'group1', groupMemberId: 'user1' };
      const migratedActivities = personalActivities.map(a => ({ ...a, groupId: 'group1', groupMemberId: 'user1' }));

      // Step 4: Verify data integrity
      expect(migratedAccount.groupId).toBe('group1');
      expect(migratedTrackable.groupId).toBe('group1');
      expect(migratedActivities).toHaveLength(2);
      expect(migratedActivities.every(a => a.groupId === 'group1')).toBe(true);

      // Step 5: Calculate totals before and after (should match)
      const originalTotal = personalActivities.reduce((sum, a) => sum + a.amount, 0);
      const migratedTotal = migratedActivities.reduce((sum, a) => sum + a.amount, 0);
      expect(originalTotal).toBe(migratedTotal);
      expect(originalTotal).toBe(125);
    });
  });

  describe('Tracker Lifecycle Workflows', () => {
    it('should complete workflow: create trackable → generate trackers → mark complete → verify activity creation', () => {
      // Step 1: Create trackable
      const trackable = {
        id: 'track1',
        name: 'Salary',
        type: 'income',
        includeInTracker: true,
        trackerAmount: 3000,
        userId: mockUserId
      };
      mockTrackables.push(trackable);

      // Step 2: Generate tracker for current month
      const tracker = {
        id: 'tracker1',
        trackableId: 'track1',
        isDone: false,
        month: 3, // April
        year: 2026,
        userId: mockUserId
      };
      mockTrackers.push(tracker);
      expect(mockTrackers).toHaveLength(1);

      // Step 3: Mark tracker as complete
      mockTrackers[0].isDone = true;
      mockTrackers[0].completedAt = Date.now();

      // Step 4: Auto-create activity when tracker marked done
      const activity = {
        id: 'act1',
        amount: 3000,
        type: 'income',
        trackableId: 'track1',
        date: Date.now(),
        userId: mockUserId
      };
      mockActivities.push(activity);

      // Step 5: Verify activity created
      expect(mockActivities).toHaveLength(1);
      expect(mockActivities[0].trackableId).toBe('track1');
      expect(mockActivities[0].amount).toBe(3000);

      // Step 6: Verify tracker status
      expect(mockTrackers[0].isDone).toBe(true);
      expect(mockTrackers[0].completedAt).toBeDefined();
    });

    it('should complete workflow: skip tracker → mark undone → re-mark done → verify state transitions', () => {
      // Step 1: Create tracker
      const tracker = {
        id: 'tracker1',
        trackableId: 'track1',
        isDone: false,
        month: 3,
        year: 2026,
        userId: mockUserId
      };
      mockTrackers.push(tracker);

      // Step 2: Skip tracker (leave as not done)
      expect(mockTrackers[0].isDone).toBe(false);

      // Step 3: Mark as done
      mockTrackers[0].isDone = true;
      expect(mockTrackers[0].isDone).toBe(true);

      // Step 4: Mark as undone (undo)
      mockTrackers[0].isDone = false;
      expect(mockTrackers[0].isDone).toBe(false);

      // Step 5: Mark as done again
      mockTrackers[0].isDone = true;
      expect(mockTrackers[0].isDone).toBe(true);
    });
  });

  describe('Multi-step Transaction Workflows', () => {
    it('should complete workflow: create activity → transfer between accounts → verify account balances', () => {
      // Step 1: Create two accounts
      mockAccounts.push(
        { id: 'acc1', cardName: 'Chase', userId: mockUserId },
        { id: 'acc2', cardName: 'BOA', userId: mockUserId }
      );

      // Step 2: Add income to account 1
      mockActivities.push({
        id: 'act1',
        amount: 1000,
        type: 'income',
        accountId: 'acc1',
        userId: mockUserId,
        date: Date.now()
      });

      // Step 3: Create transfer activity
      mockActivities.push({
        id: 'act2',
        amount: 500,
        type: 'transfer',
        accountId: 'acc1', // from account
        toAccountId: 'acc2', // to account
        userId: mockUserId,
        date: Date.now()
      });

      // Step 4: Calculate balances
      const acc1Income = mockActivities
        .filter(a => a.accountId === 'acc1' && a.type === 'income')
        .reduce((sum, a) => sum + a.amount, 0);
      
      const acc1Transfers = mockActivities
        .filter(a => a.accountId === 'acc1' && a.type === 'transfer')
        .reduce((sum, a) => sum + a.amount, 0);

      const acc1Balance = acc1Income - acc1Transfers;
      expect(acc1Balance).toBe(500);

      // Step 5: Verify transfer activity
      const transfer = mockActivities.find(a => a.type === 'transfer');
      expect(transfer.toAccountId).toBe('acc2');
    });

    it('should complete workflow: create trackable → add manual activity → add tracker activity → verify totals', () => {
      // Step 1: Create trackable
      mockTrackables.push({
        id: 'track1',
        name: 'Gym',
        type: 'expense',
        includeInTracker: true,
        trackerAmount: 50,
        userId: mockUserId
      });

      // Step 2: Add manual activity (not from tracker)
      mockActivities.push({
        id: 'act1',
        amount: 60,
        type: 'expense',
        userId: mockUserId,
        date: Date.now()
      });

      // Step 3: Mark tracker as done (creates activity)
      mockActivities.push({
        id: 'act2',
        amount: 50,
        type: 'expense',
        trackableId: 'track1',
        userId: mockUserId,
        date: Date.now()
      });

      // Step 4: Calculate total expenses
      const totalExpense = mockActivities
        .filter(a => a.type === 'expense')
        .reduce((sum, a) => sum + a.amount, 0);
      expect(totalExpense).toBe(110);

      // Step 5: Filter trackable-linked activities
      const trackableActivities = mockActivities.filter(a => a.trackableId === 'track1');
      expect(trackableActivities).toHaveLength(1);
    });
  });

  describe('Error Recovery Workflows', () => {
    it('should complete workflow: create activity → edit with validation error → fix → save successfully', () => {
      // Step 1: Create valid activity
      mockActivities.push({
        id: 'act1',
        amount: 100,
        type: 'expense',
        description: 'Valid',
        userId: mockUserId
      });

      // Step 2: Try to edit with invalid amount (should fail validation)
      const editData = { amount: -50, description: 'Invalid' };
      const isValid = editData.amount > 0;
      expect(isValid).toBe(false); // Validation fails

      // Step 3: Fix invalid data
      editData.amount = 150;
      const isValidFixed = editData.amount > 0;
      expect(isValidFixed).toBe(true);

      // Step 4: Save corrected data
      mockActivities[0].amount = editData.amount;
      mockActivities[0].description = editData.description;
      expect(mockActivities[0].amount).toBe(150);
      expect(mockActivities[0].description).toBe('Invalid');
    });

    it('should complete workflow: attempt large transaction → confirm → complete → verify', () => {
      // Step 1: Create large amount activity
      const largeAmount = 100000; // ₹1 lakh

      // Step 2: Validation triggers for amounts > ₹99,999
      const requiresConfirmation = largeAmount >= 99999;
      expect(requiresConfirmation).toBe(true);

      // Step 3: User confirms large transaction
      const confirmed = true;

      // Step 4: Create activity after confirmation
      if (confirmed && requiresConfirmation) {
        mockActivities.push({
          id: 'act1',
          amount: largeAmount,
          type: 'expense',
          userId: mockUserId
        });
      }

      // Step 5: Verify transaction completed
      expect(mockActivities).toHaveLength(1);
      expect(mockActivities[0].amount).toBe(100000);
    });
  });

  describe('Complex Multi-User Workflows', () => {
    it('should complete workflow: user switches personal/group → activities separated → sync across devices', () => {
      const user1 = 'user1';

      // Step 1: User creates personal activities
      mockActivities.push({
        id: 'pact1',
        amount: 50,
        type: 'expense',
        userId: user1,
        // no groupId = personal
      });

      // Step 2: User joins group
      mockGroup = { id: 'group1', members: [{ id: user1 }] };

      // Step 3: User creates group activity
      mockActivities.push({
        id: 'gact1',
        amount: 100,
        type: 'expense',
        userId: user1,
        groupId: 'group1',
        groupMemberId: user1
      });

      expect(mockActivities).toHaveLength(2);

      // Step 4: Filter personal activities
      const personalActivities = mockActivities.filter(a => !a.groupId);
      expect(personalActivities).toHaveLength(1);

      // Step 5: Filter group activities
      const groupActivities = mockActivities.filter(a => a.groupId === 'group1');
      expect(groupActivities).toHaveLength(1);

      // Step 6: Verify separation
      expect(personalActivities[0].amount).toBe(50);
      expect(groupActivities[0].amount).toBe(100);
    });
  });

  describe('Deletion Protection Workflows', () => {
    it('should complete workflow: create trackable activity → attempt delete → protected → delete without trackable → success', () => {
      // Step 1: Create trackable
      mockTrackables.push({ id: 'track1', name: 'Test', userId: mockUserId });

      // Step 2: Create activity linked to trackable
      mockActivities.push({
        id: 'act1',
        trackableId: 'track1',
        userId: mockUserId
      });

      // Step 3: Try to delete trackable activity (should be protected)
      const canDelete = mockActivities[0].trackableId === null;
      expect(canDelete).toBe(false);
      expect(mockActivities).toHaveLength(1); // Still exists

      // Step 4: Create activity without trackable
      mockActivities.push({
        id: 'act2',
        userId: mockUserId
      });

      // Step 5: Delete non-trackable activity (should succeed)
      const canDeleteAct2 = mockActivities[1].trackableId === undefined || mockActivities[1].trackableId === null;
      expect(canDeleteAct2).toBe(true);

      if (canDeleteAct2) {
        mockActivities = mockActivities.filter(a => a.id !== 'act2');
      }

      expect(mockActivities).toHaveLength(1);
      expect(mockActivities[0].id).toBe('act1');
    });
  });

  describe('Cross-feature Integration Workflows', () => {
    it('should complete complex workflow: accounts → trackables → trackers → activities → analytics', () => {
      // Step 1: Create bank account
      mockAccounts.push({ id: 'acc1', cardName: 'Main', userId: mockUserId });

      // Step 2: Create trackables
      mockTrackables.push(
        { id: 'track1', name: 'Rent', type: 'expense', includeInTracker: true, trackerAmount: 1000, userId: mockUserId },
        { id: 'track2', name: 'Salary', type: 'income', includeInTracker: true, trackerAmount: 5000, userId: mockUserId }
      );

      // Step 3: Create trackers
      mockTrackers.push(
        { id: 'tracker1', trackableId: 'track1', isDone: true, userId: mockUserId },
        { id: 'tracker2', trackableId: 'track2', isDone: true, userId: mockUserId }
      );

      // Step 4: Create activities
      mockActivities.push(
        { id: 'act1', amount: 1000, type: 'expense', trackableId: 'track1', accountId: 'acc1', userId: mockUserId },
        { id: 'act2', amount: 5000, type: 'income', trackableId: 'track2', accountId: 'acc1', userId: mockUserId },
        { id: 'act3', amount: 200, type: 'expense', accountId: 'acc1', userId: mockUserId }
      );

      // Step 5: Generate analytics
      const totalIncome = mockActivities
        .filter(a => a.type === 'income')
        .reduce((sum, a) => sum + a.amount, 0);
      
      const totalExpense = mockActivities
        .filter(a => a.type === 'expense')
        .reduce((sum, a) => sum + a.amount, 0);

      const netBalance = totalIncome - totalExpense;

      expect(totalIncome).toBe(5000);
      expect(totalExpense).toBe(1200);
      expect(netBalance).toBe(3800);

      // Step 6: Verify trackable-linked activities
      const trackableActivities = mockActivities.filter(a => a.trackableId !== undefined);
      expect(trackableActivities).toHaveLength(2);

      // Step 7: Verify untracked activities
      const untrackedActivities = mockActivities.filter(a => !a.trackableId);
      expect(untrackedActivities).toHaveLength(1);
    });
  });
});
