import {
  ackSmsQueue, drainSmsQueue, getSmsStatus, scanSms, setSmsCursor,
} from './bridge.js';
import { applyKeptLinks, planNewDetections } from './ingest.js';
import { createDetections } from './store.js';

/** Each scan re-reads this much before the last cursor; deterministic IDs make the overlap harmless. */
export const SCAN_OVERLAP_MS = 2 * 24 * 60 * 60 * 1000;

let running = null;

/**
 * Pull new SMS from the phone (background queue + SMS inbox since the last scan) into detections.
 * Safe to call often and from several places: concurrent calls share one run.
 * @param {string} uid - Logged-in user
 * @param {Array} existingDetections - Current decrypted detections (from the live listener)
 * @param {Object} [keptLinks] - Links of SMS recorded before a re-detect (see flushDetections)
 * @returns {Promise<{ created: number, skipped?: string }>}
 */
export const syncSms = (uid, existingDetections, keptLinks = {}) => {
  if (running) return running;
  running = (async () => {
    const status = getSmsStatus();
    if (!status.supported) return { created: 0, skipped: 'unsupported' };
    if (!status.ownerUid) return { created: 0, skipped: 'disabled' };
    if (status.ownerUid !== uid) return { created: 0, skipped: 'other-account' };
    if (!status.smsPermission) return { created: 0, skipped: 'no-permission' };

    const startedAt = Date.now();
    const from = status.cursor
      ? Math.max(status.scanFrom || 0, status.cursor - SCAN_OVERLAP_MS)
      : (status.scanFrom || startedAt);

    const queued = drainSmsQueue(uid);
    const scanned = scanSms(from, 0);
    const plans = applyKeptLinks(planNewDetections([...queued, ...scanned], existingDetections), keptLinks);
    const created = await createDetections(uid, plans);

    // Only advance once everything is stored; a failure above leaves the queue and cursor as-is
    if (queued.length) ackSmsQueue(queued.map((item) => item.id));
    setSmsCursor(startedAt);
    return { created };
  })().finally(() => {
    running = null;
  });
  return running;
};

/** Resolves once any sync in progress has finished (never starts one). */
export const waitForSync = () => (running ? running.catch(() => null) : Promise.resolve(null));
