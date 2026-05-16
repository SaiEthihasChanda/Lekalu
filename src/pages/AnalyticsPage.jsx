import { useMemo, useState, useEffect } from 'react';
import { useActivities, useTrackables, useSources } from '../hooks/index.js';
import { calculateAnalytics, formatAmount, calculateAccountBalance, generateDailyIncomeExpenseData, getDateRange } from '../utils/analytics.js';
import { TrendingUp, Wallet, DollarSign, ListOrdered, Download } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { getUserEmail, listenToAnalyticsConfig } from '../fb/index.js';
import { ActivityCard } from '../components/ActivityCard.jsx';
import { Modal } from '../components/Modal.jsx';
import { format as formatDate } from 'date-fns';
import * as XLSX from 'xlsx';
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

/**
 * @typedef {Object} AnalyticsFilter
 * @property {string} timeRange - Time range for filtering
 * @property {number} [startDate] - Start date timestamp
 * @property {number} [endDate] - End date timestamp
 * @property {string} [accountId] - Account ID filter
 * @property {string} [trackableId] - Trackable ID filter
 * @property {string} [userId] - User ID filter (for groups)
 */

const MASTER_TABS = [
  { id: 'all', label: 'All Data' },
  { id: 'income', label: 'Income' },
  { id: 'expenses', label: 'Expenses' },
];

const TRANSFER_TYPES = new Set(['transfer', 'self transfer', 'self-transfer', 'self_transfer']);

const isTransferType = (type) => typeof type === 'string' && TRANSFER_TYPES.has(type.trim().toLowerCase());

const getSourceType = (account) => {
  if (!account?.sourceType) return 'none';
  return String(account.sourceType).toLowerCase();
};

const shouldIncludeAccountInMasterView = (account, view) => {
  if (view === 'all') return true;

  const sourceType = getSourceType(account);
  if (view === 'income') return sourceType === 'debit';
  if (view === 'expenses') return sourceType === 'credit';
  return true;
};

const shouldIncludeTrackableInMasterView = (trackable, view) => {
  if (view === 'all') return true;
  if (!trackable?.type) return false;
  return trackable.type === (view === 'income' ? 'income' : 'expense');
};

const getAccountLabel = (account) => account?.cardName || account?.name || 'Unnamed Account';

const getActivityAccountId = (activity) => activity?.accountId || activity?.sourceId || activity?.fromAccountId || activity?.fromSourceId || activity?.toAccountId || activity?.toSourceId || '';

const resolveTransactionScrollThreshold = (config) => {
  const candidates = [
    config?.transactionScrollThreshold?.value,
    config?.transactionScrollThreshold,
    config?.transactionScrollLimit?.value,
    config?.transactionScrollLimit,
    config?.transactionListScrollThreshold?.value,
    config?.transactionListScrollThreshold,
  ];

  for (const candidate of candidates) {
    const numeric = Number.parseInt(candidate, 10);
    if (Number.isFinite(numeric)) {
      return Math.max(1, Math.min(50, numeric));
    }
  }

  return 10;
};

const getDefaultConfigValue = (id, field) => {
  const defaults = {
    masterTotal: { visible: true },
    masterBalances: { visible: true },
    masterTrackables: { visible: true },
    filteredSummary: { visible: true },
    filteredTransactions: { visible: true },
    filteredCharts: { visible: true },
    stickyMobileTabs: { enabled: true },
    transactionScrollThreshold: { value: 10 },
    trendsOverTime: { visible: true, position: 0 },
    currentBalances: { visible: true, position: 1 },
  };

  return defaults[id]?.[field];
};

