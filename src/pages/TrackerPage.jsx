import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { startOfMonth, endOfMonth, eachDayOfInterval, format, isSameDay } from 'date-fns';
import { useTrackables, useTrackers, useActivities } from '../hooks/index.js';
import { useBankAccounts } from '../hooks/index.js';

export const TrackerPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const { trackables } = useTrackables();
  const { trackers, addTracker, updateTracker } = useTrackers();
  const { addActivity } = useActivities();
  const { accounts } = useBankAccounts();

  const month = currentDate.getMonth() + 1;
  const year = currentDate.getFullYear();

  const trackablesForThisMonth = useMemo(() => {
    return trackables.filter(t => t.includeInTracker);
  }, [trackables]);

  const trackersMap = useMemo(() => {
    const map = new Map();
    trackers.forEach(tracker => {
      if (tracker.month === month && tracker.year === year) {
        map.set(tracker.trackableId, tracker);
      }
    });
    return map;
  }, [trackers, month, year]);

  const accountsMap = new Map(accounts.map(a => [a.id, a]));

  const handleMarkComplete = async (trackableId) => {
    const existingTracker = trackersMap.get(trackableId);
    const trackable = trackables.find(t => t.id === trackableId);

    if (!trackable) return;

    if (existingTracker) {
      if (existingTracker.isDone) {
        // Mark as incomplete
        await updateTracker(existingTracker.id, { isDone: false, completedAt: null });
      } else {
        // Mark as complete and create activity
        const newActivity = {
          amount: trackable.trackerAmount || 0,
          type: trackable.type,
          trackableId: trackableId,
          accountId: trackable.accountId,
          description: trackable.name,
          date: new Date().getTime(),
          createdAt: new Date().getTime(),
          updatedAt: new Date().getTime(),
        };
        await addActivity(newActivity);
        await updateTracker(existingTracker.id, { isDone: true, completedAt: new Date().getTime() });
      }
    } else {
      // Create new tracker and activity
      const newTracker = {
        trackableId: trackableId,
        month: month,
        year: year,
        isDone: true,
        completedAt: new Date().getTime(),
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      };
      const trackerId = await addTracker(newTracker);

      // Create corresponding activity
      const newActivity = {
        amount: trackable.trackerAmount || 0,
        type: trackable.type,
        trackableId: trackableId,
        accountId: trackable.accountId,
        description: trackable.name,
        date: new Date().getTime(),
        createdAt: new Date().getTime(),
        updatedAt: new Date().getTime(),
      };
      await addActivity(newActivity);
    }
  };

  const completedCount = Array.from(trackersMap.values()).filter(t => t.isDone).length;
  const totalCount = trackablesForThisMonth.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const previousMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() - 1);
    setCurrentDate(newDate);
  };

  const nextMonth = () => {
    const newDate = new Date(currentDate);
    newDate.setMonth(newDate.getMonth() + 1);
    setCurrentDate(newDate);
  };

  return (
    <div className="p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-white mb-2">Monthly Tracker</h1>
        <p className="text-gray-400">Track your recurring monthly expenses</p>
      </div>

      {/* Month Navigation */}
      <div className="flex items-center justify-between mb-8 bg-secondary rounded-lg p-6">
        <button
          onClick={previousMonth}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronLeft size={24} />
        </button>

        <div className="text-center">
          <h2 className="text-2xl font-bold text-white">
            {format(currentDate, 'MMMM yyyy')}
          </h2>
        </div>

        <button
          onClick={nextMonth}
          className="text-gray-400 hover:text-white transition-colors"
        >
          <ChevronRight size={24} />
        </button>
      </div>

      {/* Progress Summary */}
      <div className="bg-secondary rounded-lg p-6 mb-8">
        <div className="flex justify-between items-center mb-4">
          <span className="text-gray-300 font-medium">Monthly Progress</span>
          <span className="text-white font-bold">
            {completedCount} / {totalCount}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-success h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-gray-400 text-sm mt-2">{progressPercentage}% Complete</p>
      </div>

      {/* Trackables List */}
      <div className="space-y-3">
        {trackablesForThisMonth.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-secondary rounded-lg">
            No trackables to track this month. Add trackables to get started!
          </div>
        ) : (
          trackablesForThisMonth.map(trackable => {
            const tracker = trackersMap.get(trackable.id);
            const isDone = tracker?.isDone || false;
            const account = accountsMap.get(trackable.accountId);

            return (
              <div
                key={trackable.id}
                className="bg-secondary rounded-lg p-4 flex items-center justify-between hover:bg-opacity-80 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <button
                    onClick={() => handleMarkComplete(trackable.id)}
                    className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                      isDone
                        ? 'bg-success border-success'
                        : 'border-gray-600 hover:border-gray-400'
                    }`}
                  >
                    {isDone && <span className="text-white font-bold">✓</span>}
                  </button>

                  <div className="flex-1">
                    <p className={`font-medium ${isDone ? 'text-gray-400 line-through' : 'text-white'}`}>
                      {trackable.name}
                    </p>
                    {account && (
                      <p className="text-sm text-gray-400">{account.cardName}</p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-bold text-white">
                      {trackable.type === 'income' ? '+' : '-'}{trackable.trackerAmount || 0}
                    </p>
                    <p className="text-sm text-gray-400 capitalize">{trackable.type}</p>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
