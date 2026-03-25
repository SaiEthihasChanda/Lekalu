import Dexie from 'dexie';

export class ExpenseDB extends Dexie {
  constructor() {
    super('ExpenseTrackerDB');
    this.version(1).stores({
      bankAccounts: '++id',
      trackables: '++id, accountId',
      activities: '++id, accountId, date, trackableId',
      trackers: '++id, trackableId, month, year',
    });
  }
}

export const db = new ExpenseDB();
