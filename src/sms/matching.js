/**
 * Suggestions for a detected SMS transaction. Pure functions over already-decrypted data;
 * nothing here writes anything. Every suggestion still needs the user's tap.
 */

const DAY_MS = 24 * 60 * 60 * 1000;
export const DUPLICATE_WINDOW_MS = 2 * DAY_MS;
export const TRACKER_WINDOW_MS = 3 * DAY_MS;
export const TRANSFER_WINDOW_MS = 30 * 60 * 1000;
export const REFUND_LOOKBACK_MS = 90 * DAY_MS;

const sameAmount = (a, b) => Number.isFinite(a) && Number.isFinite(b) && Math.abs(a - b) < 0.005;

const toMillis = (value) => {
  if (typeof value === 'number') return value;
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  if (value && typeof value.seconds === 'number') return value.seconds * 1000;
  return null;
};

const digitsOf = (value) => String(value ?? '').replace(/\D/g, '');

/** Activity type a detection maps to when recorded on its own. */
export const activityTypeFor = (payload) => (payload?.direction === 'credit' ? 'income' : 'expense');

/**
 * Find the Source an SMS belongs to.
 * Learned mappings win; otherwise a Source whose account number ends in the SMS digits.
 * Ambiguous matches return null so the user is asked.
 * @param {Object} payload - Parsed SMS
 * @param {Array} sources - Sources in the target scope
 * @param {Object<string,string>} accountMap - Learned "digits -> sourceId"
 * @returns {string|null}
 */
export const resolveSourceId = (payload, sources, accountMap = {}) => {
  const digits = payload?.account4;
  if (!digits) return null;
  const learned = accountMap[digits];
  if (learned && sources.some((source) => source.id === learned)) return learned;

  const matches = sources.filter((source) => {
    const accountDigits = digitsOf(source.accountNumber);
    return accountDigits.length >= digits.length && accountDigits.endsWith(digits);
  });
  return matches.length === 1 ? matches[0].id : null;
};

const activityMovesSource = (activity, sourceId, direction) => {
  if (!sourceId) return true;
  if (activity.type === 'transfer') {
    return direction === 'debit' ? activity.fromAccountId === sourceId : activity.toAccountId === sourceId;
  }
  const activitySource = activity.accountId || activity.sourceId;
  return !activitySource || activitySource === sourceId;
};

/**
 * Existing activities that are probably this same transaction (entered manually or otherwise).
 * @param {Object} detection - Decrypted detection
 * @param {string|null} sourceId - Resolved source for the detection, if any
 * @param {Array} activities - Activities in the target scope
 * @param {Set<string>} claimedActivityIds - Activities already linked to other detections
 * @returns {Array} Candidates, closest in time first
 */
export const findDuplicateActivities = (detection, sourceId, activities, claimedActivityIds = new Set()) => {
  const { payload, smsTime } = detection;
  if (!payload || !Number.isFinite(payload.amount)) return [];
  const type = activityTypeFor(payload);

  return activities
    .filter((activity) => {
      if (claimedActivityIds.has(activity.id)) return false;
      if (!sameAmount(Number(activity.amount), payload.amount)) return false;
      if (activity.type !== type && activity.type !== 'transfer') return false;
      const date = toMillis(activity.date);
      if (date == null || Math.abs(date - smsTime) > DUPLICATE_WINDOW_MS) return false;
      return activityMovesSource(activity, sourceId, payload.direction);
    })
    .sort((a, b) => Math.abs(toMillis(a.date) - smsTime) - Math.abs(toMillis(b.date) - smsTime));
};

/**
 * A pending tracker occurrence this SMS pays (or receives) for.
 * @returns {{ tracker: Object, trackable: Object } | null}
 */
export const findTrackerMatch = (detection, trackers, trackables) => {
  const { payload, smsTime } = detection;
  if (!payload || payload.isRefund) return null;
  const type = activityTypeFor(payload);
  const trackablesById = new Map(trackables.map((trackable) => [trackable.id, trackable]));

  let best = null;
  trackers.forEach((tracker) => {
    if ((tracker.status || 'pending') !== 'pending') return;
    const trackable = trackablesById.get(tracker.trackableId);
    if (!trackable || trackable.type !== type) return;
    if (!sameAmount(Number(trackable.trackerAmount), payload.amount)) return;
    const distance = Math.abs(tracker.occurrenceDate - smsTime);
    if (!(distance <= TRACKER_WINDOW_MS)) return;
    if (!best || distance < best.distance) best = { tracker, trackable, distance };
  });
  return best ? { tracker: best.tracker, trackable: best.trackable } : null;
};

