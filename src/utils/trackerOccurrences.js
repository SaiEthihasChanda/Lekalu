import { addDays, addWeeks, addMonths, addYears, startOfDay, isBefore, format } from 'date-fns';

/**
 * Generate tracker occurrences based on frequency and start date
 * Creates individual tracker occurrences up to 1 year from now
 * 
 * @param {Object} params
 * @param {number} params.startDate - Timestamp of start date
 * @param {'daily' | 'weekly' | 'monthly' | 'yearly'} params.frequency
 * @param {number} [params.frequencyInterval=1] - For custom intervals (e.g., 2 for "every 2 days")
 * @returns {number[]} Array of occurrence timestamps
 */
export const generateTrackerOccurrences = ({ startDate, frequency, frequencyInterval = 1 }) => {
  if (!startDate || !frequency) {
    console.warn('[generateTrackerOccurrences] Missing startDate or frequency:', { startDate, frequency });
    return [];
  }

  const occurrences = [];
  const start = startOfDay(new Date(startDate));
  const now = new Date();
  const endDate = addYears(now, 1); // Generate for 1 year ahead

  console.log('[generateTrackerOccurrences] Generating from', format(start, 'MMM d, yyyy'), 'to', format(endDate, 'MMM d, yyyy'), 'frequency:', frequency, 'interval:', frequencyInterval);

  let currentDate = start;

  // If start date is in the future, only generate from start date onward
  // If start date is in the past, generate from past until 1 year from now
  if (isBefore(start, now)) {
    currentDate = start;
  }

  switch (frequency) {
    case 'daily':
      while (isBefore(currentDate, endDate)) {
        occurrences.push(currentDate.getTime());
        currentDate = addDays(currentDate, frequencyInterval);
      }
      break;

    case 'weekly':
      while (isBefore(currentDate, endDate)) {
        occurrences.push(currentDate.getTime());
        currentDate = addWeeks(currentDate, frequencyInterval);
      }
      break;

    case 'monthly':
      while (isBefore(currentDate, endDate)) {
        occurrences.push(currentDate.getTime());
        currentDate = addMonths(currentDate, frequencyInterval);
      }
      break;

    case 'yearly':
      while (isBefore(currentDate, endDate)) {
        occurrences.push(currentDate.getTime());
        currentDate = addYears(currentDate, frequencyInterval);
      }
      break;

    default:
      console.warn('[generateTrackerOccurrences] Unknown frequency:', frequency);
      return [];
  }

  console.log('[generateTrackerOccurrences] Generated', occurrences.length, 'occurrences');
  return occurrences;
};

const HALF_DAY_MS = 12 * 60 * 60 * 1000;

/**
 * Plan the tracker occurrences needed so tracked trackables keep reaching a year ahead.
 * Only returns occurrences after a trackable's latest existing one; trackables with no
 * occurrences yet, untracked ones, and items outside the given scope are skipped.
 * @param {Array} trackables - Decrypted trackables
 * @param {Array} trackers - Existing trackers
 * @param {string|null} groupId - Current group ID, or null for personal data
 * @returns {{ trackableId: string, occurrenceDate: number }[]}
 */
export const getMissingTrackerOccurrences = (trackables, trackers, groupId = null) => {
  const inScope = (item) => (item.groupId || null) === groupId;

  const latestByTrackable = new Map();
  trackers.forEach((tracker) => {
    if (!inScope(tracker) || typeof tracker.occurrenceDate !== 'number') return;
    const latest = latestByTrackable.get(tracker.trackableId) ?? -Infinity;
    latestByTrackable.set(tracker.trackableId, Math.max(latest, tracker.occurrenceDate));
  });

  const missing = [];
  trackables.forEach((trackable) => {
    if (!inScope(trackable) || !trackable.includeInTracker || !trackable.frequency || !trackable.startDate) return;

    const latest = latestByTrackable.get(trackable.id);
    if (latest == null) return;

    generateTrackerOccurrences({
      startDate: trackable.startDate,
      frequency: trackable.frequency,
      frequencyInterval: trackable.frequencyInterval || 1,
    })
      .filter((occurrenceDate) => occurrenceDate > latest + HALF_DAY_MS)
      .forEach((occurrenceDate) => missing.push({ trackableId: trackable.id, occurrenceDate }));
  });

  return missing;
};

/**
 * Get tracker occurrences within a specific date range
 * 
 * @param {Object} params
 * @param {number[]} params.occurrences - Array of occurrence timestamps
 * @param {number} params.startRange - Start of range (timestamp)
 * @param {number} params.endRange - End of range (timestamp)
 * @returns {number[]} Occurrences within the range
 */
export const getOccurrencesInRange = ({ occurrences, startRange, endRange }) => {
  return occurrences.filter(occurrence => 
    occurrence >= startRange && occurrence <= endRange
  );
};

/**
 * Format frequency with interval for display
 * 
 * @param {'daily' | 'weekly' | 'monthly' | 'yearly'} frequency
 * @param {number} [interval=1]
 * @returns {string} Formatted string (e.g., "Every 2 days", "Weekly")
 */
export const formatFrequency = (frequency, interval = 1) => {
  if (interval === 1) {
    return {
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    }[frequency] || frequency;
  }

  return {
    daily: `Every ${interval} days`,
    weekly: `Every ${interval} weeks`,
    monthly: `Every ${interval} months`,
    yearly: `Every ${interval} years`,
  }[frequency] || frequency;
};
