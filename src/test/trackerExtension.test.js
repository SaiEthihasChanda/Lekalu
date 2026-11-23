import { describe, it, expect } from 'vitest';
import { addMonths, startOfDay } from 'date-fns';
import { getMissingTrackerOccurrences } from '../utils/trackerOccurrences.js';

const start = startOfDay(addMonths(new Date(), -2)).getTime();
const monthly = { id: 't1', includeInTracker: true, frequency: 'monthly', frequencyInterval: 1, startDate: start, groupId: null };
const trackerAt = (occurrenceDate, extra = {}) => ({ trackableId: 't1', occurrenceDate, groupId: null, ...extra });

describe('getMissingTrackerOccurrences', () => {
  it('returns only occurrences after the latest existing one', () => {
    const latest = addMonths(start, 1).getTime();
    const missing = getMissingTrackerOccurrences([monthly], [trackerAt(start), trackerAt(latest)], null);

    expect(missing.length).toBeGreaterThan(0);
    missing.forEach(({ trackableId, occurrenceDate }) => {
      expect(trackableId).toBe('t1');
      expect(occurrenceDate).toBeGreaterThan(latest);
    });
  });

  it('returns nothing when trackers already reach a year ahead', () => {
    const existing = [];
    for (let d = new Date(start); d < addMonths(new Date(), 13); d = addMonths(d, 1)) {
      existing.push(trackerAt(d.getTime()));
    }

    expect(getMissingTrackerOccurrences([monthly], existing, null)).toEqual([]);
  });

  it('skips trackables with no occurrences yet, untracked ones, and other scopes', () => {
    const untracked = { ...monthly, id: 't2', includeInTracker: false };
    const otherScope = { ...monthly, id: 't3', groupId: 'g1' };
    const existing = [trackerAt(start, { trackableId: 't2' }), trackerAt(start, { trackableId: 't3', groupId: 'g1' })];

    expect(getMissingTrackerOccurrences([monthly, untracked, otherScope], existing, null)).toEqual([]);
  });

  it('extends group trackables when called for that group', () => {
    const groupTrackable = { ...monthly, groupId: 'g1' };
    const missing = getMissingTrackerOccurrences([groupTrackable], [trackerAt(start, { groupId: 'g1' })], 'g1');

    expect(missing.length).toBeGreaterThan(0);
  });
});