/**
 * The other half of a transfer between two of the user's own accounts:
 * opposite direction, same amount, close in time (or the same UPI reference).
 * @param {Object} detection
 * @param {Array} detections - All decrypted detections
 * @param {(payload: Object) => string|null} resolveSource
 * @returns {Object|null} The matching detection
 */
export const findTransferPair = (detection, detections, resolveSource) => {
  const { payload, smsTime, fingerprint } = detection;
  if (!payload || payload.isRefund || !Number.isFinite(payload.amount)) return null;
  const ownSource = resolveSource(payload);

  const candidates = detections.filter((other) => {
    if (other.fingerprint === fingerprint || !other.payload) return false;
    if (other.status !== 'pending' && other.status !== 'accepted') return false;
    if (other.payload.direction === payload.direction || other.payload.isRefund) return false;
    if (!sameAmount(other.payload.amount, payload.amount)) return false;
    const sameRef = payload.refNo && other.payload.refNo === payload.refNo;
    if (!sameRef && Math.abs(other.smsTime - smsTime) > TRANSFER_WINDOW_MS) return false;
    // Both sides must be different accounts the user owns (if known)
    const otherSource = resolveSource(other.payload);
    if (ownSource && otherSource && ownSource === otherSource) return false;
    if (payload.account4 && other.payload.account4 && payload.account4 === other.payload.account4) return false;
    // Without a shared reference, require that both accounts are recognised as the user's own
    return sameRef || (Boolean(ownSource) && Boolean(otherSource));
  });

  candidates.sort((a, b) => Math.abs(a.smsTime - smsTime) - Math.abs(b.smsTime - smsTime));
  return candidates[0] || null;
};

