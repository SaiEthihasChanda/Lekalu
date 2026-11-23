/**
 * Firestore persistence for SMS detections.
 *
 * Safety rules enforced here:
 * - Detection document IDs are `${uid}_${fingerprint}`, so the same SMS can only ever exist once.
 * - Detections are created inside a transaction that never overwrites an existing document,
 *   so a rescan cannot reset an accepted/ignored item back to pending.
 * - Activities created from SMS get the ID `sms_${fingerprint}` and are written in the same
 *   transaction that moves the detection out of `pending`; double taps or two devices accepting
 *   at once cannot create two activities.
 * - Existing (manually entered) activities are never modified or deleted. Merging only records
 *   the link on the detection.
 * - "Clear and re-detect" deletes detections only. Links of recorded SMS are saved first
 *   (keptLinks), so re-detected SMS that were already recorded come back as recorded.
 */
import {
  collection,
  deleteField,
  doc,
  getDocs,
  onSnapshot,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, getUserId, initializeAuth } from '../fb/index.js';
import { decryptData, encryptData, generateEncryptionKey } from '../utils/encryption.js';
import { normalizeMerchantName } from './matching.js';

const DETECTIONS = 'smsDetections';
const SETTINGS = 'smsSettings';

const personalKey = (uid) => generateEncryptionKey(uid, null);
const scopeKey = (uid, groupId) => generateEncryptionKey(uid, groupId || null);

export const detectionDocId = (uid, fingerprint) => `${uid}_${fingerprint}`;
export const smsActivityId = (fingerprint) => `sms_${fingerprint}`;

const toMillis = (value) => {
  if (typeof value === 'number') return value;
  if (value && typeof value.toMillis === 'function') return value.toMillis();
  return value ?? null;
};

class DetectionConflictError extends Error {
  constructor(message) {
    super(message);
    this.name = 'DetectionConflictError';
  }
}

/**
 * Live list of the user's detections (all statuses).
 * @returns {() => void} unsubscribe
 */
export const subscribeDetections = (uid, onChange, onError) => {
  const key = personalKey(uid);
  return onSnapshot(
    query(collection(db, DETECTIONS), where('userId', '==', uid)),
    (snapshot) => {
      onChange(snapshot.docs.map((docSnap) => {
        const decrypted = decryptData({ id: docSnap.id, ...docSnap.data() }, key);
        decrypted.createdAt = toMillis(decrypted.createdAt);
        return decrypted;
      }));
    },
    onError,
  );
};

/**
 * Store planned detections. Existing documents are left untouched.
 * @returns {Promise<number>} Number actually created
 */