export const AnalyticsPage = () => {
  const [activeTab, setActiveTab] = useState('master'); // master | filtered
  const [masterView, setMasterView] = useState('all'); // all | income | expenses
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportStartDate, setExportStartDate] = useState('');
  const [exportEndDate, setExportEndDate] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState('');
  const [timeRange, setTimeRange] = useState('month');
  const [selectedAccountId, setSelectedAccountId] = useState('');
  const [selectedTrackableId, setSelectedTrackableId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [uniqueUsers, setUniqueUsers] = useState([]);
  const [analyticsConfig, setAnalyticsConfig] = useState(null);

  const { activities } = useActivities();
  const { trackables } = useTrackables();
  const { accounts } = useSources();
  const { group } = useAuth();

  // Set up real-time listener for analytics configuration
  useEffect(() => {
    const unsubscribe = listenToAnalyticsConfig((config) => {
      setAnalyticsConfig(config || {});
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
  const accountsMap = new Map(accounts.map((a) => [a.id, a]));

  const masterAccounts = useMemo(() => {
    return accounts.filter((account) => shouldIncludeAccountInMasterView(account, masterView));
  }, [accounts, masterView]);

  const masterAccountBalances = useMemo(() => {
    return masterAccounts
      .map((account) => ({
        id: account.id,
        name: getAccountLabel(account),
        balance: calculateAccountBalance(account.id, account.openingBalance || 0, activities),
      }))
      .sort((a, b) => b.balance - a.balance);
  }, [masterAccounts, activities]);

  const masterTotal = useMemo(() => {
    return masterAccountBalances.reduce((sum, account) => sum + account.balance, 0);
  }, [masterAccountBalances]);

  const masterTrackableTotals = useMemo(() => {
    const totals = new Map();

    activities.forEach((activity) => {
      if (!activity || isTransferType(activity.type) || !activity.trackableId) {
        return;
      }

      const trackable = trackablesMap.get(activity.trackableId);
      if (!trackable || !shouldIncludeTrackableInMasterView(trackable, masterView)) {
        return;
      }

      const current = totals.get(trackable.id) || {
        id: trackable.id,
        name: trackable.name || 'Unnamed Trackable',
        type: trackable.type || activity.type,
        total: 0,
      };

      current.total += Number(activity.amount) || 0;
      totals.set(trackable.id, current);
    });

    return Array.from(totals.values()).sort((a, b) => b.total - a.total);
  }, [activities, trackablesMap, masterView]);

  const exportableMasterTransactions = useMemo(() => {
    const start = exportStartDate ? new Date(`${exportStartDate}T00:00:00`).getTime() : null;
    const end = exportEndDate ? new Date(`${exportEndDate}T23:59:59.999`).getTime() : null;

    return [...activities]
      .filter((activity) => {
        if (!activity || !activity.date || isTransferType(activity.type)) return false;

        const activityDate = Number(activity.date);
        if (Number.isNaN(activityDate)) return false;
        if (start != null && activityDate < start) return false;
        if (end != null && activityDate > end) return false;

        const accountId = getActivityAccountId(activity);
        if (!accountId) return masterView === 'all';

        const account = accountsMap.get(accountId);
        if (!account) return masterView === 'all';

        return shouldIncludeAccountInMasterView(account, masterView);
      })
      .sort((a, b) => (a.date || 0) - (b.date || 0));
  }, [activities, accountsMap, exportStartDate, exportEndDate, masterView]);

  const handleOpenExportModal = () => {
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    setExportStartDate(firstDayOfMonth.toISOString().slice(0, 10));
    setExportEndDate(today.toISOString().slice(0, 10));
    setExportError('');
    setShowExportModal(true);
  };

  const handleDownloadExcel = async () => {
    setExportError('');

    if (!exportStartDate || !exportEndDate) {
      setExportError('Please select both from and to dates.');
      return;
    }

    const start = new Date(`${exportStartDate}T00:00:00`).getTime();
    const end = new Date(`${exportEndDate}T23:59:59.999`).getTime();

    if (Number.isNaN(start) || Number.isNaN(end)) {
      setExportError('Please enter valid dates.');
      return;
    }

    if (start > end) {
      setExportError('From date must be before or equal to the to date.');
      return;
    }

    setIsExporting(true);

    try {
      const toExportRow = (activity) => {
        const accountId = getActivityAccountId(activity);
        const account = accountsMap.get(accountId);
        const trackable = activity.trackableId ? trackablesMap.get(activity.trackableId) : null;
        const amount = Number(activity.amount) || 0;

        return {
          Date: formatDate(new Date(activity.date), 'yyyy-MM-dd'),
          Trackable: trackable?.name || activity.trackableName || 'N/A',
          Amount: String(String(activity.type || '').toLowerCase() === 'expense' ? -Math.abs(amount) : Math.abs(amount)),
          'Bank Source': getAccountLabel(account),
        };
      };

      const activitiesInRange = [...activities].filter((activity) => {
        if (!activity || !activity.date || isTransferType(activity.type)) return false;

        const activityDate = Number(activity.date);
        if (Number.isNaN(activityDate)) return false;
        if (activityDate < start || activityDate > end) return false;

        return true;
      });

      const masterRows = exportableMasterTransactions.map(toExportRow);
      const incomeRows = activitiesInRange
        .filter((activity) => String(activity.type || '').toLowerCase() === 'income')
        .map(toExportRow);
      const expenseRows = activitiesInRange
        .filter((activity) => String(activity.type || '').toLowerCase() === 'expense')
        .map(toExportRow);

      const workbook = XLSX.utils.book_new();
      const worksheetOptions = {
        header: ['Date', 'Trackable', 'Amount', 'Bank Source'],
      };

      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(masterRows, worksheetOptions), 'Master Data');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(incomeRows, worksheetOptions), 'Income');
      XLSX.utils.book_append_sheet(workbook, XLSX.utils.json_to_sheet(expenseRows, worksheetOptions), 'Expenses');

      const safeStart = exportStartDate.replaceAll('-', '');
      const safeEnd = exportEndDate.replaceAll('-', '');
      const fileName = `Lekalu_Analytics_${masterView}_${safeStart}_${safeEnd}.xlsx`;
      XLSX.writeFile(workbook, fileName, { compression: true });

      setShowExportModal(false);
    } catch (error) {
      console.error('Error exporting master data:', error);
      setExportError('Failed to generate the Excel file. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  const filteredTransactions = useMemo(() => {
    const { start, end } = getDateRange(filter);

    return [...activities]
      .filter((activity) => {
        if (!activity || activity.date == null) return false;

        const inDateRange = activity.date >= start && activity.date <= end;
        if (!inDateRange) return false;

        if (filter.userId && activity.userId !== filter.userId) return false;
        if (filter.trackableId && activity.trackableId !== filter.trackableId) return false;

        if (!filter.accountId) return true;

        if (isTransferType(activity.type)) {
          return [
            activity.fromAccountId,
            activity.toAccountId,
            activity.fromSourceId,
            activity.toSourceId,
          ].includes(filter.accountId);
        }

        return activity.accountId === filter.accountId || activity.sourceId === filter.accountId;
      })
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [activities, filter]);

  const analytics = useMemo(() => {
    return calculateAnalytics(activities, trackablesMap, filter);
  }, [activities, trackablesMap, filter]);

  const filteredAccountBalancesData = useMemo(() => {
    return accounts
      .map((account) => ({
        id: account.id,
        name: getAccountLabel(account),
        balance: calculateAccountBalance(account.id, account.openingBalance || 0, filteredTransactions),
      }))
      .filter((account) => !selectedAccountId || account.id === selectedAccountId)
      .sort((a, b) => b.balance - a.balance);
  }, [accounts, filteredTransactions, selectedAccountId]);

  // Prepare daily/monthly income vs expense data for bar chart
  const dailyIncomeExpenseData = useMemo(() => {
    return generateDailyIncomeExpenseData(
      filteredTransactions,
      timeRange,
      startDate ? new Date(startDate).getTime() : undefined,
      endDate ? new Date(endDate).getTime() : undefined
    );
  }, [filteredTransactions, timeRange, startDate, endDate]);

  const isLayoutSectionVisible = (sectionId) => {
    if (!analyticsConfig) return getDefaultConfigValue(sectionId, 'visible') ?? true;
    return analyticsConfig?.[sectionId]?.visible ?? getDefaultConfigValue(sectionId, 'visible') ?? true;
  };

  const stickyMobileTabsEnabled = analyticsConfig?.stickyMobileTabs?.enabled ?? getDefaultConfigValue('stickyMobileTabs', 'enabled') ?? true;
  const transactionScrollThreshold = resolveTransactionScrollThreshold(analyticsConfig);

  
  // Helper function to check if a visualization should be shown
  const isVisualizationVisible = (vizId) => {
    // Default to true if config not loaded yet (show all)
    if (!analyticsConfig) return true;
    // Check if visualization is explicitly set to false
    const vizConfig = analyticsConfig[vizId];
    const visibleDefault = getDefaultConfigValue(vizId, 'visible');
    return vizConfig?.visible ?? visibleDefault ?? true;
  };

  const sortedCharts = useMemo(() => {
    const charts = [
      { id: 'dailyIncomeExpense', configId: 'trendsOverTime', label: 'Daily Income vs Expense' },
      { id: 'currentBalances', configId: 'currentBalances', label: 'Current Bank Balances' },
    ];

    return charts
      .filter((chart) => isVisualizationVisible(chart.configId))
      .sort((a, b) => {
        const posA = analyticsConfig?.[a.configId]?.position ?? getDefaultConfigValue(a.configId, 'position') ?? 999;
        const posB = analyticsConfig?.[b.configId]?.position ?? getDefaultConfigValue(b.configId, 'position') ?? 999;
        return posA - posB;
      });
  }, [analyticsConfig]);

  // Helper function to render each chart type
  const renderChart = (chartId) => {
    switch(chartId) {
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
            {filteredAccountBalancesData.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No bank accounts added</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {filteredAccountBalancesData.map((account, index) => (
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

      {/* Main Tabs */}
      <div className={`${stickyMobileTabsEnabled ? 'sticky top-0 z-20 bg-primary/95 backdrop-blur-sm py-2 md:static md:bg-transparent md:backdrop-blur-none md:py-0' : 'py-2 md:py-0'}`}>
        <div className="grid grid-cols-2 gap-1 bg-secondary border border-gray-700 rounded-xl p-1 mb-4 md:mb-6">
        <button
          onClick={() => setActiveTab('master')}
          className={`w-full px-3 md:px-4 py-2.5 rounded-lg font-semibold text-sm md:text-base transition-colors ${
            activeTab === 'master'
              ? 'bg-accent text-white shadow-sm'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          Master
        </button>
        <button
          onClick={() => setActiveTab('filtered')}
          className={`w-full px-3 md:px-4 py-2.5 rounded-lg font-semibold text-sm md:text-base transition-colors ${
            activeTab === 'filtered'
              ? 'bg-accent text-white shadow-sm'
              : 'text-gray-300 hover:bg-gray-700'
          }`}
        >
          Filtered
        </button>
        </div>
      </div>

      {activeTab === 'master' && (
        <>
          <div className="flex items-start justify-between gap-3 mb-4 md:mb-6">
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-[0.25em] text-gray-500 mb-1">Master View</p>
              <h2 className="text-lg md:text-2xl font-semibold text-white">Master data overview</h2>
              <p className="text-sm text-gray-400 mt-1">View totals, balances, and per-trackable values, or export a date range.</p>
            </div>
            <button
              onClick={handleOpenExportModal}
              className="inline-flex items-center gap-2 rounded-lg bg-accent px-3 py-2 text-sm font-semibold text-white transition-colors hover:bg-accent/90 flex-shrink-0"
            >
              <Download size={16} />
              Download Excel
            </button>
          </div>

          {/* Master Sub Tabs */}
          <div className={`${stickyMobileTabsEnabled ? 'sticky top-[72px] z-10 bg-primary/95 backdrop-blur-sm py-2 md:static md:bg-transparent md:backdrop-blur-none md:py-0' : 'py-2 md:py-0'}`}>
            <div className="grid grid-cols-3 gap-1 bg-secondary border border-gray-700 rounded-xl p-1 mb-4 md:mb-8">
            {MASTER_TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setMasterView(tab.id)}
                className={`w-full px-2 md:px-4 py-2.5 rounded-lg font-semibold text-xs md:text-sm transition-colors ${
                  masterView === tab.id
                    ? 'bg-accent text-white shadow-sm'
                    : 'text-gray-300 hover:bg-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
            </div>
          </div>

          {/* Master Total */}
          {isLayoutSectionVisible('masterTotal') && (
          <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6 mb-4 md:mb-8">
            <div className="flex items-center gap-2 mb-4">
              <DollarSign size={20} className="text-accent" />
              <h2 className="text-base md:text-lg font-semibold text-white truncate">Total</h2>
            </div>
            <div className="flex flex-col items-center justify-center py-6 md:py-8">
              <p className={`text-2xl md:text-5xl font-bold break-words text-center ${masterTotal >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatAmount(masterTotal)}
              </p>
              <p className="text-gray-400 mt-2 text-xs md:text-base text-center">
                {masterAccounts.length > 0
                  ? `${masterAccounts.length} account${masterAccounts.length !== 1 ? 's' : ''} included`
                  : 'No accounts in this view'}
              </p>
            </div>
          </div>
          )}

          {/* Master Bank Balances */}
          {isLayoutSectionVisible('masterBalances') && (
          <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6 mb-4 md:mb-8">
            <div className="flex items-center gap-2 mb-4">
              <Wallet size={20} className="text-accent" />
              <h2 className="text-base md:text-lg font-semibold text-white truncate">Current Bank Balances</h2>
            </div>
            {masterAccountBalances.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No bank accounts for this view</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {masterAccountBalances.map((account) => (
                  <div key={account.id} className="flex items-center justify-between p-2 md:p-3 bg-primary rounded-lg border border-gray-700">
                    <p className="text-white font-medium text-sm md:text-base truncate">{account.name}</p>
                    <p className={`text-base md:text-lg font-bold ${account.balance >= 0 ? 'text-green-400' : 'text-red-400'} truncate`}>
                      {formatAmount(account.balance)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}

          {/* Master Per Trackable Totals */}
          {isLayoutSectionVisible('masterTrackables') && (
          <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6">
            <div className="flex items-center gap-2 mb-4">
              <TrendingUp size={20} className="text-accent" />
              <h2 className="text-base md:text-lg font-semibold text-white truncate">Per Trackable Totals</h2>
            </div>
            {masterTrackableTotals.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No trackable activity for this view</p>
            ) : (
              <div className="space-y-2 md:space-y-3">
                {masterTrackableTotals.map((item) => (
                  <div key={item.id} className="flex items-center justify-between p-2 md:p-3 bg-primary rounded-lg border border-gray-700">
                    <div className="min-w-0">
                      <p className="text-white font-medium text-sm md:text-base truncate">{item.name}</p>
                      <p className="text-xs text-gray-400 capitalize">{item.type || 'unknown'}</p>
                    </div>
                    <p className={`text-base md:text-lg font-bold ${item.type === 'expense' ? 'text-red-400' : 'text-green-400'} truncate`}>
                      {formatAmount(item.total)}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </div>
          )}
        </>
      )}

      {activeTab === 'filtered' && (
        <>
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
                      {getAccountLabel(acc)}
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
          {isLayoutSectionVisible('filteredSummary') && (
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
          )}

          {/* Filtered Transactions */}
          {isLayoutSectionVisible('filteredTransactions') && (
          <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6 mb-4 md:mb-8">
            <div className="flex items-center gap-2 mb-4">
              <ListOrdered size={20} className="text-accent" />
              <h2 className="text-base md:text-lg font-semibold text-white truncate">Related Transactions</h2>
            </div>

            {filteredTransactions.length === 0 ? (
              <p className="text-gray-400 text-center py-8">No transactions match the selected filters</p>
            ) : (
              <div className={`${filteredTransactions.length >= transactionScrollThreshold ? 'max-h-[32rem] overflow-y-auto pr-1 md:pr-2' : ''} space-y-2 md:space-y-3`}>
                {filteredTransactions.map((activity) => (
                  <ActivityCard
                    key={activity.id}
                    activity={activity}
                    trackable={activity.trackableId ? trackablesMap.get(activity.trackableId) : undefined}
                    account={accountsMap.get(activity.accountId || activity.sourceId)}
                    fromAccount={accountsMap.get(activity.fromAccountId || activity.fromSourceId)}
                    toAccount={accountsMap.get(activity.toAccountId || activity.toSourceId)}
                  />
                ))}
              </div>
            )}
          </div>
          )}

          {/* Charts Section */}
          {isLayoutSectionVisible('filteredCharts') && (
          <div className="space-y-4 md:space-y-8 mb-4 md:mb-8">
            {sortedCharts.map((chart) => (
              <div key={chart.id}>
                {renderChart(chart.id)}
              </div>
            ))}
          </div>
          )}
        </>
      )}

      <Modal
        isOpen={showExportModal}
        onClose={() => setShowExportModal(false)}
        title="Download Master Data"
        size="md"
      >
        <div className="space-y-4">
          <p className="text-sm text-gray-400">
            Export the current master view as an Excel file. The date range is inclusive.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">From date</label>
              <input
                type="date"
                value={exportStartDate}
                onChange={(e) => setExportStartDate(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-2">To date</label>
              <input
                type="date"
                value={exportEndDate}
                onChange={(e) => setExportEndDate(e.target.value)}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent"
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-700 bg-primary p-3 text-sm text-gray-300">
            <p>Master subview: <span className="font-semibold text-white capitalize">{masterView}</span></p>
            <p className="mt-1">Rows ready to export: <span className="font-semibold text-white">{exportableMasterTransactions.length}</span></p>
          </div>

          {exportError && (
            <p className="text-sm text-red-400">{exportError}</p>
          )}

          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              onClick={() => setShowExportModal(false)}
              className="rounded-lg border border-gray-600 px-4 py-2 text-sm font-medium text-gray-300 hover:bg-gray-700 transition-colors"
              disabled={isExporting}
            >
              Cancel
            </button>
            <button
              onClick={handleDownloadExcel}
              className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white hover:bg-accent/90 transition-colors disabled:opacity-50"
              disabled={isExporting}
            >
              {isExporting ? 'Preparing...' : 'Download'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