const normalizeName = (value) => String(value || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Earlier expenses a refund probably reverses.
 * @returns {Array} Candidates, best first
 */
export const findRefundOriginals = (detection, activities) => {
  const { payload, smsTime } = detection;
  if (!payload?.isRefund) return [];
  const merchant = normalizeName(payload.counterparty);

  return activities
    .filter((activity) => {
      if (activity.type !== 'expense') return false;
      const amount = Number(activity.amount);
      if (!(amount >= payload.amount - 0.005)) return false;
      const date = toMillis(activity.date);
      return date != null && date <= smsTime && smsTime - date <= REFUND_LOOKBACK_MS;
    })
    .map((activity) => {
      const description = normalizeName(activity.description);
      const nameMatch = merchant && description && (description.includes(merchant) || merchant.includes(description));
      return { activity, score: (nameMatch ? 2 : 0) + (sameAmount(Number(activity.amount), payload.amount) ? 1 : 0) };
    })
    .filter(({ score }) => score > 0)
    .sort((a, b) => b.score - a.score || toMillis(b.activity.date) - toMillis(a.activity.date))
    .map(({ activity }) => activity);
};

/**
 * The suggested next step for a pending detection, most specific first.
 * @returns {{ kind: 'transfer'|'convert-transfer'|'tracker'|'merge'|'refund'|'accept', [key: string]: any }}
 */
export const suggestAction = ({ detection, detections, activities, trackers, trackables, resolveSource, claimedActivityIds }) => {
  const sourceId = resolveSource(detection.payload);

  const pair = findTransferPair(detection, detections, resolveSource);
  if (pair) {
    if (pair.status === 'pending') return { kind: 'transfer', pair };
    const pairActivity = activities.find((activity) => activity.id === pair.activityId);
    // Only an activity created from SMS is offered for conversion; manual records are never edited
    if (pairActivity && pairActivity.smsFingerprint && pairActivity.type !== 'transfer') {
      return { kind: 'convert-transfer', pair, activity: pairActivity };
    }
  }

  const trackerMatch = findTrackerMatch(detection, trackers, trackables);
  if (trackerMatch) return { kind: 'tracker', ...trackerMatch };

  const duplicates = findDuplicateActivities(detection, sourceId, activities, claimedActivityIds);
  if (duplicates.length) return { kind: 'merge', candidates: duplicates };

  const originals = findRefundOriginals(detection, activities);
  if (originals.length) return { kind: 'refund', candidates: originals };

  return { kind: 'accept' };
};

/** Legal/payment words that carry no identity ("Pvt Ltd", "@ybl" handles are dropped too). */
const MERCHANT_NOISE = new Set(['pvt', 'ltd', 'private', 'limited', 'llp', 'inc', 'co', 'the', 'and', 'upi', 'payment', 'payments']);

/**
 * Canonical form of a transaction counterparty, used as the learned-name key.
 * "ADYAR Ananda Bhavan Pvt Ltd" -> "adyar ananda bhavan"; "a2b.foods@ybl" -> "a2b foods".
 * @param {string} name
 * @returns {string}
 */
export const normalizeMerchantName = (name) => String(name || '')
  .toLowerCase()
  .replace(/@[a-z][a-z0-9.]*$/, '')
  .split(/[^a-z0-9]+/)
  .filter((token) => token && !MERCHANT_NOISE.has(token) && !/^\d+$/.test(token))
  .join(' ');

const bigrams = (text) => {
  const grams = new Map();
  for (let i = 0; i < text.length - 1; i += 1) {
    const gram = text.slice(i, i + 2);
    grams.set(gram, (grams.get(gram) || 0) + 1);
  }
  return grams;
};

const diceCoefficient = (a, b) => {
  if (a.length < 2 || b.length < 2) return a === b ? 1 : 0;
  const gramsA = bigrams(a);
  const gramsB = bigrams(b);
  let overlap = 0;
  gramsA.forEach((count, gram) => {
    overlap += Math.min(count, gramsB.get(gram) || 0);
  });
  return (2 * overlap) / (a.length - 1 + b.length - 1);
};

/**
 * Similarity (0..1) of two normalized merchant names.
 * One name's words all inside the other's ("adyar ananda bhavan" vs "adyar ananda bhavan medavakkam"),
 * or one squashed into the other ("adyaranandabhavan"), scores high; otherwise a typo-tolerant
 * character-bigram score.
 */
export const merchantSimilarity = (a, b) => {
  if (!a || !b) return 0;
  if (a === b) return 1;
  const tokensA = a.split(' ');
  const tokensB = b.split(' ');
  const [fewer, more] = tokensA.length <= tokensB.length ? [tokensA, tokensB] : [tokensB, tokensA];
  if (fewer.join('').length >= 4 && fewer.every((token) => more.includes(token))) return 0.92;

  const compactA = tokensA.join('');
  const compactB = tokensB.join('');
  const [shorter, longer] = compactA.length <= compactB.length ? [compactA, compactB] : [compactB, compactA];
  if (shorter.length >= 6 && longer.includes(shorter)) return 0.9;
  return diceCoefficient(compactA, compactB);
};

export const MERCHANT_MATCH_THRESHOLD = 0.8;

/**
 * Trackable learned for a counterparty name, if a learned name is similar enough.
 * Only trackables that exist in the scope and fit the activity type are considered;
 * the closest name wins, then the most recently learned.
 * @param {string} name - Counterparty from the SMS
 * @param {Object<string,{ trackableId: string, at: number }>} merchantMap - Learned "normalized name -> trackable"
 * @param {Array} trackables - Trackables in the target scope
 * @param {string} type - 'income' | 'expense'
 * @returns {{ trackableId: string, learnedName: string, score: number } | null}
 */
export const resolveTrackableForName = (name, merchantMap = {}, trackables = [], type = null) => {
  const normalized = normalizeMerchantName(name);
  if (!normalized) return null;
  const usable = new Map(trackables.filter((t) => !type || t.type === type).map((t) => [t.id, t]));

  let best = null;
  Object.entries(merchantMap || {}).forEach(([learnedName, entry]) => {
    if (!entry || !usable.has(entry.trackableId)) return;
    const score = merchantSimilarity(normalized, learnedName);
    if (score < MERCHANT_MATCH_THRESHOLD) return;
    if (!best || score > best.score || (score === best.score && (entry.at || 0) > (best.at || 0))) {
      best = { trackableId: entry.trackableId, learnedName, score, at: entry.at || 0 };
    }
  });
  if (!best) return null;
  const { trackableId, learnedName, score } = best;
  return { trackableId, learnedName, score };
};
