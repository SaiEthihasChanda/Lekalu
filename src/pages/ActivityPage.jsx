import { useState, useMemo } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../components/Modal.jsx';
import { ActivityCard } from '../components/ActivityCard.jsx';
import { AddActivityForm } from '../components/AddActivityForm.jsx';
import { useActivities, useBankAccounts, useTrackables } from '../hooks/index.js';
import { formatAmount } from '../utils/analytics.js';

export const ActivityPage = () => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { accounts, loading: accountsLoading } = useBankAccounts();
  const { trackables, loading: tracksLoading } = useTrackables();
  
  const today = new Date();
  const { activities, addActivity } = useActivities({
    date: today.getTime(),
  });

  // Sort activities by date (most recent first)
  const sortedActivities = useMemo(() => {
    return [...activities].sort((a, b) => (b.date || 0) - (a.date || 0));
  }, [activities]);

  const todayStats = useMemo(() => {
    const todayActivities = sortedActivities.filter(a => a.type !== 'transfer');
    const totalIncome = todayActivities
      .filter(a => a.type === 'income')
      .reduce((sum, a) => sum + a.amount, 0);
    const totalExpense = todayActivities
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
          <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Today's Activity</h1>
          <p className="text-sm md:text-base text-gray-400">Track your daily income and expenses</p>
        </div>
        <button
          id="tour-add-activity"
          onClick={() => setIsModalOpen(true)}
          className="flex items-center justify-start gap-2 bg-accent hover:bg-blue-600 text-white font-medium py-2.5 md:py-3 px-6 rounded-lg transition-colors text-sm md:text-base w-fit"
        >
          <Plus size={18} className="md:w-5 md:h-5" />
          Add Activity
        </button>
      </div>

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
    </div>
  );
};
