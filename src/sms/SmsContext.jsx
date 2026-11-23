import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { enableSmsDetection, getSmsStatus, isSmsSupported, onSmsEvent } from './bridge.js';
import {
  flushDetections, resetLearning as resetLearningStore, subscribeDetections, subscribeSmsSettings,
} from './store.js';
import { syncSms, waitForSync } from './sync.js';

const SmsContext = createContext({ supported: false, detections: [], pendingCount: 0 });

/**
 * Keeps SMS detections in sync while the user is signed in on the sideload Android build.
 * Sync runs on start, whenever the app returns to the foreground, and when the native receiver
 * reports a new SMS. On the web and the Play build this provider is inert.
 */
export const SmsProvider = ({ children }) => {
  const { user } = useAuth();
  const supported = isSmsSupported();
  const [detections, setDetections] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [settings, setSettings] = useState({ accountMap: {}, merchantMap: {}, keptLinks: {} });
  const [status, setStatus] = useState(() => getSmsStatus());
  const [lastSync, setLastSync] = useState(null);
  const [syncError, setSyncError] = useState(null);
  const [redetecting, setRedetecting] = useState(false);
  const detectionsRef = useRef(detections);
  detectionsRef.current = detections;
  const keptLinksRef = useRef(settings.keptLinks);
  keptLinksRef.current = settings.keptLinks;
  // While a re-detect runs, ordinary syncs must not run with the stale detection list
  const redetectingRef = useRef(false);

  useEffect(() => {
    if (!supported || !user?.uid) {
      setDetections([]);
      setLoaded(false);
      return undefined;
    }
    const unsubscribeDetections = subscribeDetections(user.uid, (items) => {
      setDetections(items);
      setLoaded(true);
    }, (err) => setSyncError(err));
    const unsubscribeMap = subscribeSmsSettings(user.uid, setSettings);
    return () => {
      unsubscribeDetections();
      unsubscribeMap();
    };
  }, [supported, user?.uid]);

  const refreshStatus = useCallback(() => {
    const next = getSmsStatus();
    setStatus(next);
    return next;
  }, []);

  const sync = useCallback(async () => {
    if (!supported || !user?.uid || !loaded || redetectingRef.current) return null;
    refreshStatus();
    try {
      const result = await syncSms(user.uid, detectionsRef.current, keptLinksRef.current);
      setLastSync({ at: Date.now(), ...result });
      setSyncError(null);
      return result;
    } catch (err) {
      console.error('[SMS] sync failed', err);
      setSyncError(err);
      return null;
    } finally {
      refreshStatus();
    }
  }, [supported, user?.uid, loaded, refreshStatus]);

  /**
   * Delete all detections and read SMS again from `scanFrom`. Activities are kept; SMS that were
   * already recorded come back as recorded (see flushDetections), ignored ones come back for review.
   */
  const redetect = useCallback(async (scanFrom) => {
    if (!supported || !user?.uid || redetectingRef.current) return null;
    redetectingRef.current = true;
    setRedetecting(true);
    try {
      await waitForSync();
      const { keptLinks } = await flushDetections(user.uid, keptLinksRef.current);
      enableSmsDetection(user.uid, scanFrom);
      refreshStatus();
      const result = await syncSms(user.uid, [], keptLinks);
      setLastSync({ at: Date.now(), ...result });
      setSyncError(null);
      return result;
    } catch (err) {
      console.error('[SMS] re-detect failed', err);
      setSyncError(err);
      throw err;
    } finally {
      redetectingRef.current = false;
      setRedetecting(false);
      refreshStatus();
    }
  }, [supported, user?.uid, refreshStatus]);

  const resetLearning = useCallback(async () => {
    if (user?.uid) await resetLearningStore(user.uid);
  }, [user?.uid]);

  useEffect(() => {
    if (!loaded) return undefined;
    sync();
    const onVisible = () => {
      if (!document.hidden) sync();
    };
    document.addEventListener('visibilitychange', onVisible);
    const offSms = onSmsEvent((event) => {
      if (event.detail?.type === 'sms-queued') sync();
    });
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      offSms();
    };
  }, [loaded, sync]);

  const value = useMemo(() => ({
    supported,
    status,
    refreshStatus,
    detections,
    loaded,
    accountMap: settings.accountMap,
    merchantMap: settings.merchantMap,
    sync,
    redetect,
    redetecting,
    resetLearning,
    lastSync,
    syncError,
    pendingCount: detections.filter((item) => item.status === 'pending' || item.status === 'unparsed').length,
  }), [supported, status, refreshStatus, detections, loaded, settings, sync, redetect, redetecting, resetLearning, lastSync, syncError]);

  return <SmsContext.Provider value={value}>{children}</SmsContext.Provider>;
};

export const useSms = () => useContext(SmsContext);