export const createDetections = async (uid, plans) => {
  const key = personalKey(uid);
  let created = 0;

  for (const plan of plans) {
    const ref = doc(db, DETECTIONS, detectionDocId(uid, plan.fingerprint));
    const encrypted = encryptData({ payload: plan.payload }, key);
    const wasCreated = await runTransaction(db, async (tx) => {
      const snap = await tx.get(ref);
      if (snap.exists()) return false;
      tx.set(ref, {
        ...encrypted,
        userId: uid,
        groupId: null,
        fingerprint: plan.fingerprint,
        bodyHash: plan.bodyHash,
        smsTime: plan.smsTime,
        status: plan.status,
        duplicateOf: plan.duplicateOf || null,
        activityId: plan.link?.activityId || null,
        ...(plan.link?.trackerId ? { trackerId: plan.link.trackerId } : {}),
        ...(plan.link ? { activityGroupId: plan.link.activityGroupId || null } : {}),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return true;
    });
    if (wasCreated) created += 1;
  }

  return created;
};

const assertStatus = (snap, allowed) => {
  if (!snap.exists()) throw new DetectionConflictError('This detection no longer exists.');
  const status = snap.data().status;
  if (!allowed.includes(status)) {
    throw new DetectionConflictError(`Already handled (${status}). Refresh and try again.`);
  }
};

const activityDoc = (uid, groupId, data, date, fingerprint) => ({
  ...encryptData(data, scopeKey(uid, groupId)),
  date,
  userId: uid,
  groupId: groupId || null,
  groupMemberId: groupId ? uid : null,
  source: 'sms',
  smsFingerprint: fingerprint,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});

/**
 * Record a detection as a new activity.
 * @param {Object} params
 * @param {Object} params.detection - Decrypted detection
 * @param {Object} params.activity - Plain activity fields (amount, type, description, accountId, ...)
 * @param {string|null} params.groupId - Target scope
 * @param {number} [params.date] - Activity date; defaults to the SMS time
 * @returns {Promise<string>} Activity ID
 */
export const acceptDetection = async ({ detection, activity, groupId = null, date }) => {
  const uid = getUserId();
  const detectionRef = doc(db, DETECTIONS, detectionDocId(uid, detection.fingerprint));
  const activityId = smsActivityId(detection.fingerprint);
  const activityRef = doc(db, 'activities', activityId);

  await runTransaction(db, async (tx) => {
    // The detection leaving 'pending' in this same transaction is what guarantees one activity per SMS
    assertStatus(await tx.get(detectionRef), ['pending', 'unparsed']);
    tx.set(activityRef, activityDoc(uid, groupId, activity, date ?? detection.smsTime, detection.fingerprint));
    tx.update(detectionRef, {
      status: 'accepted',
      activityId,
      activityGroupId: groupId || null,
      updatedAt: serverTimestamp(),
    });
  });

  return activityId;
};

/**
 * Record a debit SMS and a credit SMS as one transfer between two of the user's sources.
 */
export const acceptTransfer = async ({ debit, credit, fromAccountId, toAccountId, description, groupId = null }) => {
  const uid = getUserId();
  const debitRef = doc(db, DETECTIONS, detectionDocId(uid, debit.fingerprint));
  const creditRef = doc(db, DETECTIONS, detectionDocId(uid, credit.fingerprint));
  const activityId = smsActivityId(debit.fingerprint);
  const activityRef = doc(db, 'activities', activityId);

  await runTransaction(db, async (tx) => {
    const [debitSnap, creditSnap] = await Promise.all([tx.get(debitRef), tx.get(creditRef)]);
    assertStatus(debitSnap, ['pending']);
    assertStatus(creditSnap, ['pending']);
    tx.set(activityRef, activityDoc(uid, groupId, {
      amount: debit.payload.amount,
      type: 'transfer',
      description,
      fromAccountId,
      toAccountId,
    }, debit.smsTime, debit.fingerprint));
    const linked = { status: 'accepted', activityId, activityGroupId: groupId || null, updatedAt: serverTimestamp() };
    tx.update(debitRef, linked);
    tx.update(creditRef, linked);
  });

  return activityId;
};

/**
 * The other half of a transfer arrived after the first half was already recorded from SMS.
 * Turns that SMS-created activity into a transfer. Refuses anything not created from SMS.
 */
export const convertToTransfer = async ({ detection, activity, fromAccountId, toAccountId, groupId = null }) => {
  const uid = getUserId();
  const detectionRef = doc(db, DETECTIONS, detectionDocId(uid, detection.fingerprint));
  const activityRef = doc(db, 'activities', activity.id);

  await runTransaction(db, async (tx) => {
    const [detectionSnap, activitySnap] = await Promise.all([tx.get(detectionRef), tx.get(activityRef)]);
    assertStatus(detectionSnap, ['pending']);
    if (!activitySnap.exists()) throw new DetectionConflictError('The earlier activity was deleted.');
    const existing = activitySnap.data();
    if (existing.source !== 'sms' || !existing.smsFingerprint) {
      throw new DetectionConflictError('Only activities created from SMS can be converted.');
    }
    tx.update(activityRef, {
      ...encryptData({ type: 'transfer' }, scopeKey(uid, groupId)),
      fromAccountId,
      toAccountId,
      accountId: deleteField(),
      updatedAt: serverTimestamp(),
    });
    tx.update(detectionRef, {
      status: 'accepted',
      activityId: activity.id,
      activityGroupId: groupId || null,
      updatedAt: serverTimestamp(),
    });
  });
};

/**
 * Mark a tracker occurrence done and record its activity from the SMS.
 * Same result as ticking the tracker (activity dated on the occurrence), in one transaction.
 */
export const completeTrackerFromDetection = async ({ detection, tracker, activity, groupId = null }) => {
  const uid = getUserId();
  const detectionRef = doc(db, DETECTIONS, detectionDocId(uid, detection.fingerprint));
  const trackerRef = doc(db, 'trackers', tracker.id);
  const activityId = smsActivityId(detection.fingerprint);
  const activityRef = doc(db, 'activities', activityId);

  await runTransaction(db, async (tx) => {
    const [detectionSnap, trackerSnap] = await Promise.all([tx.get(detectionRef), tx.get(trackerRef)]);
    assertStatus(detectionSnap, ['pending']);
    if (!trackerSnap.exists()) throw new DetectionConflictError('The tracker entry no longer exists.');
    if ((trackerSnap.data().status || 'pending') !== 'pending') {
      throw new DetectionConflictError('That tracker entry was already marked. Link the SMS to its activity instead.');
    }
    tx.set(activityRef, activityDoc(uid, groupId, {
      ...activity,
      trackableId: tracker.trackableId,
      trackerId: tracker.id,
    }, tracker.occurrenceDate, detection.fingerprint));
    tx.update(trackerRef, { status: 'completed', completedAt: serverTimestamp(), updatedAt: serverTimestamp() });
    tx.update(detectionRef, {
      status: 'accepted',
      activityId,
      trackerId: tracker.id,
      activityGroupId: groupId || null,
      updatedAt: serverTimestamp(),
    });
  });

  return activityId;
};

/** Link a detection to an existing activity. The activity itself is not changed. */
export const mergeDetection = async ({ detection, activityId }) => {
  const uid = getUserId();
  const detectionRef = doc(db, DETECTIONS, detectionDocId(uid, detection.fingerprint));
  await runTransaction(db, async (tx) => {
    assertStatus(await tx.get(detectionRef), ['pending', 'unparsed']);
    tx.update(detectionRef, { status: 'merged', activityId, updatedAt: serverTimestamp() });
  });
};

export const ignoreDetection = async ({ detection }) => {
  const uid = getUserId();
  const detectionRef = doc(db, DETECTIONS, detectionDocId(uid, detection.fingerprint));
  await runTransaction(db, async (tx) => {
    assertStatus(await tx.get(detectionRef), ['pending', 'unparsed', 'duplicate']);
    tx.update(detectionRef, { status: 'ignored', previousStatus: detection.status, updatedAt: serverTimestamp() });
  });
};

/**
 * Put a detection back in the inbox: an ignored one, or an accepted/merged one whose activity
 * has since been deleted. The caller passes whether that activity still exists (from the
 * server-fetched scope data); restoring while it exists would allow a duplicate.
 */
export const restoreDetection = async ({ detection, linkedActivityExists = false }) => {
  if (linkedActivityExists) throw new DetectionConflictError('Its activity still exists.');
  const uid = getUserId();
  const detectionRef = doc(db, DETECTIONS, detectionDocId(uid, detection.fingerprint));

  await runTransaction(db, async (tx) => {
    const detectionSnap = await tx.get(detectionRef);
    assertStatus(detectionSnap, ['ignored', 'duplicate', 'accepted', 'merged']);
    const { previousStatus } = detectionSnap.data();
    const restoredStatus = previousStatus === 'unparsed' ? 'unparsed' : 'pending';
    tx.update(detectionRef, {
      status: restoredStatus,
      activityId: null,
      trackerId: deleteField(),
      duplicateOf: null,
      previousStatus: deleteField(),
      updatedAt: serverTimestamp(),
    });
  });
};

const EMPTY_SETTINGS = Object.freeze({ accountMap: {}, merchantMap: {}, keptLinks: {} });

/**
 * Per-user SMS settings, kept separate from the user's records:
 * - accountMap: learned account digits -> source
 * - merchantMap: learned normalized counterparty name -> { trackableId, at }
 * - keptLinks: fingerprint -> link of an SMS that was recorded before a re-detect
 */
export const subscribeSmsSettings = (uid, onChange) => {
  const key = personalKey(uid);
  return onSnapshot(doc(db, SETTINGS, uid), (snap) => {
    if (!snap.exists()) return onChange(EMPTY_SETTINGS);
    const decrypted = decryptData(snap.data(), key);
    onChange({
      accountMap: decrypted.accountMap || {},
      merchantMap: decrypted.merchantMap || {},
      keptLinks: decrypted.keptLinks || {},
    });
  }, () => onChange(EMPTY_SETTINGS));
};

const saveSettings = (uid, fields) => setDoc(doc(db, SETTINGS, uid), {
  ...encryptData(fields, personalKey(uid)),
  userId: uid,
  updatedAt: serverTimestamp(),
}, { merge: true });

export const rememberAccountDigits = async (uid, accountMap, digits, sourceId) => {
  await saveSettings(uid, { accountMap: { ...accountMap, [digits]: sourceId } });
};

/**
 * Learn "counterparty name -> trackable" (latest choice wins). No write when nothing changes.
 * @returns {Promise<boolean>} Whether a mapping was written
 */
export const rememberMerchant = async (uid, merchantMap, name, trackableId) => {
  const key = normalizeMerchantName(name);
  if (!key || !trackableId || merchantMap?.[key]?.trackableId === trackableId) return false;
  await saveSettings(uid, { merchantMap: { ...merchantMap, [key]: { trackableId, at: Date.now() } } });
  return true;
};

/** Forget learned account digits and names. Detections, links and activities are untouched. */
export const resetLearning = async (uid) => {
  await saveSettings(uid, { accountMap: {}, merchantMap: {} });
};

/**
 * Delete every detection of the user so SMS can be read again from scratch.
 * Activities are never touched. Links of recorded (accepted/merged) SMS are saved to keptLinks
 * before anything is deleted; items that were put back for review lose their old link.
 * @param {string} uid
 * @param {Object} keptLinks - Links saved by an earlier re-detect
 * @returns {Promise<{ deleted: number, keptLinks: Object }>}
 */
export const flushDetections = async (uid, keptLinks = {}) => {
  const snapshot = await getDocs(query(collection(db, DETECTIONS), where('userId', '==', uid)));
  const links = { ...keptLinks };
  snapshot.docs.forEach((docSnap) => {
    const data = docSnap.data();
    if (!data.fingerprint) return;
    if ((data.status === 'accepted' || data.status === 'merged') && data.activityId) {
      links[data.fingerprint] = {
        status: data.status,
        activityId: data.activityId,
        ...(data.trackerId ? { trackerId: data.trackerId } : {}),
        activityGroupId: data.activityGroupId || null,
      };
    } else {
      delete links[data.fingerprint];
    }
  });

  await saveSettings(uid, { keptLinks: links });

  for (let i = 0; i < snapshot.docs.length; i += 450) {
    const batch = writeBatch(db);
    snapshot.docs.slice(i, i + 450).forEach((docSnap) => batch.delete(docSnap.ref));
    await batch.commit();
  }
  return { deleted: snapshot.docs.length, keptLinks: links };
};

const decodeScopeDocs = (snapshot, key, groupId) => snapshot.docs
  .filter((docSnap) => (groupId ? true : !docSnap.data().groupId))
  .map((docSnap) => {
    try {
      const decrypted = decryptData({ id: docSnap.id, ...docSnap.data() }, key);
      if (decrypted.date != null) decrypted.date = toMillis(decrypted.date);
      if (!decrypted.cardName && decrypted.name) decrypted.cardName = decrypted.name;
      return decrypted;
    } catch {
      return null;
    }
  })
  .filter(Boolean);

/**
 * One-shot read of everything matching needs for a scope (personal or a group).
 * @param {string|null} groupId
 */
export const fetchScopeData = async (groupId = null) => {
  await initializeAuth();
  const uid = getUserId();
  const key = scopeKey(uid, groupId);
  const scoped = (name) => (groupId
    ? query(collection(db, name), where('groupId', '==', groupId))
    : query(collection(db, name), where('userId', '==', uid)));

  const [activities, trackers, trackables, sources] = await Promise.all(
    ['activities', 'trackers', 'trackables', 'bankAccounts'].map(async (name) => decodeScopeDocs(await getDocs(scoped(name)), key, groupId)),
  );
  return { activities, trackers, trackables, sources };
};
