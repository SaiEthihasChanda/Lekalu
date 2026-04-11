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
