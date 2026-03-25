import { useMemo, useState } from 'react';
import { useActivities, useTrackables, useBankAccounts } from '../hooks/index.js';
import { calculateAnalytics, formatAmount, calculateAccountBalance } from '../utils/analytics.js';
import { TrendingUp, PieChart, Wallet } from 'lucide-react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, startOfWeek, endOfWeek, eachWeekOfInterval, startOfYear, endOfYear, eachMonthOfInterval } from 'date-fns';

/**
 * @typedef {Object} AnalyticsFilter
 * @property {string} timeRange - Time range for filtering
 * @property {number} [startDate] - Start date timestamp
 * @property {number} [endDate] - End date timestamp
 * @property {string} [accountId] - Account ID filter
 * @property {string} [trackableId] - Trackable ID filter
 */

// Chart colors
const COLORS = ['#10B981', '#EF4444', '#3B82F6', '#F59E0B', '#8B5CF6', '#EC4899', '#06B6D4', '#F97316'];
const CATEGORY_COLORS = {
  income: '#10B981',
  expense: '#EF4444',
  transfer: '#3B82F6',
};

export const AnalyticsPage = () => {
  const [timeRange, setTimeRange] = useState('month');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedTrackableId, setSelectedTrackableId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const { activities } = useActivities();
  const { trackables } = useTrackables();
  const { accounts } = useBankAccounts();

  /** @type {AnalyticsFilter} */
  const filter = {
    timeRange,
    startDate: startDate ? new Date(startDate).getTime() : undefined,
    endDate: endDate ? new Date(endDate).getTime() : undefined,
    accountId: selectedAccountId || undefined,
    trackableId: selectedTrackableId || undefined,
  };

  const trackablesMap = new Map(trackables.map(t => [t.id, t]));
  const analytics = useMemo(() => {
    return calculateAnalytics(activities, trackablesMap, filter);
  }, [activities, trackablesMap, filter]);

  // Prepare data for pie charts
  const categoryPieData = useMemo(() => {
    return [
      { name: 'Income', value: Math.abs(analytics.totalIncome), color: '#10B981' },
      { name: 'Expense', value: Math.abs(analytics.totalExpense), color: '#EF4444' },
    ].filter(item => item.value > 0);
  }, [analytics.totalIncome, analytics.totalExpense]);

  const trackablePieData = useMemo(() => {
    return Object.entries(analytics.byCategory)
      .map(([category, amount]) => ({
        name: category,
        value: Math.abs(amount),
      }))
      .filter(item => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [analytics.byCategory]);

  const accountBarData = useMemo(() => {
    return Object.entries(analytics.byAccount).map(([accountId, data]) => {
      const account = accounts.find(a => a.id === accountId);
      return {
        name: account?.cardName || 'Unknown',
        income: data.income,
        expense: data.expense,
        net: data.income - data.expense,
      };
    });
  }, [analytics.byAccount, accounts]);

  // Bank account balances
  const accountBalancesData = useMemo(() => {
    return accounts.map(account => ({
      name: account.cardName,
      balance: calculateAccountBalance(account.id, account.openingBalance, activities),
    })).sort((a, b) => b.balance - a.balance);
  }, [accounts, activities]);

  // Bank account balance over time
  const accountBalanceOverTime = useMemo(() => {
    if (!activities.length || !accounts.length) return [];

    let dateRange = [];
    const now = new Date();

    if (timeRange === 'today') {
      dateRange = [now];
    } else if (timeRange === 'week') {
      dateRange = eachDayOfInterval({
        start: startOfWeek(now),
        end: endOfWeek(now),
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
    }

    const dataMap = new Map();
    const accountColors = {};
    
    // Assign colors to each account
    accounts.forEach((account, idx) => {
      accountColors[account.id] = COLORS[idx % COLORS.length];
    });

    // Initialize data points
    dateRange.forEach(date => {
      const key = timeRange === 'year' ? format(date, 'MMM') : format(date, 'MMM dd');
      if (!dataMap.has(key)) {
        const dataPoint = { name: key };
        // Initialize balances for each account
        accounts.forEach(account => {
          dataPoint[account.id] = account.openingBalance;
        });
        dataMap.set(key, dataPoint);
      }
    });

    // Update balances based on activities
    const sortedActivities = [...activities].sort((a, b) => a.date - b.date);
    
    sortedActivities.forEach(activity => {
      const actDate = new Date(activity.date);
      const key = timeRange === 'year' ? format(actDate, 'MMM') : format(actDate, 'MMM dd');

      if (activity.accountId && dataMap.has(key)) {
        // Update all data points on and after this date
        let incremented = false;
        for (const [k, dataPoint] of dataMap) {
          if (!incremented) {
            if (k === key) incremented = true;
            else continue;
          }
          
          if (!dataPoint[activity.accountId]) {
            dataPoint[activity.accountId] = accounts.find(a => a.id === activity.accountId)?.openingBalance || 0;
          }

          if (activity.type === 'income') {
            dataPoint[activity.accountId] += activity.amount;
          } else if (activity.type === 'expense') {
            dataPoint[activity.accountId] -= activity.amount;
          }
        }
      }
    });

    return Array.from(dataMap.values()).map(dataPoint => {
      // Convert back to original for easier use
      return dataPoint;
    });
  }, [activities, accounts, timeRange]);

  // Prepare date analytics data (line chart)
  const dateAnalyticsData = useMemo(() => {
    if (!activities.length) return [];

    let dateRange = [];
    const now = new Date();

    if (timeRange === 'today') {
      dateRange = [now];
    } else if (timeRange === 'week') {
      dateRange = eachDayOfInterval({
        start: startOfWeek(now),
        end: endOfWeek(now),
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
    }

    const dataMap = new Map();
    dateRange.forEach(date => {
      const key = timeRange === 'year' ? format(date, 'MMM') : format(date, 'MMM dd');
      if (!dataMap.has(key)) {
        dataMap.set(key, { name: key, income: 0, expense: 0, net: 0 });
      }
    });

    activities.forEach(activity => {
      const actDate = new Date(activity.date);
      const key = timeRange === 'year' ? format(actDate, 'MMM') : format(actDate, 'MMM dd');

      if (dataMap.has(key)) {
        const data = dataMap.get(key);
        if (activity.type === 'income') {
          data.income += activity.amount;
        } else if (activity.type === 'expense') {
          data.expense += activity.amount;
        }
        data.net = data.income - data.expense;
      }
    });

    return Array.from(dataMap.values());
  }, [activities, timeRange]);

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-primary border border-gray-600 rounded p-2 text-sm">
          <p className="text-white font-medium">{label}</p>
          {payload.map((entry, index) => (
            <p key={index} style={{ color: entry.color }}>
              {entry.name}: {formatAmount(entry.value)}
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  const categoryEntries = Object.entries(analytics.byCategory).sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
  const accountEntries = Object.entries(analytics.byAccount);

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-sm md:text-base text-gray-400">Analyze your spending patterns</p>
      </div>

      {/* Filters */}
      <div className="bg-secondary border border-gray-700 rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <h2 className="text-base md:text-lg font-semibold text-white mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Time Range</label>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-accent"
            >
              <option value="today">Today</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="year">This Year</option>
              <option value="custom">Custom Range</option>
            </select>
          </div>

          {timeRange === 'custom' && (
            <>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Start Date</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-accent"
                />
              </div>
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">End Date</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-accent"
                />
              </div>
            </>
          )}

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Account</label>
            <select
              value={selectedAccountId}
              onChange={(e) => setSelectedAccountId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-accent"
            >
              <option value="">All Accounts</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.cardName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Trackable</label>
            <select
              value={selectedTrackableId}
              onChange={(e) => setSelectedTrackableId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-accent"
            >
              <option value="">All Trackables</option>
              {trackables.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 mb-6 md:mb-8">
        <div className="bg-secondary border border-gray-700 rounded-lg p-4 md:p-6">
          <p className="text-gray-400 text-xs md:text-sm mb-2">Total Income</p>
          <p className="text-xl md:text-2xl font-bold text-green-400">{formatAmount(analytics.totalIncome)}</p>
        </div>
        <div className="bg-secondary border border-gray-700 rounded-lg p-4 md:p-6">
          <p className="text-gray-400 text-xs md:text-sm mb-2">Total Expense</p>
          <p className="text-xl md:text-2xl font-bold text-red-400">{formatAmount(analytics.totalExpense)}</p>
        </div>
        <div className="bg-secondary border border-gray-700 rounded-lg p-4 md:p-6">
          <p className="text-gray-400 text-xs md:text-sm mb-2">Net Flow</p>
          <p className={`text-xl md:text-2xl font-bold ${analytics.netFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatAmount(analytics.netFlow)}
          </p>
        </div>
        <div className="bg-secondary border border-gray-700 rounded-lg p-4 md:p-6">
          <p className="text-gray-400 text-xs md:text-sm mb-2">Expense/Income Ratio</p>
          <p className="text-xl md:text-2xl font-bold text-accent">
            {analytics.totalIncome > 0
              ? ((analytics.totalExpense / analytics.totalIncome) * 100).toFixed(1)
              : '0'}
            %
          </p>
        </div>
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 md:gap-8 mb-6 md:mb-8">
        {/* Income vs Expense Pie Chart */}
        <div className="bg-secondary border border-gray-700 rounded-lg p-4 md:p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={20} className="text-accent" />
            <h2 className="text-lg font-semibold text-white">Income vs Expense</h2>
          </div>
          {categoryPieData.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={categoryPieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatAmount(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {categoryPieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatAmount(value)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
        </div>

        {/* Trackable Analytics Pie Chart */}
        <div className="bg-secondary border border-gray-700 rounded-lg p-6">
          <div className="flex items-center gap-2 mb-4">
            <PieChart size={20} className="text-accent" />
            <h2 className="text-lg font-semibold text-white">By Trackable</h2>
          </div>
          {trackablePieData.length === 0 ? (
            <p className="text-gray-400 text-center py-8">No data available</p>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={trackablePieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, value }) => `${name}: ${formatAmount(value)}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {trackablePieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => formatAmount(value)} />
              </RechartsPieChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Bank Account Balance Over Time Line Chart */}
      <div className="bg-secondary border border-gray-700 rounded-lg p-6 mb-8">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-accent" />
          <h2 className="text-lg font-semibold text-white">Account Balances Over Time</h2>
        </div>
        {accountBalanceOverTime.length === 0 || accounts.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={accountBalanceOverTime}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip content={<CustomTooltip />} formatter={(value) => formatAmount(value)} />
              <Legend />
              {accounts.map((account, idx) => (
                <Line
                  key={account.id}
                  type="monotone"
                  dataKey={account.id}
                  stroke={COLORS[idx % COLORS.length]}
                  name={account.cardName}
                  strokeWidth={2}
                  dot={{ fill: COLORS[idx % COLORS.length], r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Date Analytics Line Chart */}
      <div className="bg-secondary border border-gray-700 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp size={20} className="text-accent" />
          <h2 className="text-lg font-semibold text-white">Trends Over Time</h2>
        </div>
        {dateAnalyticsData.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No data available</p>
        ) : (
          <ResponsiveContainer width="100%" height={350}>
            <LineChart data={dateAnalyticsData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis dataKey="name" stroke="#9CA3AF" />
              <YAxis stroke="#9CA3AF" />
              <Tooltip content={<CustomTooltip />} />
              <Legend />
              <Line type="monotone" dataKey="income" stroke="#10B981" name="Income" strokeWidth={2} dot={{ fill: '#10B981' }} />
              <Line type="monotone" dataKey="expense" stroke="#EF4444" name="Expense" strokeWidth={2} dot={{ fill: '#EF4444' }} />
              <Line type="monotone" dataKey="net" stroke="#3B82F6" name="Net" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Account Balances Chart */}
      <div className="bg-secondary border border-gray-700 rounded-lg p-6 mt-8">
        <div className="flex items-center gap-2 mb-4">
          <Wallet size={20} className="text-accent" />
          <h2 className="text-lg font-semibold text-white">Current Bank Balances</h2>
        </div>
        {accountBalancesData.length === 0 ? (
          <p className="text-gray-400 text-center py-8">No bank accounts added</p>
        ) : (
          <div className="space-y-3">
            {accountBalancesData.map((account, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-primary rounded-lg border border-gray-700">
                <div>
                  <p className="text-white font-medium">{account.name}</p>
                </div>
                <div>
                  <p className={`text-lg font-bold ${account.balance >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {formatAmount(account.balance)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
