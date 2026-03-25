import { useState, useMemo, useEffect } from 'react';
import { Plus, Users } from 'lucide-react';
import { startOfDay, startOfMonth, startOfYear, endOfDay, endOfMonth, endOfYear } from 'date-fns';
import { Modal } from '../components/Modal.jsx';
import { ActivityCard } from '../components/ActivityCard.jsx';
import { AddActivityForm } from '../components/AddActivityForm.jsx';
import { useActivities, useBankAccounts, useTrackables } from '../hooks/index.js';
import { formatAmount } from '../utils/analytics.js';
import { getUserEmail } from '../fb/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';

export const ActivityPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isGroupDetailsOpen, setIsGroupDetailsOpen] = useState(false);
  const [dateFilter, setDateFilter] = useState('daily'); // daily, monthly, todate
  const [memberEmails, setMemberEmails] = useState({});
  const { user, loading: authLoading, group } = useAuth();
  const { accounts, loading: accountsLoading } = useBankAccounts();
  const { trackables, loading: tracksLoading } = useTrackables();
  
  const today = new Date();
  const { activities, addActivity } = useActivities({
    date: today.getTime(),
  });

  // Fetch member emails when group changes
  useEffect(() => {
    const loadMemberEmails = async () => {
      if (!group?.members) {
        setMemberEmails({});
        return;
      }

      try {
        const emails = {};
        for (const memberId of group.members) {
          try {
            const email = await getUserEmail(memberId);
            emails[memberId] = email || memberId;
          } catch (err) {
            console.error(`Error fetching email for ${memberId}:`, err);
            emails[memberId] = memberId;
          }
        }
        setMemberEmails(emails);
      } catch (err) {
        console.error('Error loading member emails:', err);
        setMemberEmails({});
      }
    };

    loadMemberEmails();
  }, [group?.members]);

  // Get date range based on filter
  const getDateRange = useMemo(() => {
    switch (dateFilter) {
      case 'daily':
        return { start: startOfDay(today).getTime(), end: endOfDay(today).getTime() };
      case 'monthly':
        return { start: startOfMonth(today).getTime(), end: endOfMonth(today).getTime() };
      case 'todate':
        return { start: startOfYear(today).getTime(), end: endOfDay(today).getTime() };
      default:
        return { start: startOfDay(today).getTime(), end: endOfDay(today).getTime() };
    }
  }, [dateFilter]);

  // Sort and filter activities by date range
  const sortedActivities = useMemo(() => {
    return [...activities]
      // Filter out activities with invalid data before comparing dates
      .filter(a => a && a.date != null && typeof a.date === 'number')
      .filter(a => a.date >= getDateRange.start && a.date <= getDateRange.end)
      .sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [activities, getDateRange]);

  const todayStats = useMemo(() => {
    const filteredActivities = sortedActivities.filter(a => a.type !== 'transfer');
    const totalIncome = filteredActivities
      .filter(a => a.type === 'income')
      .reduce((sum, a) => sum + a.amount, 0);
    const totalExpense = filteredActivities
      .filter(a => a.type === 'expense')
      .reduce((sum, a) => sum + a.amount, 0);

    return {
      totalIncome,
      totalExpense,
      netFlow: totalIncome - totalExpense,
    };
  }, [sortedActivities]);

  const handleAddActivity = async (data) => {
    await addActivity({
      ...data,
      date: Date.now(),
    });
    setIsModalOpen(false);
  };

  const trackablesMap = new Map(trackables.map(t => [t.id, t]));
  const accountsMap = new Map(accounts.map(a => [a.id, a]));

  return (
    <div className="p-4 md:p-8">
      {/* Header with Button (Mobile: side by side) */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 md:gap-0 mb-6 md:mb-8">
        <div className="flex-1">
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">
            {dateFilter === 'daily' ? "Activity" : dateFilter === 'monthly' ? 'Monthly Activity' : 'Year-to-Date Activity'}
          </h1>
          <p className="text-sm md:text-base text-gray-400">Track your income and expenses</p>
        </div>
      </div>

      {/* Date Filter Buttons and Add Activity */}
      <div className="flex flex-col md:flex-row gap-4 md:gap-3 md:items-center md:justify-between mb-6 md:mb-8">
        <div className="flex gap-2 md:gap-3">
          <button
            onClick={() => setDateFilter('daily')}
            className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-colors ${
              dateFilter === 'daily'
                ? 'bg-accent text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Daily
          </button>
          <button
            onClick={() => setDateFilter('monthly')}
            className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-colors ${
              dateFilter === 'monthly'
                ? 'bg-accent text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Monthly
          </button>
          <button
            onClick={() => setDateFilter('todate')}
            className={`px-3 md:px-4 py-2 rounded-lg font-medium text-sm md:text-base transition-colors ${
              dateFilter === 'todate'
                ? 'bg-accent text-white'
                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
            }`}
          >
            Year-to-Date
          </button>
        </div>
        <button
          id="tour-add-activity"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-center gap-2 bg-accent hover:bg-blue-600 text-white font-medium py-2.5 md:py-2 px-6 rounded-lg transition-colors text-sm md:text-base w-fit whitespace-nowrap"
        >
          <Plus size={18} className="md:w-5 md:h-5" />
          Add Activity
        </button>
      </div>

      {/* Group Info Card */}
      {group && (
        <div
          onClick={() => setIsGroupDetailsOpen(true)}
          className="bg-gradient-to-r from-blue-900/30 to-purple-900/30 border border-accent/50 rounded-lg p-4 mb-6 md:mb-8 cursor-pointer hover:border-accent transition-colors"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Users size={20} className="text-accent" />
              <div>
                <p className="text-xs text-gray-400">Group</p>
                <p className="text-lg font-semibold text-white">{group.name}</p>
              </div>
            </div>
            <div className="text-right">
              <p className="text-xs text-gray-400">{group.members?.length || 0} members</p>
              <p className="text-sm font-medium text-accent">Click to view</p>
            </div>
          </div>
        </div>
      )}

      {/* Stats Cards */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-6 md:mb-8">
        <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6">
          <p className="text-gray-400 text-xs mb-2">Total Income</p>
          <p className="text-lg md:text-2xl font-bold text-green-400">{formatAmount(todayStats.totalIncome)}</p>
        </div>
        <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6">
          <p className="text-gray-400 text-xs mb-2">Total Expense</p>
          <p className="text-lg md:text-2xl font-bold text-red-400">{formatAmount(todayStats.totalExpense)}</p>
        </div>
        <div className="bg-secondary border border-gray-700 rounded-lg p-3 md:p-6 col-span-2 md:col-span-1">
          <p className="text-gray-400 text-xs mb-2">Net Flow</p>
          <p className={`text-lg md:text-2xl font-bold ${todayStats.netFlow >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {formatAmount(todayStats.netFlow)}
          </p>
        </div>
      </div>

      {/* Activities List */}
      <div className="space-y-3">
        {sortedActivities.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400">No activities for today</p>
          </div>
        ) : (
          sortedActivities.map(activity => (
            <ActivityCard
              key={activity.id}
              activity={activity}
              trackable={activity.trackableId ? trackablesMap.get(activity.trackableId) : undefined}
              account={accountsMap.get(activity.accountId)}
            />
          ))
        )}
      </div>

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add Activity"
        size="md"
      >
        {!accountsLoading && !tracksLoading ? (
          <AddActivityForm
            trackables={trackables}
            accounts={accounts}
            onSubmit={handleAddActivity}
          />
        ) : (
          <div className="text-center py-8 text-gray-400">Loading...</div>
        )}
      </Modal>

      {/* Group Details Modal */}
      <Modal
        isOpen={isGroupDetailsOpen}
        onClose={() => setIsGroupDetailsOpen(false)}
      >
        <div className="w-full max-w-md">
          <h2 className="text-2xl font-bold text-white mb-6">Group Details</h2>
          
          <div className="space-y-4">
            <div>
              <p className="text-xs text-gray-400">Group Name</p>
              <p className="text-lg font-semibold text-white">{group?.name}</p>
            </div>

            <div>
              <p className="text-xs text-gray-400 mb-3">Members ({group?.members?.length || 0})</p>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {group?.members?.map((memberId) => (
                  <div key={memberId} className={`flex items-center gap-2 p-3 rounded ${
                    group.owner === memberId 
                      ? 'bg-yellow-500/20 border border-yellow-500/30' 
                      : 'bg-gray-700/30 border border-gray-600'
                  }`}>
                    <div className="flex-1">
                      <p className={`text-sm font-medium ${
                        group.owner === memberId ? 'text-yellow-400' : 'text-gray-300'
                      }`}>
                        {memberEmails[memberId] || memberId}
                      </p>
                    </div>
                    {group.owner === memberId && (
                      <span className="text-lg">👑</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </Modal>
    </div>
  );
};
