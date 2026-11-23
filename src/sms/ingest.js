import CryptoJS from 'crypto-js';
import { parseSms, normalizeSender } from './parser.js';

/** Same SMS seen by the background receiver and a later inbox scan can differ slightly in timestamp. */
export const SAME_SMS_WINDOW_MS = 15 * 60 * 1000;

/**
 * Stable identifiers for one SMS.
 * - fingerprint: exact identity (sender + timestamp + body); used as the Firestore document ID.
 * - bodyHash: identity without the timestamp; catches the same SMS reported with a different
 *   timestamp (receiver PDU time vs SMS-provider time on some devices).
 * @param {{ sender: string, body: string, timestamp: number }} sms
 */
export const fingerprintSms = ({ sender, body, timestamp }) => {
  const normalizedSender = normalizeSender(sender);
  const normalizedBody = String(body || '').replace(/\s+/g, ' ').trim();
  return {
    fingerprint: CryptoJS.SHA256(`${normalizedSender}|${timestamp}|${normalizedBody}`).toString(),
    bodyHash: CryptoJS.SHA256(`${normalizedSender}|${normalizedBody}`).toString(),
    sender: normalizedSender,
  };
};

const isSameSms = (a, b) => a.fingerprint === b.fingerprint
  || (a.bodyHash === b.bodyHash && Math.abs(a.smsTime - b.smsTime) <= SAME_SMS_WINDOW_MS);

/**
 * Turn raw SMS into new detection records, skipping anything already known.
 * Pure function: never touches storage.
 *
 * @param {{ sender: string, body: string, timestamp: number }[]} messages
 * @param {{ fingerprint: string, bodyHash: string, smsTime: number, status: string, payload?: Object }[]} existing
 *   All detections already stored for this user (any status, including ignored tombstones)
 * @returns {{ fingerprint: string, bodyHash: string, smsTime: number, status: string, duplicateOf?: string, payload: Object }[]}
 */
export const planNewDetections = (messages, existing) => {
  const known = [...existing];
  const planned = [];

  [...messages]
    .filter((sms) => sms && sms.body && Number.isFinite(sms.timestamp))
    .sort((a, b) => a.timestamp - b.timestamp)
    .forEach((sms) => {
      const parsed = parseSms(sms);
      if (parsed.kind === 'ignore') return;

      const ids = fingerprintSms(sms);
      const candidate = { ...ids, smsTime: sms.timestamp };
      if (known.some((item) => isSameSms(item, candidate))) return;

      const payload = { ...parsed, sender: ids.sender };
      delete payload.kind;

      const record = {
        fingerprint: ids.fingerprint,
        bodyHash: ids.bodyHash,
        smsTime: sms.timestamp,
        status: parsed.kind === 'transaction' ? 'pending' : 'unparsed',
        payload,
      };

      // Same reference number + same direction = one transaction notified twice
      // (e.g. by the bank and by a UPI app). Opposite directions are a self-transfer pair instead.
      if (record.status === 'pending' && payload.refNo) {
        const original = known.find((item) => item.payload?.refNo === payload.refNo
          && item.payload?.direction === payload.direction
          && Math.abs((item.payload?.amount ?? 0) - payload.amount) < 0.005);
        if (original) {
          record.status = 'duplicate';
          record.duplicateOf = original.fingerprint;
        }
      }

      known.push(record);
      planned.push(record);
    });

  return planned;
};

/**
 * After "clear and re-detect", SMS that were already recorded come back with their old link
 * instead of as new items, so they can never be recorded twice.
 * @param {Array} plans - Output of planNewDetections
 * @param {Object<string,{ status: 'accepted'|'merged', activityId: string, trackerId?: string, activityGroupId?: string|null }>} keptLinks
 * @returns {Array}
 */
export const applyKeptLinks = (plans, keptLinks = {}) => plans.map((plan) => {
  const link = keptLinks?.[plan.fingerprint];
  if (!link?.activityId) return plan;
  return {
    ...plan,
    status: link.status === 'merged' ? 'merged' : 'accepted',
    duplicateOf: null,
    link,
  };
});
