import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, format } from 'date-fns';

export const getDateRange = (filter) => {
  const now = new Date();
  
  switch (filter.timeRange) {
    case 'today':
      return {
        start: startOfDay(now).getTime(),
        end: endOfDay(now).getTime(),
      };
    case 'week':
      return {
        start: startOfWeek(now, { weekStartsOn: 0 }).getTime(),
        end: endOfWeek(now, { weekStartsOn: 0 }).getTime(),
      };
    case 'month':
      return {
        start: startOfMonth(now).getTime(),
        end: endOfMonth(now).getTime(),
      };
    case 'year':
      return {
        start: startOfYear(now).getTime(),
        end: endOfYear(now).getTime(),
      };
    case 'custom':
      return {
        start: filter.startDate || startOfYear(now).getTime(),
        end: filter.endDate || endOfYear(now).getTime(),
      };
    default:
      return {
        start: startOfDay(now).getTime(),
        end: endOfDay(now).getTime(),
      };
  }
};

export const calculateAnalytics = (activities, trackablesMap, filter) => {
  const { start, end } = getDateRange(filter);

  const filtered = activities.filter(activity => {
    const inDateRange = activity.date >= start && activity.date <= end;
    const matchAccount = !filter.accountId || activity.accountId === filter.accountId;
    const matchTrackable = !filter.trackableId || activity.trackableId === filter.trackableId;
    
    return inDateRange && matchAccount && matchTrackable && activity.type !== 'transfer';
  });

  const byCategory = {};
  const byAccount = {};
  let totalIncome = 0;
  let totalExpense = 0;

  filtered.forEach(activity => {
    const isIncome = activity.type === 'income';
    const amount = activity.amount;

    // By category
    if (activity.trackableId) {
      const trackable = trackablesMap.get(activity.trackableId);
      if (trackable) {
        byCategory[trackable.name] = (byCategory[trackable.name] || 0) + (isIncome ? amount : -amount);
      }
    }

    // By account
    if (!byAccount[activity.accountId]) {
      byAccount[activity.accountId] = { income: 0, expense: 0 };
    }

    if (isIncome) {
      byAccount[activity.accountId].income += amount;
      totalIncome += amount;
    } else {
      byAccount[activity.accountId].expense += amount;
      totalExpense += amount;
    }
  });

  return {
    totalIncome,
    totalExpense,
    netFlow: totalIncome - totalExpense,
    byCategory,
    byAccount,
  };
};

export const formatAmount = (amount) => {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 2,
  }).format(amount);
};

export const formatDate = (timestamp, formatStr = 'MMM dd, yyyy') => {
  return format(new Date(timestamp), formatStr);
};

export const generateId = () => {
  return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Calculate current balance for an account
 * @param {string} accountId - Account ID
 * @param {number} openingBalance - Opening balance
 * @param {Array} activities - Array of all activities
 * @returns {number} Current balance
 */
export const calculateAccountBalance = (accountId, openingBalance = 0, activities = []) => {
  const accountActivities = activities.filter(a => a.accountId === accountId);
  
  let balance = openingBalance;
  accountActivities.forEach(activity => {
    if (activity.type === 'income') {
      balance += activity.amount;
    } else if (activity.type === 'expense') {
      balance -= activity.amount;
    }
    // transfers are not included in balance calculation
  });
  
  return balance;
};
