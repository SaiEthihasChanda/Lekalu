import { startOfDay, startOfWeek, startOfMonth, startOfYear, endOfDay, endOfWeek, endOfMonth, endOfYear, format, eachDayOfInterval, eachMonthOfInterval } from 'date-fns';

const TRANSFER_TYPES = new Set(['transfer', 'self transfer', 'self-transfer', 'self_transfer']);

const isTransferType = (type) => {
  if (typeof type !== 'string') return false;
  return TRANSFER_TYPES.has(type.trim().toLowerCase());
};

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
      // Snap to day boundaries so the selected start and end dates are both included.
      return {
        start: filter.startDate ? startOfDay(new Date(filter.startDate)).getTime() : startOfYear(now).getTime(),
        end: filter.endDate ? endOfDay(new Date(filter.endDate)).getTime() : endOfYear(now).getTime(),
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
    const matchUser = !filter.userId || activity.userId === filter.userId;
    
    return inDateRange && matchAccount && matchTrackable && matchUser && !isTransferType(activity.type);
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

const trimTrailingZeros = (value) => value.replace(/(\.\d*?)0+$/, '$1').replace(/\.$/, '');

/**
 * Format an amount compactly using Indian units (K / L / Cr).
 * Used where full currency strings would be too wide, e.g. pivot cells.
 * @param {number} amount
 * @returns {string} Compact amount, e.g. "₹1.25L"
 */
export const formatCompactAmount = (amount) => {
  const value = Number(amount) || 0;
  const abs = Math.abs(value);
  const sign = value < 0 ? '-' : '';

  if (abs >= 10000000) return `${sign}₹${trimTrailingZeros((abs / 10000000).toFixed(2))}Cr`;
  if (abs >= 100000) return `${sign}₹${trimTrailingZeros((abs / 100000).toFixed(2))}L`;
  if (abs >= 1000) return `${sign}₹${trimTrailingZeros((abs / 1000).toFixed(1))}K`;

  return `${sign}₹${abs.toFixed(0)}`;
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
  const accountActivities = activities.filter((activity) => {
    if (!activity) return false;

    if (isTransferType(activity.type)) {
      return (
        activity.fromAccountId === accountId ||
        activity.toAccountId === accountId ||
        activity.fromSourceId === accountId ||
        activity.toSourceId === accountId
      );
    }

    // Backward compatibility: older activity records may store account reference as sourceId.
    return activity.accountId === accountId || activity.sourceId === accountId;
  });
  
  let balance = openingBalance;
  accountActivities.forEach(activity => {
    const amount = Number(activity.amount) || 0;

    if (activity.type === 'income') {
      balance += amount;
    } else if (activity.type === 'expense') {
      balance -= amount;
    } else if (isTransferType(activity.type)) {
      if (activity.fromAccountId === accountId || activity.fromSourceId === accountId) {
        balance -= amount;
      }
      if (activity.toAccountId === accountId || activity.toSourceId === accountId) {
        balance += amount;
      }
    }
  });
  
  return balance;
};

/**
 * Calculate total net worth across all accounts
 * Credit cards are treated as negative balances (debt)
 * @param {Array} accounts - Array of all accounts
 * @param {Array} activities - Array of all activities
 * @returns {number} Total net worth
 */
export const calculateNetWorth = (accounts = [], activities = []) => {
  let totalNetWorth = 0;

  accounts.forEach(account => {
    const balance = calculateAccountBalance(account.id, account.openingBalance || 0, activities);
    
    // Simply add all balances - credit cards are already negative from calculateAccountBalance
    totalNetWorth += balance;
  });

  return totalNetWorth;
};

const MONTH_KEY_FORMAT = 'yyyy-MM';
const UNCATEGORIZED_ROW_ID = '__uncategorized__';

/**
 * Build a pivot of trackables (rows) against months (columns).
 * Amounts are signed: income is positive, expense is negative, transfers are excluded.
 * Columns span every month between the first and last matching activity, so gaps stay visible.
 *
 * @param {Array} activities - All activities
 * @param {Map} trackablesMap - Map of trackableId -> trackable
 * @param {'all' | 'income' | 'expenses'} view - Which activity types to include
 * @returns {{ months: Array, rows: Array, columnTotals: Object, grandTotal: number }}
 */
export const buildTrackablePivot = (activities = [], trackablesMap = new Map(), view = 'all') => {
  const relevant = activities.filter((activity) => {
    if (!activity || isTransferType(activity.type)) return false;

    // Reject null/0/Timestamp dates: a pending serverTimestamp() reads as null locally,
    // and Number(null) would silently bucket the row into 1970.
    if (!activity.date || !Number.isFinite(Number(activity.date))) return false;

    const type = String(activity.type || '').toLowerCase();
    if (view === 'income') return type === 'income';
    if (view === 'expenses') return type === 'expense';

    return type === 'income' || type === 'expense';
  });

  if (relevant.length === 0) {
    return { months: [], rows: [], columnTotals: {}, grandTotal: 0 };
  }

  const { earliest, latest } = relevant.reduce((range, activity) => {
    const date = Number(activity.date);
    return {
      earliest: Math.min(range.earliest, date),
      latest: Math.max(range.latest, date),
    };
  }, { earliest: Infinity, latest: -Infinity });

  const months = eachMonthOfInterval({
    start: startOfMonth(new Date(earliest)),
    end: startOfMonth(new Date(latest)),
  }).map((date) => ({
    key: format(date, MONTH_KEY_FORMAT),
    label: format(date, 'MMM yy'),
  }));

  const rowsById = new Map();
  const columnTotals = {};
  let grandTotal = 0;

  relevant.forEach((activity) => {
    const trackable = activity.trackableId ? trackablesMap.get(activity.trackableId) : null;
    const rowId = trackable?.id || activity.trackableId || UNCATEGORIZED_ROW_ID;
    const monthKey = format(new Date(Number(activity.date)), MONTH_KEY_FORMAT);
    const isIncome = String(activity.type || '').toLowerCase() === 'income';
    const amount = Math.abs(Number(activity.amount) || 0) * (isIncome ? 1 : -1);

    if (!rowsById.has(rowId)) {
      rowsById.set(rowId, {
        id: rowId,
        name: trackable?.name || (rowId === UNCATEGORIZED_ROW_ID ? 'Uncategorized' : 'Unknown Trackable'),
        trackableType: trackable?.type || null,
        observedTypes: new Set(),
        values: {},
        total: 0,
      });
    }

    const row = rowsById.get(rowId);
    row.values[monthKey] = (row.values[monthKey] || 0) + amount;
    row.total += amount;
    row.observedTypes.add(isIncome ? 'income' : 'expense');

    columnTotals[monthKey] = (columnTotals[monthKey] || 0) + amount;
    grandTotal += amount;
  });

  const rows = Array.from(rowsById.values())
    .map(({ observedTypes, trackableType, ...row }) => ({
      ...row,
      type: trackableType || (observedTypes.size === 1 ? Array.from(observedTypes)[0] : 'mixed'),
    }))
    .sort((a, b) => Math.abs(b.total) - Math.abs(a.total));

  return { months, rows, columnTotals, grandTotal };
};

/**
 * Generate daily/monthly income vs expense data for bar chart
 * @param {Array} activities - Array of all activities
 * @param {string} timeRange - Time range: 'today', 'week', 'month', 'year', 'custom'
 * @param {number} startDate - Start date timestamp
 * @param {number} endDate - End date timestamp
 * @returns {Array} Data for bar chart with income and expense for each day/month
 */
export const generateDailyIncomeExpenseData = (activities = [], timeRange = 'month', startDate = null, endDate = null) => {
  const { start, end } = getDateRange({ timeRange, startDate, endDate });
  
  // Filter activities to the date range
  const filtered = activities.filter(a => 
    a.date >= start && a.date <= end && !isTransferType(a.type)
  );

  let dateRange = [];
  const now = new Date();

  if (timeRange === 'today') {
    dateRange = [now];
  } else if (timeRange === 'week') {
    dateRange = eachDayOfInterval({
      start: startOfWeek(now, { weekStartsOn: 0 }),
      end: endOfWeek(now, { weekStartsOn: 0 }),
    });
  } else if (timeRange === 'month') {
    dateRange = eachDayOfInterval({
      start: startOfMonth(now),
      end: endOfMonth(now),
    });
  } else if (timeRange === 'year') {
    dateRange = eachMonthOfInterval({
      start: startOfYear(now),
      end: endOfYear(now),
    });
  } else if (timeRange === 'custom') {
    const startDateObj = new Date(startDate);
    const endDateObj = new Date(endDate);
    
    // Determine if we should use days or months based on date range
    const daysDiff = Math.ceil((endDateObj - startDateObj) / (1000 * 60 * 60 * 24));
    
    if (daysDiff <= 31) {
      // Use daily intervals for month or less
      dateRange = eachDayOfInterval({
        start: startOfDay(startDateObj),
        end: endOfDay(endDateObj),
      });
    } else {
      // Use monthly intervals for longer periods
      dateRange = eachMonthOfInterval({
        start: startOfMonth(startDateObj),
        end: endOfMonth(endDateObj),
      });
    }
  }

  const dataMap = new Map();
  
  // Initialize all dates with 0 values
  dateRange.forEach(date => {
    const key = timeRange === 'year' || (timeRange === 'custom' && dateRange.some(d => format(d, 'yyyy') !== format(dateRange[0], 'yyyy'))) 
      ? format(date, 'MMM') 
      : format(date, 'MMM dd');
    
    if (!dataMap.has(key)) {
      dataMap.set(key, { name: key, income: 0, expense: 0 });
    }
  });

  // Populate data from activities
  filtered.forEach(activity => {
    const actDate = new Date(activity.date);
    const key = timeRange === 'year' || (timeRange === 'custom' && dateRange.some(d => format(d, 'yyyy') !== format(dateRange[0], 'yyyy')))
      ? format(actDate, 'MMM')
      : format(actDate, 'MMM dd');

    if (dataMap.has(key)) {
      const data = dataMap.get(key);
      if (activity.type === 'income') {
        data.income += activity.amount;
      } else if (activity.type === 'expense') {
        data.expense += activity.amount;
      }
    }
  });

  return Array.from(dataMap.values());
};
