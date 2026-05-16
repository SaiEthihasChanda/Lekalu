import { useState, useMemo } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  X,
  Check,
  AlertCircle,
} from 'lucide-react';
import {
  startOfMonth,
  endOfMonth,
  eachDayOfInterval,
  format,
  isSameDay,
  isBefore,
  isAfter,
  isSameMonth,
  isWithinInterval,
  addMonths,
  addDays,
  startOfDay,
  endOfDay,
} from 'date-fns';
import { Modal } from './Modal.jsx';

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

/**
 * CheckerModal - Calendar-based tracker status management
 * Shows a calendar with marked tracker dates and allows bulk status updates
 * 
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Close modal callback
 * @param {Array} trackers - All tracker items
 * @param {Array} trackables - All trackables
 * @param {Function} onUpdateStatus - Callback to update tracker status
 * @param {Function} onCreateActivity - Callback to create activity for completed tracker
 * @param {Function} onDeleteActivity - Callback to delete activity
 */
export const CheckerModal = ({
  isOpen,
  onClose,
  trackers,
  trackables,
  onUpdateStatus,
  onCreateActivity,
  onDeleteActivity,
}) => {
  const [calendarDate, setCalendarDate] = useState(new Date());
  const [selectionStart, setSelectionStart] = useState(null);
  const [selectionEnd, setSelectionEnd] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  const monthStart = startOfMonth(calendarDate);
  const monthEnd = endOfMonth(calendarDate);
  const firstDayOfWeek = monthStart.getDay(); // 0 = Sunday
  
  // Create array with empty cells for days before month starts
  const calendarDays = [];
  for (let i = 0; i < firstDayOfWeek; i++) {
    calendarDays.push(null); // Placeholder for days from previous month
  }
  
  // Add all days of the current month
  const daysInMonth = eachDayOfInterval({ start: monthStart, end: monthEnd });
  calendarDays.push(...daysInMonth);

  // Get trackers marked for this month
  const trackersInMonth = useMemo(() => {
    return trackers.filter(tracker => {
      if (!tracker.occurrenceDate) return false;
      const trackerDate = new Date(tracker.occurrenceDate);
      return isSameMonth(trackerDate, calendarDate);
    });
  }, [trackers, calendarDate]);

  // Map trackers by date for quick lookup (show all dates covered by frequency)
  const trackersByDate = useMemo(() => {
    const map = new Map();
    trackers.forEach(tracker => {
      if (!tracker.occurrenceDate) return;
      
      const trackable = trackables.find(t => t.id === tracker.trackableId);
      if (!trackable) return;
      
      const occurrenceDate = new Date(tracker.occurrenceDate);
      // Default to 'monthly' for old trackers without frequency
      const frequency = trackable.frequency || 'monthly';
      
      // Generate all dates this tracker should appear on based on frequency
      let datesToMark = [];
      
      if (frequency === 'daily') {
        // Daily: only the occurrence date (whether it's every day, every 2 days, etc.)
        datesToMark = [occurrenceDate];
      } else if (frequency === 'weekly') {
        // Weekly: all 7 days of that week (Sunday-Saturday)
        const weekStart = getWeekStart(occurrenceDate);
        const weekEnd = getWeekEnd(occurrenceDate);
        datesToMark = eachDayOfInterval({ start: weekStart, end: weekEnd });
      } else if (frequency === 'monthly') {
        // Monthly: all days of that month
        const monthStart = startOfMonth(occurrenceDate);
        const monthEnd = endOfMonth(occurrenceDate);
        datesToMark = eachDayOfInterval({ start: monthStart, end: monthEnd });
      } else if (frequency === 'yearly') {
        // Yearly: all days in the year (but just show in current month for display)
        const monthStart = startOfMonth(occurrenceDate);
        const monthEnd = endOfMonth(occurrenceDate);
        datesToMark = eachDayOfInterval({ start: monthStart, end: monthEnd });
      }
      
      // Add entries for all dates this tracker covers
      datesToMark.forEach(date => {
        if (isSameMonth(date, calendarDate)) {
          const dateKey = format(date, 'yyyy-MM-dd');
          if (!map.has(dateKey)) {
            map.set(dateKey, []);
          }
          map.get(dateKey).push({
            ...tracker,
            frequency: frequency,
            frequencyInterval: trackable.frequencyInterval,
            isOccurrenceDate: isSameDay(date, occurrenceDate)
          });
        }
      });
    });
    
    if (trackers.length > 0) {
      console.log('[CheckerModal] trackersByDate generated:', {
        totalTrackers: trackers.length,
        datesCovered: map.size,
        allDates: Array.from(map.entries())
          .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
          .map(([date, trackers]) => ({
            date,
            count: trackers.length,
            trackers: trackers.map(t => ({
              frequency: t.frequency,
              interval: t.frequencyInterval || 1,
              isOccurrence: t.isOccurrenceDate
            }))
          }))
      });
    }
    
    return map;
  }, [trackers, trackables, calendarDate]);

  // Get trackers in selected date range, or all trackers this month by default
  const selectedRangeTrackers = useMemo(() => {
    if (!selectionStart && !selectionEnd) {
      // Default: show all trackers for the current month
      return trackersInMonth;
    }
    
    if (!selectionStart || !selectionEnd) return [];
    
    const adjustedEnd = isAfter(selectionEnd, selectionStart) ? selectionEnd : selectionStart;
    const adjustedStart = isBefore(selectionStart, selectionEnd) ? selectionStart : selectionEnd;

    return trackers.filter(tracker => {
      if (!tracker.occurrenceDate) return false;
      const trackerDate = new Date(tracker.occurrenceDate);
      return (
        (isSameDay(trackerDate, adjustedStart) || isAfter(trackerDate, adjustedStart)) &&
        (isSameDay(trackerDate, adjustedEnd) || isBefore(trackerDate, adjustedEnd))
      );
    });
  }, [trackers, trackersInMonth, selectionStart, selectionEnd]);

  const handleDayClick = (day) => {
    if (!selectionStart) {
      setSelectionStart(day);
      setSelectionEnd(null);
    } else if (!selectionEnd) {
      setSelectionEnd(day);
    } else {
      setSelectionStart(day);
      setSelectionEnd(null);
    }
  };

  const updateTrackerStatus = async (trackerId, newStatus) => {
    // Call the update callback for individual tracker
    await onUpdateStatus(trackerId, { status: newStatus });
  };

  const previousMonth = () => {
    setCalendarDate(addMonths(calendarDate, -1));
  };

  const nextMonth = () => {
    setCalendarDate(addMonths(calendarDate, 1));
  };

  const clearSelection = () => {
    setSelectionStart(null);
    setSelectionEnd(null);
    setShowDetails(false);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tracker Checker">
      <div className="space-y-4 relative">
        {/* Calendar Navigation */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <button
            onClick={previousMonth}
            className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h3 className="text-lg font-bold text-white text-center flex-1">
            {format(calendarDate, 'MMMM yyyy')}
          </h3>
          <button
            onClick={nextMonth}
            className="p-2 hover:bg-gray-700 rounded text-gray-400 hover:text-white transition-colors"
          >
            <ChevronRight size={20} />
          </button>
        </div>

        {/* Calendar Grid */}
        <div className="bg-primary rounded-lg p-4 mb-4 relative">
          {/* Day headers */}
          <div className="grid grid-cols-7 gap-1 mb-3">
            {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
              <div key={day} className="text-center text-xs font-bold text-gray-400 py-2">
                {day}
              </div>
            ))}
          </div>

          {/* Calendar days */}
          <div className="grid grid-cols-7 gap-1">
            {calendarDays.map((day, idx) => {
              // Skip empty cells from previous month
              if (!day) {
                return (
                  <div
                    key={`empty-${idx}`}
                    className="aspect-square rounded text-sm font-bold bg-transparent"
                  />
                );
              }
              
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayTrackers = trackersByDate.get(dateKey) || [];
              const isSelected =
                (selectionStart && isSameDay(day, selectionStart)) ||
                (selectionEnd && isSameDay(day, selectionEnd)) ||
                (selectionStart &&
                  selectionEnd &&
                  isBefore(day, isAfter(selectionEnd, selectionStart) ? selectionEnd : selectionStart) &&
                  isAfter(day, isBefore(selectionStart, selectionEnd) ? selectionStart : selectionEnd));

              // Check if this day has daily trackers or is in a weekly/monthly range
              const hasDailyTracker = dayTrackers.some(t => t.frequency === 'daily' && t.isOccurrenceDate);
              const hasWeeklyOrMonthly = dayTrackers.some(t => (t.frequency === 'weekly' || t.frequency === 'monthly'));

              return (
                <button
                  key={idx}
                  onClick={() => handleDayClick(day)}
                  className={`aspect-square rounded text-sm font-bold transition-all relative border-2 ${
                    isSelected
                      ? 'bg-accent text-white border-accent shadow-lg shadow-accent/50'
                      : hasWeeklyOrMonthly && !isSelected
                      ? 'bg-accent/90 text-white border-accent hover:bg-accent shadow-md shadow-black/20'
                      : hasDailyTracker && !isSelected
                      ? 'bg-accent text-white border-accent hover:bg-accent/90 shadow-md shadow-black/20'
                      : 'bg-gray-800 text-gray-500 hover:bg-gray-700 border-gray-700'
                  }`}
                >
                  <div>{day.getDate()}</div>
                  {hasDailyTracker && (
                    <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                      <span className="text-sm font-bold text-yellow-300">●</span>
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Details Overlay - On top of calendar */}
          {showDetails && selectedRangeTrackers.length > 0 && (
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm rounded-lg flex items-center justify-center p-4 z-10">
              <div className="bg-secondary rounded-lg p-4 max-w-sm w-full space-y-3 max-h-96 overflow-y-auto">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="font-bold text-white">Trackers ({selectedRangeTrackers.length})</h4>
                  <button
                    onClick={() => setShowDetails(false)}
                    className="text-gray-400 hover:text-white transition-colors"
                  >
                    <X size={16} />
                  </button>
                </div>

                {/* Tracker List with Individual Controls */}
                <div className="space-y-3">
                  {selectedRangeTrackers.map(tracker => {
                    const trackable = trackables.find(t => t.id === tracker.trackableId);
                    const isCompleted = tracker.status === 'completed';
                    const isSkipped = tracker.status === 'skipped';
                    
                    return (
                      <div key={tracker.id} className="bg-primary rounded p-3 space-y-2">
                        <div>
                          <p className="text-white font-medium text-sm">{trackable?.name}</p>
                          <p className="text-xs text-gray-400">{format(new Date(tracker.occurrenceDate), 'MMM d, yyyy')}</p>
                        </div>
                        
                        {/* Individual Status Buttons */}
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTrackerStatus(tracker.id, 'completed')}
                            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                              isCompleted
                                ? 'bg-success text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <Check size={12} />
                            Done
                          </button>
                          <button
                            onClick={() => updateTrackerStatus(tracker.id, 'pending')}
                            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors ${
                              tracker.status === 'pending'
                                ? 'bg-gray-500 text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            Pending
                          </button>
                          <button
                            onClick={() => updateTrackerStatus(tracker.id, 'skipped')}
                            className={`flex-1 py-1.5 rounded text-xs font-medium transition-colors flex items-center justify-center gap-1 ${
                              isSkipped
                                ? 'bg-warning text-white'
                                : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                            }`}
                          >
                            <AlertCircle size={12} />
                            Skip
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Selection Info */}
        {(selectionStart || selectedRangeTrackers.length > 0) && (
          <div className="bg-secondary rounded-lg p-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm text-gray-300">
                {selectionStart ? (
                  selectionEnd
                    ? `Selected: ${format(
                        isBefore(selectionStart, selectionEnd) ? selectionStart : selectionEnd,
                        'MMM d'
                      )} - ${format(
                        isAfter(selectionStart, selectionEnd) ? selectionStart : selectionEnd,
                        'MMM d'
                      )}`
                    : `Start: ${format(selectionStart, 'MMM d')}`
                ) : (
                  `Showing all trackers for ${format(calendarDate, 'MMMM')}`
                )}
              </p>
              {selectionStart && (
                <button
                  onClick={clearSelection}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <X size={16} />
                </button>
              )}
            </div>

            {(selectionEnd || !selectionStart) && selectedRangeTrackers.length > 0 && (
              <button
                onClick={() => setShowDetails(true)}
                className="w-full py-2 bg-accent hover:bg-accent/80 text-white rounded transition-colors text-sm font-medium"
              >
                {selectionStart ? 'Check' : 'View All'} ({selectedRangeTrackers.length})
              </button>
            )}
          </div>
        )}

        {/* Empty State */}
        {selectedRangeTrackers.length === 0 && !selectionStart && (
          <p className="text-center text-gray-400 text-sm py-4">
            No trackers for this month. Click dates to find trackers in a specific range.
          </p>
        )}
        {selectedRangeTrackers.length === 0 && selectionStart && (
          <p className="text-center text-gray-400 text-sm py-4">
            No trackers in the selected range.
          </p>
        )}
      </div>
    </Modal>
  );
};
