import { useState, useMemo } from 'react';
import { ChevronLeft, ChevronRight, Calendar } from 'lucide-react';
import {
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfYear,
  endOfYear,
  addDays,
  addWeeks,
  addMonths,
  addYears,
  format,
  isSameDay,
  isWithinInterval,
} from 'date-fns';
import { useTrackables, useTrackers, useActivities } from '../hooks/index.js';

/**
 * Get Sunday of current week (or previous Sunday if today is not Sunday)
 */
const getWeekStart = (date) => {
  const d = new Date(date);
  const dayOfWeek = d.getDay(); // 0 = Sunday
  const diff = dayOfWeek === 0 ? 0 : dayOfWeek;
  return startOfDay(new Date(d.getFullYear(), d.getMonth(), d.getDate() - diff));
};

/**
 * Get Saturday of current week (6 days after Sunday start)
 */
const getWeekEnd = (date) => {
  const weekStart = getWeekStart(date);
  return endOfDay(addDays(weekStart, 6));
};
import { CheckerModal } from '../components/CheckerModal.jsx';

const getPeriodForOccurrence = (occurrenceDate, frequency) => {
  const date = new Date(occurrenceDate);
  
  switch (frequency) {
    case 'daily':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'weekly':
      return { start: getWeekStart(date), end: getWeekEnd(date) };
    case 'monthly':
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case 'yearly':
      return { start: startOfYear(date), end: endOfYear(date) };
    default:
      return { start: startOfMonth(date), end: endOfMonth(date) };
  }
};

const doesTrackerSpanGranularity = (trackerOccurrence, trackerFrequency, granularityStart, granularityEnd) => {
  const trackerPeriod = getPeriodForOccurrence(trackerOccurrence, trackerFrequency);
  
  // Check if tracker's period overlaps with granularity period
  return isWithinInterval(granularityStart, trackerPeriod) || 
         isWithinInterval(granularityEnd, trackerPeriod) ||
         isWithinInterval(trackerPeriod.start, { start: granularityStart, end: granularityEnd }) ||
         isWithinInterval(trackerPeriod.end, { start: granularityStart, end: granularityEnd });
};

const getTrackerDisplayInstances = (tracker, trackable, granularityStart, granularityEnd, granularity) => {
  // If this tracker doesn't span the current granularity, return empty
  if (!doesTrackerSpanGranularity(tracker.occurrenceDate, trackable?.frequency, granularityStart, granularityEnd)) {
    return [];
  }

  const trackerPeriod = getPeriodForOccurrence(tracker.occurrenceDate, trackable?.frequency);
  
  // Generate display instances based on granularity
  const instances = [];
  
  if (granularity === 'day') {
    // For day view, show once if it's in the period
    instances.push({ ...tracker, displayDate: granularityStart });
  } else if (granularity === 'week') {
    // For week view, show once if it's in the period
    instances.push({ ...tracker, displayDate: granularityStart });
  } else if (granularity === 'month') {
    // For month view, show once if it's in the period
    instances.push({ ...tracker, displayDate: granularityStart });
  } else if (granularity === 'year') {
    // For year view, show once if it's in the period
    instances.push({ ...tracker, displayDate: granularityStart });
  }
  
  return instances;
};

const GRANULARITIES = ['day', 'week', 'month', 'year'];

const getDateRange = (date, granularity) => {
  switch (granularity) {
    case 'day':
      return { start: startOfDay(date), end: endOfDay(date) };
    case 'week':
      return { start: getWeekStart(date), end: getWeekEnd(date) };
    case 'month':
      return { start: startOfMonth(date), end: endOfMonth(date) };
    case 'year':
      return { start: startOfYear(date), end: endOfYear(date) };
    default:
      return { start: startOfMonth(date), end: endOfMonth(date) };
  }
};

const getDateLabel = (date, granularity) => {
  switch (granularity) {
    case 'day':
      return format(date, 'MMM d, yyyy');
    case 'week':
      const weekStart = getWeekStart(date);
      const weekEnd = getWeekEnd(date);
      return `${format(weekStart, 'MMM d')} - ${format(weekEnd, 'MMM d, yyyy')}`;
    case 'month':
      return format(date, 'MMMM yyyy');
    case 'year':
      return format(date, 'yyyy');
    default:
      return format(date, 'MMMM yyyy');
  }
};

const getNextDate = (date, granularity) => {
  switch (granularity) {
    case 'day':
      return addDays(date, 1);
    case 'week':
      return addWeeks(date, 1);
    case 'month':
      return addMonths(date, 1);
    case 'year':
      return addYears(date, 1);
    default:
      return addMonths(date, 1);
  }
};

