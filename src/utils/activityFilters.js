import { resolveActivityAccountId } from './analytics.js';

const TRANSFER_TYPES = new Set(['transfer', 'self transfer', 'self-transfer', 'self_transfer']);
export const isTransferType = (type) => typeof type === 'string' && TRANSFER_TYPES.has(type.trim().toLowerCase());

export const ALL = 'all';
export const NO_TRACKABLE = 'none';
export const DEFAULT_ACTIVITY_FILTERS = Object.freeze({ sourceId: ALL, type: ALL, trackableId: ALL });

/**
 * Filter activities by source, type and trackable. 'all' disables a filter.
 * - Source: an income/expense on that source (directly or via its trackable's source), or a
 *   transfer into or out of it.
 * - Type: 'income' | 'expense' | 'transfer' (all transfer spellings count as transfer).
 * - Trackable: a trackable ID, or 'none' for activities without one.
 * @param {Array} activities
 * @param {{ sourceId?: string, type?: string, trackableId?: string }} filters
 * @param {Map} [trackablesMap] - trackableId -> trackable
 * @returns {Array}
 */
export const filterActivities = (activities, filters = DEFAULT_ACTIVITY_FILTERS, trackablesMap = null) => {
  const { sourceId = ALL, type = ALL, trackableId = ALL } = filters || {};

  return activities.filter((activity) => {
    if (!activity) return false;
    const transfer = isTransferType(activity.type);

    if (type !== ALL) {
      if (type === 'transfer' ? !transfer : activity.type !== type) return false;
    }

    if (sourceId !== ALL) {
      const matchesSource = transfer
        ? [activity.fromAccountId, activity.toAccountId, activity.fromSourceId, activity.toSourceId].includes(sourceId)
        : resolveActivityAccountId(activity, trackablesMap) === sourceId;
      if (!matchesSource) return false;
    }

    if (trackableId !== ALL) {
      if (trackableId === NO_TRACKABLE ? Boolean(activity.trackableId) : activity.trackableId !== trackableId) return false;
    }

    return true;
  });
};

/** Filters pointing at a source or trackable that no longer exists fall back to 'all'. */
export const sanitizeActivityFilters = (filters, accounts = [], trackables = []) => {
  const next = { ...DEFAULT_ACTIVITY_FILTERS, ...(filters || {}) };
  if (next.sourceId !== ALL && !accounts.some((account) => account.id === next.sourceId)) next.sourceId = ALL;
  if (next.trackableId !== ALL && next.trackableId !== NO_TRACKABLE
    && !trackables.some((trackable) => trackable.id === next.trackableId)) next.trackableId = ALL;
  if (![ALL, 'income', 'expense', 'transfer'].includes(next.type)) next.type = ALL;
  return next;
};
