import { describe, it, expect } from 'vitest';

describe('Analytics', () => {
  describe('Activity Filtering', () => {
    it('should filter activities by date range', () => {
      const activities = [
        { date: new Date('2026-04-01'), amount: 100 },
        { date: new Date('2026-04-02'), amount: 200 },
        { date: new Date('2026-05-01'), amount: 300 },
      ];

      const filterStart = new Date('2026-04-01');
      const filterEnd = new Date('2026-04-30');

      const filtered = activities.filter(a => a.date >= filterStart && a.date <= filterEnd);
      expect(filtered.length).toBe(2);
    });

    it('should filter activities by type', () => {
      const activities = [
        { type: 'income', amount: 100 },
        { type: 'expense', amount: 50 },
        { type: 'income', amount: 200 },
      ];

      const incomeActivities = activities.filter(a => a.type === 'income');
      expect(incomeActivities.length).toBe(2);
    });

    it('should filter activities by account', () => {
      const activities = [
        { accountId: 'acc-1', amount: 100 },
        { accountId: 'acc-2', amount: 50 },
        { accountId: 'acc-1', amount: 75 },
      ];

      const acc1Activities = activities.filter(a => a.accountId === 'acc-1');
      expect(acc1Activities.length).toBe(2);
    });
  });

  describe('Totals Calculation', () => {
    it('should calculate total income', () => {
      const activities = [
        { type: 'income', amount: 100 },
        { type: 'income', amount: 200 },
        { type: 'expense', amount: 50 },
      ];

      const totalIncome = activities
        .filter(a => a.type === 'income')
        .reduce((sum, a) => sum + a.amount, 0);

      expect(totalIncome).toBe(300);
    });

    it('should calculate total expense', () => {
      const activities = [
        { type: 'income', amount: 100 },
        { type: 'expense', amount: 50 },
        { type: 'expense', amount: 75 },
      ];

      const totalExpense = activities
        .filter(a => a.type === 'expense')
        .reduce((sum, a) => sum + a.amount, 0);

      expect(totalExpense).toBe(125);
    });

    it('should calculate net (income - expense)', () => {
      const activities = [
        { type: 'income', amount: 1000 },
        { type: 'expense', amount: 300 },
      ];

      const totalIncome = activities
        .filter(a => a.type === 'income')
        .reduce((sum, a) => sum + a.amount, 0);

      const totalExpense = activities
        .filter(a => a.type === 'expense')
        .reduce((sum, a) => sum + a.amount, 0);

      const net = totalIncome - totalExpense;
      expect(net).toBe(700);
    });

    it('should exclude transfers from totals', () => {
      const activities = [
        { type: 'income', amount: 100 },
        { type: 'transfer', amount: 50 },
        { type: 'expense', amount: 30 },
      ];

      const countableActivities = activities.filter(a => a.type !== 'transfer');
      expect(countableActivities.length).toBe(2);
    });
  });

  describe('User-Based Analytics', () => {
    it('should show breakdown by user in group', () => {
      const activities = [
        { userId: 'user-1', type: 'expense', amount: 100 },
        { userId: 'user-1', type: 'expense', amount: 50 },
        { userId: 'user-2', type: 'expense', amount: 200 },
      ];

      const user1Total = activities
        .filter(a => a.userId === 'user-1')
        .reduce((sum, a) => sum + a.amount, 0);

      const user2Total = activities
        .filter(a => a.userId === 'user-2')
        .reduce((sum, a) => sum + a.amount, 0);

      expect(user1Total).toBe(150);
      expect(user2Total).toBe(200);
    });

    it('should handle missing user emails gracefully', () => {
      const activities = [
        { userId: 'user-1', userEmail: 'user1@example.com', amount: 100 },
        { userId: 'user-2', userEmail: null, amount: 200 }, // Missing email
      ];

      const user2Display = activities[1].userEmail || 'user-2';
      expect(user2Display).toBe('user-2');
    });
  });

  describe('Trackable Analytics', () => {
    it('should show total spent on each trackable', () => {
      const activities = [
        { trackableId: 'track-1', amount: 100 },
        { trackableId: 'track-1', amount: 50 },
        { trackableId: 'track-2', amount: 200 },
      ];

      const track1Total = activities
        .filter(a => a.trackableId === 'track-1')
        .reduce((sum, a) => sum + a.amount, 0);

      expect(track1Total).toBe(150);
    });

    it('should handle activities without trackables', () => {
      const activities = [
        { trackableId: 'track-1', amount: 100 },
        { trackableId: null, amount: 50 }, // No trackable
      ];

      const trackedActivities = activities.filter(a => a.trackableId);
      expect(trackedActivities.length).toBe(1);
    });
  });

  describe('Time-Based Grouping', () => {
    it('should group activities by day', () => {
      const activities = [
        { date: new Date('2026-04-01T10:00'), amount: 100 },
        { date: new Date('2026-04-01T14:00'), amount: 50 },
        { date: new Date('2026-04-02T09:00'), amount: 200 },
      ];

      const groupedByDay = {};
      activities.forEach(a => {
        const day = a.date.toISOString().split('T')[0];
        groupedByDay[day] = (groupedByDay[day] || 0) + a.amount;
      });

      expect(groupedByDay['2026-04-01']).toBe(150);
      expect(groupedByDay['2026-04-02']).toBe(200);
    });

    it('should group activities by month', () => {
      const activities = [
        { date: new Date('2026-04-01'), amount: 100 },
        { date: new Date('2026-04-15'), amount: 50 },
        { date: new Date('2026-05-01'), amount: 200 },
      ];

      const groupedByMonth = {};
      activities.forEach(a => {
        const month = a.date.toISOString().slice(0, 7);
        groupedByMonth[month] = (groupedByMonth[month] || 0) + a.amount;
      });

      expect(groupedByMonth['2026-04']).toBe(150);
      expect(groupedByMonth['2026-05']).toBe(200);
    });
  });

  describe('Chart Data Preparation', () => {
    it('should prepare pie chart data for expense breakdown', () => {
      const activities = [
        { trackableId: 'track-1', trackableName: 'Rent', amount: 1000, type: 'expense' },
        { trackableId: 'track-2', trackableName: 'Food', amount: 200, type: 'expense' },
        { trackableId: 'track-1', trackableName: 'Rent', amount: 500, type: 'expense' },
      ];

      const expensesByTrackable = {};
      activities
        .filter(a => a.type === 'expense')
        .forEach(a => {
          expensesByTrackable[a.trackableName] =
            (expensesByTrackable[a.trackableName] || 0) + a.amount;
        });

      expect(expensesByTrackable['Rent']).toBe(1500);
      expect(expensesByTrackable['Food']).toBe(200);
    });

    it('should prepare bar chart data for monthly comparison', () => {
      const activities = [
        { date: new Date('2026-03-15'), amount: 100, type: 'expense' },
        { date: new Date('2026-04-10'), amount: 150, type: 'expense' },
        { date: new Date('2026-04-20'), amount: 100, type: 'expense' },
      ];

      const monthlyData = {};
      activities.forEach(a => {
        const month = a.date.toLocaleString('en-US', { year: 'numeric', month: 'long' });
        monthlyData[month] = (monthlyData[month] || 0) + a.amount;
      });

      expect(monthlyData['March 2026']).toBe(100);
      expect(monthlyData['April 2026']).toBe(250);
    });
  });
});
