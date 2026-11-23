/**
 * Thin wrapper over the native `LekaluSms` JavaScript interface.
 * The interface exists only in the sideload ("full") Android build; on the Play build and on the
 * web every call reports "unsupported", so SMS features stay hidden.
 */

export const SMS_EVENT = 'lekalu-sms';

const native = () => (typeof window !== 'undefined' ? window.LekaluSms : undefined);

const parse = (raw, fallback) => {
  try {
    return raw == null ? fallback : JSON.parse(raw);
  } catch {
    return fallback;
  }
};

export const isSmsSupported = () => Boolean(native());

/**
 * @returns {{ supported: boolean, smsPermission?: boolean, notificationPermission?: boolean,
 *   ownerUid?: string|null, scanFrom?: number, cursor?: number, sdkInt?: number }}
 */
export const getSmsStatus = () => {
  const bridge = native();
  if (!bridge) return { supported: false };
  return { supported: true, ...parse(bridge.getStatus(), {}) };
};

/** Resolve with the permission result delivered back through a `lekalu-sms` window event. */
const awaitEvent = (type, trigger) => new Promise((resolve) => {
  const handler = (event) => {
    if (event.detail?.type !== type) return;
    window.removeEventListener(SMS_EVENT, handler);
    resolve(event.detail);
  };
  window.addEventListener(SMS_EVENT, handler);
  trigger();
});

export const requestSmsPermission = () => {
  const bridge = native();
  if (!bridge) return Promise.resolve({ granted: false });
  return awaitEvent('sms-permission', () => bridge.requestSmsPermission());
};

export const requestNotificationPermission = () => {
  const bridge = native();
  if (!bridge) return Promise.resolve({ granted: false });
  return awaitEvent('notification-permission', () => bridge.requestNotificationPermission());
};

export const enableSmsDetection = (uid, scanFrom) => native()?.enable(uid, scanFrom);
export const disableSmsDetection = () => native()?.disable();
export const setSmsCursor = (timestamp) => native()?.setCursor(timestamp);
export const openAppSettings = () => native()?.openAppSettings();

/** @returns {{ sender: string, body: string, timestamp: number }[]} */
export const scanSms = (from, to = 0) => parse(native()?.scan(from, to), []);

/** @returns {{ id: string, sender: string, body: string, timestamp: number }[]} */
export const drainSmsQueue = (uid) => parse(native()?.drainQueue(uid), []);
export const ackSmsQueue = (ids) => native()?.ackQueue(JSON.stringify(ids));

export const onSmsEvent = (handler) => {
  window.addEventListener(SMS_EVENT, handler);
  return () => window.removeEventListener(SMS_EVENT, handler);
};
