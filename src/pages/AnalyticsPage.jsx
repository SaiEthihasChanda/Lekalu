import { useMemo, useState, useEffect } from 'react';
import { useActivities, useTrackables, useSources } from '../hooks/index.js';
import { calculateAnalytics, formatAmount, calculateAccountBalance, calculateNetWorth, generateDailyIncomeExpenseData } from '../utils/analytics.js';
import { TrendingUp, Wallet, DollarSign } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getUserEmail, listenToAnalyticsConfig } from '../fb/index.js';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, startOfWeek, endOfWeek, startOfYear, endOfYear, eachMonthOfInterval, startOfDay, endOfDay } from 'date-fns';

/**
 * @typedef {Object} AnalyticsFilter
 * @property {string} timeRange - Time range for filtering
 * @property {number} [startDate] - Start date timestamp
 * @property {number} [endDate] - End date timestamp
 * @property {string} [accountId] - Account ID filter
 * @property {string} [trackableId] - Trackable ID filter
 * @property {string} [userId] - User ID filter (for groups)
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
  const [selectedUserId, setSelectedUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uniqueUsers, setUniqueUsers] = useState([]);
  const [analyticsConfig, setAnalyticsConfig] = useState(null);
  const [configLoading, setConfigLoading] = useState(true);

  const { activities } = useActivities();
  const { trackables } = useTrackables();
  const { accounts } = useSources();
  const { group } = useAuth();

  // Set up real-time listener for analytics configuration
  useEffect(() => {
    const unsubscribe = listenToAnalyticsConfig((config) => {
      setAnalyticsConfig(config || {});
      setConfigLoading(false);
    });

    return () => unsubscribe();
  }, []);

  // Get unique users in group from activities and fetch their emails
  useEffect(() => {
    if (!group || !activities.length) {
      setUniqueUsers([]);
      return;
    }
    
    const fetchUserEmails = async () => {
      const usersMap = new Map();
      
      // Collect all unique user IDs from activities
      activities.forEach(activity => {
        if (activity.userId && !usersMap.has(activity.userId)) {
          usersMap.set(activity.userId, null); // placeholder
        }
      });
      
      // Fetch emails for each user
      const usersList = [];
      for (const [userId] of usersMap) {
        const email = await getUserEmail(userId);
        usersList.push({
          userId,
          email: email || userId,
        });
      }
      
      setUniqueUsers(usersList.sort((a, b) => a.email.localeCompare(b.email)));
    };
    
    fetchUserEmails();
  }, [activities, group]);

  /** @type {AnalyticsFilter} */
  const filter = {
    timeRange,
    startDate: startDate ? new Date(startDate).getTime() : undefined,
    endDate: endDate ? new Date(endDate).getTime() : undefined,
    accountId: selectedAccountId || undefined,
    trackableId: selectedTrackableId || undefined,
    userId: selectedUserId || undefined,
  };

  const trackablesMap = new Map(trackables.map(t => [t.id, t]));
  const analytics = useMemo(() => {
    return calculateAnalytics(activities, trackablesMap, filter);
  }, [activities, trackablesMap, filter]);

  // Bank account balances
  const accountBalancesData = useMemo(() => {
    return accounts.map(account => ({
      name: account.cardName,
      balance: calculateAccountBalance(account.id, account.openingBalance, activities),
    })).sort((a, b) => b.balance - a.balance);
  }, [accounts, activities]);

  // Calculate total net worth (credit cards treated as debt)
  const totalNetWorth = useMemo(() => {
    return calculateNetWorth(accounts, activities);
  }, [accounts, activities]);

  // Prepare daily/monthly income vs expense data for bar chart
  const dailyIncomeExpenseData = useMemo(() => {
    return generateDailyIncomeExpenseData(
      activities,
      timeRange,
      startDate ? new Date(startDate).getTime() : undefined,
      endDate ? new Date(endDate).getTime() : undefined
    );
  }, [activities, timeRange, startDate, endDate]);

  
  // Helper function to check if a visualization should be shown
  const isVisualizationVisible = (vizId) => {
    // Default to true if config not loaded yet (show all)
    if (!analyticsConfig) return true;
    // Check if visualization is explicitly set to false
    const vizConfig = analyticsConfig[vizId];
    return vizConfig?.visible !== false;
  };

  // Get sorted chart list based on config positions
  const getSortedCharts = () => {
    const charts = [
      { id: 'netWorth', label: 'Net Worth' },
      { id: 'dailyIncomeExpense', label: 'Daily Income vs Expense' },
      { id: 'currentBalances', label: 'Current Bank Balances' },
    ];

    // Sort by position in config
    return charts.sort((a, b) => {
      const posA = analyticsConfig?.[a.id]?.position ?? 999;
      const posB = analyticsConfig?.[b.id]?.position ?? 999;
      return posA - posB;
    }).filter(chart => isVisualizationVisible(chart.id));
  };

  const sortedCharts = useMemo(() => getSortedCharts(), [analyticsConfig]);

  // Helper function to render each chart type
  const renderChart = (chartId) => {
    switch(chartId) {
      case 'netWorth':
        return (
          <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={20} className="text-accent" />
              <h2 className="text-base md:text-lg font-semibold text-white truncate">Total Net Worth</h2>
            </div>
            <div className="flex flex-col items-center justify-center py-6 md:py-8">
              <p className={`text-2xl md:text-5xl font-bold break-words text-center ${totalNetWorth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatAmount(totalNetWorth)}
              </p>
              <p className="text-gray-400 mt-2 text-xs md:text-base text-center">
                {accounts.length > 0 ? `Combined from ${accounts.length} account${accounts.length !== 1 ? 's' : ''}` : 'No accounts added'}
              </p>
            </div>
          </div>
        );

      case 'dailyIncomeExpense':
        return (
          <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-accent" />
              <h2 className="text-base md:text-lg font-semibold text-white truncate">
                {timeRange === 'year' ? 'Monthly' : 'Daily'} Income vs Expense
              </h2>
            </div>
            {dailyIncomeExpenseData.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No data available</p>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={dailyIncomeExpenseData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="name" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    formatter={(value) => formatAmount(value)}
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      border: '1px solid #4B5563',
                      borderRadius: '8px',
                    }}
                    labelStyle={{ color: '#fff' }}
                  />
                  <Legend />
                  <Bar dataKey="income" fill="#10B981" name="Income" />
                  <Bar dataKey="expense" fill="#EF4444" name="Expense" />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>
        );

      case 'currentBalances':
        return (
          <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={20} className="text-accent" />
              <h2 className="text-base md:text-lg font-semibold text-white truncate">Current Bank Balances</h2>
            </div>
            {accountBalancesData.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No bank accounts added</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {accountBalancesData.map((account, index) => (
                  <div key={index} className="flex items-center justify-between p-2 md:p-3 bg-primary rounded-lg border border-gray-700">
                    <div>
                      <p className="text-white font-medium text-sm md:text-base truncate">{account.name}</p>
                    </div>
                    <div>
                      <p className={`text-base md:text-lg font-bold ${account.balance >= 0 ? 'text-green-400' : 'text-red-400'} truncate`}>
                        {formatAmount(account.balance)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Analytics</h1>
        <p className="text-sm md:text-base text-gray-400">Analyze your spending patterns</p>
      </div>

      {/* Filters */}
      <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6 mb-4 md:mb-8">
        <h2 className="text-sm md:text-lg font-semibold text-white mb-3 md:mb-4">Filters</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2 md:gap-3 lg:gap-4">
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

          {group && uniqueUsers.length > 0 && (
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">User</label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-xs md:text-sm focus:outline-none focus:border-accent"
              >
                <option value="">All Users</option>
                {uniqueUsers.map(user => (
                  <option key={user.userId} value={user.userId}>
                    {user.email}
                  </option>
                ))}
              </select>
            </div>
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
      <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-2 md:gap-3 lg:gap-4 mb-4 md:mb-8">
        <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6">
          <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Total Income</p>
          <p className="text-lg md:text-2xl font-bold text-green-400 truncate">{formatAmount(analytics.totalIncome)}</p>
        </div>
        <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6">
          <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Total Expense</p>
          <p className="text-lg md:text-2xl font-bold text-red-400 truncate">{formatAmount(analytics.totalExpense)}</p>
        </div>
        <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6">
          <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Net Flow</p>
          <p className={`text-lg md:text-2xl font-bold ${analytics.netFlow >= 0 ? 'text-green-400' : 'text-red-400'} truncate`}>
            {formatAmount(analytics.netFlow)}
          </p>
        </div>
        <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6">
          <p className="text-gray-400 text-xs md:text-sm mb-1 md:mb-2">Expense/Income Ratio</p>
          <p className="text-lg md:text-2xl font-bold text-accent">
            {analytics.totalIncome > 0
              ? ((analytics.totalExpense / analytics.totalIncome) * 100).toFixed(1)
              : '0'}
            %
          </p>
        </div>
      </div>

      {/* Charts Section - Dynamic ordering based on config */}
      <div className="space-y-4 md:space-y-8 mb-4 md:mb-8">
        {sortedCharts.map((chart) => (
          <div key={chart.id}>
            {renderChart(chart.id)}
          </div>
        ))}
      </div>
    </div>
  );
};