const getPreviousDate = (date, granularity) => {
  switch (granularity) {
    case 'day':
      return addDays(date, -1);
    case 'week':
      return addWeeks(date, -1);
    case 'month':
      return addMonths(date, -1);
    case 'year':
      return addYears(date, -1);
    default:
      return addMonths(date, -1);
  }
};

export const TrackerPage = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [granularity, setGranularity] = useState('month');
  const [isCheckerOpen, setIsCheckerOpen] = useState(false);
  const { trackables } = useTrackables();
  const { trackers, addTracker, updateTracker } = useTrackers();
  const { activities, addActivity, deleteActivity } = useActivities();

  // Debug: log all trackers with their dates
  useMemo(() => {
    if (trackers.length > 0) {
      console.log('[TrackerPage] All trackers:', trackers.map(t => ({
        id: t.id,
        trackableId: t.trackableId,
        occurrenceDate: t.occurrenceDate ? format(new Date(t.occurrenceDate), 'MMM d, yyyy HH:mm') : 'MISSING',
        timestamp: t.occurrenceDate
      })));
    }
  }, [trackers]);

  const { start: rangeStart, end: rangeEnd } = getDateRange(currentDate, granularity);

  const trackablesForThisPeriod = useMemo(() => {
    return trackables.filter(t => t.includeInTracker);
  }, [trackables]);

  // Get all tracker occurrences that fall within the current range
  const trackersInRange = useMemo(() => {
    const filtered = [];
    
    trackers.forEach(tracker => {
      if (!tracker.occurrenceDate) return; // Skip old trackers
      
      // Find the trackable for this tracker to get its frequency
      const trackable = trackables.find(t => t.id === tracker.trackableId);
      if (!trackable) return;
      
      // Check if this tracker spans the current granularity period
      if (doesTrackerSpanGranularity(tracker.occurrenceDate, trackable.frequency, rangeStart, rangeEnd)) {
        filtered.push(tracker);
      }
    });
    
    console.log(`[TrackerPage] Range: ${format(rangeStart, 'MMM d, yyyy')} - ${format(rangeEnd, 'MMM d, yyyy')} (granularity: ${granularity}), Trackers found: ${filtered.length}, Total trackers: ${trackers.length}`);
    return filtered;
  }, [trackers, trackables, granularity, rangeStart, rangeEnd]);

  // Skip creator email fetching for now to avoid infinite loops
  // Email display can be added back later with proper async handling

  const handleMarkComplete = async (trackerId) => {
    const tracker = trackers.find(t => t.id === trackerId);
    if (!tracker) return;

    const trackable = trackables.find(t => t.id === tracker.trackableId);
    if (!trackable) return;

    const newStatus = tracker.status === 'completed' ? 'pending' : 'completed';

    if (newStatus === 'completed') {
      // Create activity when marking as completed
      const newActivity = {
        amount: trackable.trackerAmount || 0,
        type: trackable.type,
        trackableId: trackable.id,
        description: trackable.name,
        date: tracker.occurrenceDate,
      };

      await addActivity(newActivity);
    } else if (tracker.status === 'completed') {
      // Delete associated activity when unmarking
      const associatedActivity = activities.find(
        a => a.trackableId === tracker.trackableId && 
             a.createdAt && 
             Math.abs(a.createdAt - tracker.createdAt) < 86400000 // Within 1 day
      );
      if (associatedActivity) {
        await deleteActivity(associatedActivity.id);
      }
    }

    await updateTracker(trackerId, { status: newStatus });
  };

  const handleSkipTracker = async (trackerId) => {
    const tracker = trackers.find(t => t.id === trackerId);
    if (!tracker) return;

    const newStatus = tracker.status === 'skipped' ? 'pending' : 'skipped';
    await updateTracker(trackerId, { status: newStatus });
  };

  const completedCount = trackersInRange.filter(t => t.status === 'completed').length;
  const totalCount = trackersInRange.length;
  const progressPercentage = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  const previousPeriod = () => {
    setCurrentDate(getPreviousDate(currentDate, granularity));
  };

  const nextPeriod = () => {
    setCurrentDate(getNextDate(currentDate, granularity));
  };

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Tracker</h1>
        <p className="text-sm md:text-base text-gray-400">Track your recurring expenses by period</p>
      </div>

      {/* Granularity Selector and Navigation */}
      <div className="bg-secondary rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center mb-4">
          {/* Granularity Dropdown */}
          <div className="flex-1 sm:flex-none">
            <select
              value={granularity}
              onChange={(e) => {
                setGranularity(e.target.value);
                setCurrentDate(new Date());
              }}
              className="w-full sm:w-auto px-3 py-2 bg-primary border border-gray-600 rounded text-white focus:outline-none focus:border-accent"
            >
              {GRANULARITIES.map(g => (
                <option key={g} value={g} className="bg-primary text-white capitalize">
                  {g.charAt(0).toUpperCase() + g.slice(1)}
                </option>
              ))}
            </select>
          </div>

          {/* Date Picker Input */}
          <input
            type={granularity === 'day' ? 'date' : 'month'}
            value={
              granularity === 'day'
                ? format(currentDate, 'yyyy-MM-dd')
                : format(currentDate, 'yyyy-MM')
            }
            onChange={(e) => {
              setCurrentDate(new Date(e.target.value));
            }}
            className="flex-1 sm:flex-none px-3 py-2 bg-primary border border-gray-600 rounded text-white focus:outline-none focus:border-accent"
          />

          {/* Checker Button */}
          <button
            onClick={() => setIsCheckerOpen(true)}
            className="flex-1 sm:flex-none px-4 py-2 bg-accent hover:bg-accent/80 text-white rounded font-medium transition-colors flex items-center justify-center gap-2"
          >
            <Calendar size={18} />
            Checker
          </button>

          {/* Previous/Next Navigation */}
          <div className="flex gap-2">
            <button
              onClick={previousPeriod}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded"
            >
              <ChevronLeft size={20} />
            </button>
            <button
              onClick={nextPeriod}
              className="text-gray-400 hover:text-white transition-colors p-2 hover:bg-gray-700 rounded"
            >
              <ChevronRight size={20} />
            </button>
          </div>
        </div>

        {/* Period Display */}
        <div className="text-center">
          <h2 className="text-lg md:text-xl font-bold text-white">
            {getDateLabel(currentDate, granularity)}
          </h2>
        </div>
      </div>

      {/* Progress Summary */}
      <div className="bg-secondary rounded-lg p-4 md:p-6 mb-6 md:mb-8">
        <div className="flex justify-between items-center mb-4 gap-2">
          <span className="text-gray-300 font-medium text-sm md:text-base">Period Progress</span>
          <span className="text-white font-bold text-sm md:text-base">
            {completedCount} / {totalCount}
          </span>
        </div>
        <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
          <div
            className="bg-success h-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
        <p className="text-gray-400 text-xs md:text-sm mt-2">{progressPercentage}% Complete</p>
      </div>

      {/* Trackers List */}
      <div className="space-y-2 md:space-y-3">
        {trackersInRange.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-secondary rounded-lg">
            <Calendar className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p>No trackers for this period.</p>
          </div>
        ) : (
          trackersInRange.map(tracker => {
            const trackable = trackables.find(t => t.id === tracker.trackableId);
            if (!trackable) return null;

            const isCompleted = tracker.status === 'completed';
            const isSkipped = tracker.status === 'skipped';

            return (
              <div
                key={tracker.id}
                className={`bg-secondary rounded-lg p-4 flex items-center justify-between hover:bg-opacity-80 transition-colors ${
                  isSkipped ? 'opacity-60' : ''
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="flex gap-2">
                    {/* Status Button */}
                    <button
                      onClick={() => handleMarkComplete(tracker.id)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        isCompleted
                          ? 'bg-success border-success'
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {isCompleted && <span className="text-white font-bold text-sm">✓</span>}
                    </button>

                    {/* Skip Button */}
                    <button
                      onClick={() => handleSkipTracker(tracker.id)}
                      className={`w-6 h-6 rounded border-2 flex items-center justify-center transition-colors ${
                        isSkipped
                          ? 'bg-warning border-warning'
                          : 'border-gray-600 hover:border-gray-400'
                      }`}
                      title="Skip this tracker"
                    >
                      {isSkipped && <span className="text-white font-bold text-sm">✕</span>}
                    </button>
                  </div>

                  <div className="flex-1">
                    <p className={`font-medium ${isCompleted || isSkipped ? 'text-gray-400 line-through' : 'text-white'}`}>
                      {trackable.name}
                    </p>
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

      {/* Migration Notice for Old Trackers */}
      {trackables.some(t => t.includeInTracker && !t.frequency) && (
        <div className="mt-8 p-4 bg-warning bg-opacity-20 border border-warning rounded-lg">
          <p className="text-warning text-sm md:text-base mb-2">
            ℹ️ Some of your trackables need to be migrated to the new frequency-based system.
          </p>
          <p className="text-gray-400 text-xs md:text-sm">
            Edit your trackables to set a frequency and start date to use the new tracker features.
          </p>
        </div>
      )}

      {/* Checker Modal */}
      <CheckerModal
        isOpen={isCheckerOpen}
        onClose={() => setIsCheckerOpen(false)}
        trackers={trackers}
        trackables={trackables}
        onUpdateStatus={updateTracker}
        onCreateActivity={addActivity}
        onDeleteActivity={deleteActivity}
      />
    </div>
  );
};
