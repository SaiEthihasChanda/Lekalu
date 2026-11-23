import { useCallback, useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { ArrowLeftRight, Check, Link2, MessageSquare, RefreshCw, RotateCcw, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext.jsx';
import { useSms } from '../sms/SmsContext.jsx';
import {
  disableSmsDetection, enableSmsDetection, openAppSettings, requestNotificationPermission,
  requestSmsPermission, scanSms,
} from '../sms/bridge.js';
import { normalizeSender } from '../sms/parser.js';
import {
  activityTypeFor, normalizeMerchantName, resolveSourceId, resolveTrackableForName, suggestAction,
} from '../sms/matching.js';
import {
  acceptDetection, acceptTransfer, completeTrackerFromDetection, convertToTransfer, fetchScopeData,
  ignoreDetection, mergeDetection, rememberAccountDigits, rememberMerchant, restoreDetection,
} from '../sms/store.js';
import { formatAmount } from '../utils/analytics.js';

const TABS = [
  { id: 'pending', label: 'To review', statuses: ['pending'] },
  { id: 'unparsed', label: 'Unreadable', statuses: ['unparsed'] },
  { id: 'done', label: 'Recorded', statuses: ['accepted', 'merged'] },
  { id: 'ignored', label: 'Ignored', statuses: ['ignored', 'duplicate'] },
];

const formatTime = (ms) => (Number.isFinite(ms) ? format(new Date(ms), 'd MMM yyyy, h:mm a') : '');
const toDateInput = (ms) => format(new Date(ms), 'yyyy-MM-dd');

const describe = (payload) => payload?.counterparty || (payload?.direction === 'credit' ? 'SMS credit' : 'SMS debit');

const inputClass = 'w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-accent';
const primaryButton = 'inline-flex items-center gap-1.5 bg-accent hover:bg-accent/90 text-white text-sm font-medium py-2 px-3 rounded-lg disabled:opacity-50';
const secondaryButton = 'inline-flex items-center gap-1.5 bg-gray-700 hover:bg-gray-600 text-white text-sm font-medium py-2 px-3 rounded-lg disabled:opacity-50';

const SourceSelect = ({ sources, value, onChange, label }) => (
  <label className="block text-xs text-gray-400">
    {label}
    <select className={`${inputClass} mt-1`} value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No source</option>
      {sources.map((source) => <option key={source.id} value={source.id}>{source.cardName}</option>)}
    </select>
  </label>
);

const TrackableSelect = ({ trackables, value, onChange }) => (
  <label className="block text-xs text-gray-400">
    Trackable
    <select aria-label="Trackable" className={`${inputClass} mt-1`} value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">No trackable</option>
      {trackables.map((trackable) => <option key={trackable.id} value={trackable.id}>{trackable.name}</option>)}
    </select>
  </label>
);

/** Clear all detections and read SMS again; separately, forget what was learned. */
const RedetectPanel = () => {
  const { status, redetect, redetecting, resetLearning } = useSms();
  const [open, setOpen] = useState(false);
  const [fromDate, setFromDate] = useState(() => toDateInput(status.scanFrom || Date.now()));
  const [message, setMessage] = useState('');

  const handleRedetect = async () => {
    const scanFrom = new Date(`${fromDate}T00:00:00`).getTime();
    if (!confirm(`Clear all detected SMS and read SMS again from ${format(new Date(scanFrom), 'd MMM yyyy')}?\n\nYour activities are not changed. SMS you already recorded come back as Recorded; ignored SMS come back for review.`)) return;
    setMessage('');
    try {
      const result = await redetect(scanFrom);
      setMessage(result?.skipped ? 'Detections cleared. SMS will be read again once SMS permission is granted.' : `Done: ${result?.created ?? 0} SMS detected.`);
      setOpen(false);
    } catch (err) {
      setMessage(`Could not re-detect: ${err.message}`);
    }
  };

  const handleReset = async () => {
    if (!confirm('Forget which account digits belong to which source, and which names belong to which trackable? Detections and activities are not changed.')) return;
    try {
      await resetLearning();
      setMessage('Learned sources and trackables were forgotten.');
    } catch (err) {
      setMessage(`Could not reset: ${err.message}`);
    }
  };

  return (
    <div className="border-t border-gray-700 pt-3 space-y-2 text-sm">
      {open ? (
        <div className="space-y-2">
          <label className="flex items-center gap-2 flex-wrap text-gray-300">
            Read SMS again from
            <input type="date" className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white" value={fromDate}
              max={toDateInput(Date.now())} onChange={(e) => setFromDate(e.target.value)} />
          </label>
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButton} disabled={redetecting || !fromDate} onClick={handleRedetect}>
              <RotateCcw size={16} /> {redetecting ? 'Re-detecting…' : 'Clear and re-detect'}
            </button>
            <button type="button" className={secondaryButton} disabled={redetecting} onClick={() => setOpen(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <button type="button" className={secondaryButton} onClick={() => setOpen(true)}><RotateCcw size={16} /> Re-detect…</button>
          <button type="button" className={secondaryButton} onClick={handleReset}>Reset learning</button>
        </div>
      )}
      {message && <p className="text-gray-300">{message}</p>}
    </div>
  );
};

/** Setup / status card: enable, permissions, disable. */
const SmsSetupCard = () => {
  const { user } = useAuth();
  const { status, refreshStatus, sync, lastSync, syncError } = useSms();
  const [mode, setMode] = useState('new');
  const [fromDate, setFromDate] = useState(() => toDateInput(Date.now() - 30 * 24 * 60 * 60 * 1000));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');

  const enabledHere = status.ownerUid === user?.uid;
  const enabledForOther = status.ownerUid && status.ownerUid !== user?.uid;

  const handleEnable = async () => {
    setBusy(true);
    setMessage('');
    try {
      const sms = status.smsPermission ? { granted: true } : await requestSmsPermission();
      if (!sms.granted) {
        refreshStatus();
        setMessage('SMS permission was not granted. If Android blocks it, open App settings, tap ⋮ > "Allow restricted settings", then allow SMS.');
        return;
      }
      if (!status.notificationPermission) await requestNotificationPermission();
      const scanFrom = mode === 'new' ? Date.now() : new Date(`${fromDate}T00:00:00`).getTime();
      enableSmsDetection(user.uid, scanFrom);
      refreshStatus();
      await sync();
    } finally {
      setBusy(false);
    }
  };

  const handleDisable = () => {
    if (!confirm('Stop detecting transactions from SMS on this phone? Already recorded activities and detections are kept.')) return;
    disableSmsDetection();
    refreshStatus();
  };

  if (enabledHere) {
    return (
      <div className="bg-secondary border border-gray-700 rounded-lg p-4 space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-white font-medium">SMS detection is on</p>
            <p className="text-xs text-gray-400">
              Reading SMS since {formatTime(status.scanFrom)}
              {lastSync ? ` · last checked ${format(new Date(lastSync.at), 'h:mm a')}` : ''}
            </p>
          </div>
          <div className="flex gap-2">
            <button type="button" className={secondaryButton} disabled={busy} onClick={async () => { setBusy(true); await sync(); setBusy(false); }}>
              <RefreshCw size={16} /> Check now
            </button>
            <button type="button" className={secondaryButton} onClick={handleDisable}>Turn off</button>
          </div>
        </div>
        {!status.smsPermission && (
          <div className="text-sm text-amber-300 space-y-2">
            <p>SMS permission was removed, so new SMS are not being read.</p>
            <div className="flex gap-2">
              <button type="button" className={secondaryButton} onClick={async () => { await requestSmsPermission(); refreshStatus(); sync(); }}>Grant again</button>
              <button type="button" className={secondaryButton} onClick={openAppSettings}>App settings</button>
            </div>
          </div>
        )}
        {status.smsPermission && !status.notificationPermission && (
          <button type="button" className="text-xs text-accent underline" onClick={async () => { await requestNotificationPermission(); refreshStatus(); }}>
            Allow notifications to hear about new transactions while the app is closed
          </button>
        )}
        {syncError && <p className="text-sm text-red-400">Could not save detections: {syncError.message}</p>}
        {status.smsPermission && <RedetectPanel />}
      </div>
    );
  }

  return (
    <div className="bg-secondary border border-gray-700 rounded-lg p-4 space-y-3">
      <p className="text-white font-medium">Detect transactions from SMS</p>
      <p className="text-sm text-gray-400">
        Bank and UPI SMS are read on this phone only. Their text never leaves the device; detected
        transactions wait here for you to confirm, so nothing is recorded twice.
      </p>
      {enabledForOther && (
        <p className="text-sm text-amber-300">SMS detection on this phone is set up for another account. Turning it on here moves it to this account.</p>
      )}
      <div className="space-y-2 text-sm text-gray-300">
        <label className="flex items-center gap-2">
          <input type="radio" name="sms-mode" checked={mode === 'new'} onChange={() => setMode('new')} />
          Only new SMS from now on
        </label>
        <label className="flex items-center gap-2 flex-wrap">
          <input type="radio" name="sms-mode" checked={mode === 'from'} onChange={() => setMode('from')} />
          All SMS from
          <input type="date" className="bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white" value={fromDate}
            max={toDateInput(Date.now())} onChange={(e) => { setFromDate(e.target.value); setMode('from'); }} />
        </label>
      </div>
      <button type="button" className={primaryButton} disabled={busy} onClick={handleEnable}>
        <MessageSquare size={16} /> {busy ? 'Setting up…' : 'Turn on'}
      </button>
      {message && (
        <div className="text-sm text-amber-300 space-y-2">
          <p>{message}</p>
          <button type="button" className={secondaryButton} onClick={openAppSettings}>App settings</button>
        </div>
      )}
    </div>
  );
};

const DetectionCard = ({ detection, context, onDone }) => {
  const { user, group } = useAuth();
  const { payload = {} } = detection;
  const [scope, setScope] = useState('personal');
  const groupId = scope === 'group' && group ? group.id : null;
  const scopeData = (groupId ? context.group : context.personal) || { activities: [], trackers: [], trackables: [], sources: [] };
  const resolve = useCallback((p) => resolveSourceId(p, scopeData.sources, context.accountMap), [scopeData.sources, context.accountMap]);

  const resolvedSource = resolve(payload);
  const [sourceId, setSourceId] = useState(resolvedSource);
  const [remember, setRemember] = useState(true);
  const [description, setDescription] = useState(describe(payload));
  const [mergeTarget, setMergeTarget] = useState(null);
  const [manualAmount, setManualAmount] = useState('');
  const [manualType, setManualType] = useState('expense');
  const activityType = detection.status === 'unparsed' ? manualType : activityTypeFor(payload);
  const typeTrackables = useMemo(() => scopeData.trackables.filter((t) => t.type === activityType), [scopeData.trackables, activityType]);
  const learnedTrackable = useMemo(
    () => resolveTrackableForName(payload.counterparty, context.merchantMap, scopeData.trackables, activityType),
    [payload.counterparty, context.merchantMap, scopeData.trackables, activityType],
  );
  const [trackableId, setTrackableId] = useState(learnedTrackable?.trackableId || null);
  const [rememberName, setRememberName] = useState(true);
  const merchantKey = normalizeMerchantName(payload.counterparty);
  const [smsText, setSmsText] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => setSourceId(resolvedSource), [resolvedSource]);
  useEffect(() => setTrackableId(learnedTrackable?.trackableId || null), [learnedTrackable?.trackableId]);

  const selectedTrackable = typeTrackables.find((t) => t.id === trackableId) || null;
  // Account digits win; the trackable's own source only fills an empty source
  const trackableSourceId = selectedTrackable?.accountId && scopeData.sources.some((source) => source.id === selectedTrackable.accountId)
    ? selectedTrackable.accountId : null;
  const effectiveSourceId = sourceId || trackableSourceId;
  const canLearnName = Boolean(merchantKey && selectedTrackable && context.merchantMap?.[merchantKey]?.trackableId !== selectedTrackable.id);

  const suggestion = useMemo(() => (detection.status === 'pending'
    ? suggestAction({
      detection,
      detections: context.detections,
      activities: scopeData.activities,
      trackers: scopeData.trackers,
      trackables: scopeData.trackables,
      resolveSource: resolve,
      claimedActivityIds: context.claimedActivityIds,
    })
    : null), [detection, context.detections, context.claimedActivityIds, scopeData, resolve]);

  useEffect(() => {
    if (suggestion?.kind === 'merge' || suggestion?.kind === 'refund') setMergeTarget(suggestion.candidates[0]?.id || null);
  }, [suggestion]);

  /**
   * @param {Function} action
   * @param {Object} [options]
   * @param {string|null} [options.learnTrackableId] - Trackable to learn for this SMS's name
   */
  const run = async (action, { learnTrackableId = null } = {}) => {
    setBusy(true);
    setError('');
    try {
      if (payload.account4 && sourceId && sourceId !== resolvedSource && remember) {
        await rememberAccountDigits(user.uid, context.accountMap, payload.account4, sourceId);
      }
      if (learnTrackableId && merchantKey) {
        await rememberMerchant(user.uid, context.merchantMap || {}, payload.counterparty, learnTrackableId);
      }
      await action();
      onDone();
    } catch (err) {
      console.error('[SMS] action failed', err);
      setError(err.message || 'Something went wrong');
    } finally {
      setBusy(false);
    }
  };

  const withTrackable = (activity) => {
    if (effectiveSourceId) activity.accountId = effectiveSourceId;
    if (selectedTrackable) activity.trackableId = selectedTrackable.id;
    return activity;
  };
  const learnOption = () => ({ learnTrackableId: canLearnName && rememberName ? selectedTrackable.id : null });

  const baseActivity = () => withTrackable({ amount: payload.amount, type: activityTypeFor(payload), description: description.trim() });

  const handleAccept = (extra = {}) => run(() => acceptDetection({ detection, activity: { ...baseActivity(), ...extra }, groupId }), learnOption());
  const handleIgnore = () => run(() => ignoreDetection({ detection }));
  const handleMerge = () => {
    // Linking to a record that has a trackable teaches this name -> that trackable
    const target = scopeData.activities.find((activity) => activity.id === mergeTarget);
    run(() => mergeDetection({ detection, activityId: mergeTarget }), { learnTrackableId: target?.trackableId || null });
  };

  const pair = suggestion?.pair;
  const debit = pair && (payload.direction === 'debit' ? detection : pair);
  const credit = pair && (payload.direction === 'debit' ? pair : detection);
  const pairSourceId = pair ? resolve(pair.payload) : null;
  const fromId = payload.direction === 'debit' ? sourceId : pairSourceId;
  const toId = payload.direction === 'debit' ? pairSourceId : sourceId;

  const handleTransfer = () => run(() => acceptTransfer({ debit, credit, fromAccountId: fromId, toAccountId: toId, description: description.trim() || 'Self transfer', groupId }));
  const handleConvert = () => run(() => convertToTransfer({
    detection, activity: suggestion.activity, fromAccountId: fromId, toAccountId: toId, groupId: pair.activityGroupId || null,
  }));
  const handleTracker = () => run(() => completeTrackerFromDetection({
    detection,
    tracker: suggestion.tracker,
    activity: {
      amount: payload.amount,
      type: suggestion.trackable.type,
      description: suggestion.trackable.name,
      ...((suggestion.trackable.accountId || sourceId) ? { accountId: suggestion.trackable.accountId || sourceId } : {}),
    },
    groupId: suggestion.tracker.groupId || null,
  }));

  const handleViewSms = () => {
    // The inbox is queried by receive time, which can trail the SMS timestamp by a few minutes
    const matches = scanSms(detection.smsTime - 60 * 1000, detection.smsTime + 15 * 60 * 1000)
      .filter((sms) => normalizeSender(sms.sender) === payload.sender && Math.abs(sms.timestamp - detection.smsTime) <= 60 * 1000);
    setSmsText(matches[0]?.body || 'The original SMS is not on this phone any more.');
  };

  const handleRecordManual = () => {
    const amount = Number.parseFloat(manualAmount);
    if (!(amount > 0)) {
      setError('Enter the amount');
      return;
    }
    const activity = withTrackable({ amount, type: manualType, description: description.trim() || 'From SMS' });
    run(() => acceptDetection({ detection, activity, groupId }), learnOption());
  };

  // Plain render helper (not a component) so inputs keep focus across re-renders
  const trackableFields = () => (
    <div className="space-y-1">
      <TrackableSelect trackables={typeTrackables} value={trackableId} onChange={setTrackableId} />
      {learnedTrackable && selectedTrackable?.id === learnedTrackable.trackableId && (
        <p className="text-xs text-gray-500">Suggested because you used it for “{learnedTrackable.learnedName}”</p>
      )}
      {!sourceId && trackableSourceId && (
        <p className="text-xs text-gray-500">Source: {sourcesById.get(trackableSourceId)?.cardName} (from {selectedTrackable.name})</p>
      )}
      {canLearnName && (
        <label className="flex items-center gap-2 text-xs text-gray-400">
          <input type="checkbox" checked={rememberName} onChange={(e) => setRememberName(e.target.checked)} />
          Use {selectedTrackable.name} for “{payload.counterparty}” and similar names next time
        </label>
      )}
    </div>
  );

  const linkedActivityExists = detection.activityId
    && [context.personal, context.group].some((data) => data?.activities.some((activity) => activity.id === detection.activityId));
  const sourcesById = new Map(scopeData.sources.map((source) => [source.id, source]));
  const isCredit = payload.direction === 'credit';

  return (
    <div className="bg-secondary border border-gray-700 rounded-lg p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          {Number.isFinite(payload.amount) ? (
            <p className={`text-lg font-semibold ${isCredit ? 'text-green-400' : 'text-red-400'}`}>
              {isCredit ? '+' : '−'}{formatAmount(payload.amount)}
              {payload.isRefund && <span className="ml-2 text-xs text-gray-300 font-normal">refund</span>}
            </p>
          ) : (
            <p className="text-lg font-semibold text-gray-300">Could not read this SMS</p>
          )}
          <p className="text-sm text-gray-300 truncate">{describe(payload)}</p>
          <p className="text-xs text-gray-500">
            {formatTime(detection.smsTime)} · {payload.sender}
            {payload.account4 ? ` · ${payload.accountType === 'card' ? 'card' : 'a/c'} ••${payload.account4}` : ''}
          </p>
        </div>
      </div>

      {detection.status === 'pending' && (
        <>
          {group && (
            <div className="flex gap-2 text-xs">
              {['personal', 'group'].map((option) => (
                <button key={option} type="button" onClick={() => setScope(option)}
                  className={`px-3 py-1 rounded-full border ${scope === option ? 'border-accent text-white' : 'border-gray-600 text-gray-400'}`}>
                  {option === 'personal' ? 'Personal' : group.name || 'Group'}
                </button>
              ))}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-2">
            <SourceSelect sources={scopeData.sources} value={sourceId} onChange={setSourceId} label="Source" />
            <label className="block text-xs text-gray-400">
              Description
              <input className={`${inputClass} mt-1`} value={description} onChange={(e) => setDescription(e.target.value)} />
            </label>
          </div>
          {payload.account4 && sourceId && sourceId !== resolvedSource && (
            <label className="flex items-center gap-2 text-xs text-gray-400">
              <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
              Always use {sourcesById.get(sourceId)?.cardName} for ••{payload.account4}
            </label>
          )}
          {trackableFields()}

          {suggestion?.kind === 'transfer' && (
            <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 space-y-2 text-sm">
              <p className="text-white flex items-center gap-2"><ArrowLeftRight size={16} /> Looks like a transfer between your own accounts</p>
              <p className="text-gray-300">
                {sourcesById.get(fromId)?.cardName || 'Unknown source'} → {sourcesById.get(toId)?.cardName || 'Unknown source'}
              </p>
              <button type="button" className={primaryButton} disabled={busy || !fromId || !toId || fromId === toId} onClick={handleTransfer}>
                Record one transfer
              </button>
              {(!fromId || !toId) && <p className="text-xs text-gray-400">Pick the source on both SMS first.</p>}
            </div>
          )}

          {suggestion?.kind === 'convert-transfer' && (
            <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 space-y-2 text-sm">
              <p className="text-white flex items-center gap-2"><ArrowLeftRight size={16} /> Other side of “{suggestion.activity.description}”</p>
              <p className="text-gray-300">That activity was recorded from SMS. Turn it into one transfer instead of adding a second entry.</p>
              <button type="button" className={primaryButton} disabled={busy || !fromId || !toId || fromId === toId} onClick={handleConvert}>
                Make it a transfer
              </button>
            </div>
          )}

          {suggestion?.kind === 'tracker' && (
            <div className="rounded-lg border border-accent/40 bg-accent/10 p-3 space-y-2 text-sm">
              <p className="text-white flex items-center gap-2"><Check size={16} /> Matches tracker “{suggestion.trackable.name}”</p>
              <p className="text-gray-300">Due {format(new Date(suggestion.tracker.occurrenceDate), 'd MMM yyyy')}</p>
              <button type="button" className={primaryButton} disabled={busy} onClick={handleTracker}>Mark tracker done</button>
            </div>
          )}

          {(suggestion?.kind === 'merge' || suggestion?.kind === 'refund') && (
            <div className="rounded-lg border border-amber-400/40 bg-amber-400/10 p-3 space-y-2 text-sm">
              <p className="text-white flex items-center gap-2">
                <Link2 size={16} />
                {suggestion.kind === 'merge' ? 'You may have recorded this already' : 'Refund of an earlier expense?'}
              </p>
              {suggestion.candidates.slice(0, 3).map((activity) => (
                <label key={activity.id} className="flex items-center gap-2 text-gray-300">
                  <input type="radio" name={`target-${detection.id}`} checked={mergeTarget === activity.id} onChange={() => setMergeTarget(activity.id)} />
                  {formatAmount(activity.amount)} · {activity.description || activity.type} · {formatTime(activity.date)}
                </label>
              ))}
              {suggestion.kind === 'merge' ? (
                <button type="button" className={primaryButton} disabled={busy || !mergeTarget} onClick={handleMerge}>
                  Same transaction — link, don’t add
                </button>
              ) : (
                <button type="button" className={primaryButton} disabled={busy || !mergeTarget} onClick={() => handleAccept({ refundOfActivityId: mergeTarget })}>
                  Record as refund
                </button>
              )}
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <button type="button" className={suggestion?.kind === 'accept' ? primaryButton : secondaryButton} disabled={busy} onClick={() => handleAccept()}>
              <Check size={16} /> {suggestion?.kind === 'accept' ? 'Add activity' : 'Add as new activity'}
            </button>
            <button type="button" className={secondaryButton} disabled={busy} onClick={handleIgnore}><X size={16} /> Ignore</button>
          </div>
        </>
      )}

      {detection.status === 'unparsed' && (
        <div className="space-y-2">
          {smsText ? <p className="text-sm text-gray-300 whitespace-pre-wrap bg-gray-800 rounded p-2">{smsText}</p> : (
            <button type="button" className="text-xs text-accent underline" onClick={handleViewSms}>Show the SMS</button>
          )}
          <div className="grid gap-2 sm:grid-cols-3">
            <input className={inputClass} type="number" step="0.01" placeholder="Amount" value={manualAmount} onChange={(e) => setManualAmount(e.target.value)} />
            <select className={inputClass} value={manualType} onChange={(e) => setManualType(e.target.value)}>
              <option value="expense">Expense</option>
              <option value="income">Income</option>
            </select>
            <SourceSelect sources={scopeData.sources} value={sourceId} onChange={setSourceId} label="" />
          </div>
          {trackableFields()}
          <div className="flex flex-wrap gap-2">
            <button type="button" className={primaryButton} disabled={busy} onClick={handleRecordManual}><Check size={16} /> Record</button>
            <button type="button" className={secondaryButton} disabled={busy} onClick={handleIgnore}><X size={16} /> Ignore</button>
          </div>
        </div>
      )}

      {(detection.status === 'accepted' || detection.status === 'merged') && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-400">
            {detection.status === 'merged' ? 'Linked to an existing activity' : detection.trackerId ? 'Recorded via tracker' : 'Recorded'}
            {!linkedActivityExists && ' · activity deleted'}
          </span>
          {!linkedActivityExists && (
            <button type="button" className={secondaryButton} disabled={busy} onClick={() => run(() => restoreDetection({ detection, linkedActivityExists }))}>
              <RotateCcw size={16} /> Review again
            </button>
          )}
        </div>
      )}

      {(detection.status === 'ignored' || detection.status === 'duplicate') && (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-gray-400">{detection.status === 'duplicate' ? 'Same transaction as another SMS' : 'Ignored'}</span>
          <button type="button" className={secondaryButton} disabled={busy} onClick={() => run(() => restoreDetection({ detection }))}>
            <RotateCcw size={16} /> Restore
          </button>
        </div>
      )}

      {error && <p className="text-sm text-red-400">{error}</p>}
    </div>
  );
};

export const SmsInboxPage = () => {
  const { group } = useAuth();
  const { supported, status, detections, loaded, accountMap, merchantMap } = useSms();
  const { user } = useAuth();
  const [tab, setTab] = useState('pending');
  const [scopes, setScopes] = useState({ personal: null, group: null });
  const [loadError, setLoadError] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  useEffect(() => {
    if (!supported) return undefined;
    let cancelled = false;
    Promise.all([fetchScopeData(null), group ? fetchScopeData(group.id) : Promise.resolve(null)])
      .then(([personal, groupData]) => {
        if (!cancelled) {
          setScopes({ personal, group: groupData });
          setLoadError(null);
        }
      })
      .catch((err) => !cancelled && setLoadError(err));
    return () => {
      cancelled = true;
    };
  }, [supported, group, detections, reloadKey]);

  const context = useMemo(() => ({
    personal: scopes.personal,
    group: scopes.group,
    detections,
    accountMap,
    merchantMap: merchantMap || {},
    claimedActivityIds: new Set(detections.map((item) => item.activityId).filter(Boolean)),
  }), [scopes, detections, accountMap, merchantMap]);

  if (!supported) {
    return (
      <div className="p-4 md:p-8 text-gray-300">
        SMS detection is available in the Lekalu Android app (sideload build).
      </div>
    );
  }

  const current = TABS.find((item) => item.id === tab);
  const visible = detections
    .filter((item) => current.statuses.includes(item.status))
    .sort((a, b) => b.smsTime - a.smsTime);
  const counts = Object.fromEntries(TABS.map((item) => [item.id, detections.filter((d) => item.statuses.includes(d.status)).length]));
  const enabledHere = status.ownerUid === user?.uid;

  return (
    <div className="p-4 md:p-8 space-y-4 max-w-3xl">
      <h1 className="text-2xl font-bold text-white">Detected from SMS</h1>
      <SmsSetupCard />

      {(enabledHere || detections.length > 0) && (
        <>
          <div className="flex gap-2 overflow-x-auto">
            {TABS.map((item) => (
              <button key={item.id} type="button" onClick={() => setTab(item.id)}
                className={`whitespace-nowrap px-3 py-1.5 rounded-lg text-sm ${tab === item.id ? 'bg-accent text-white' : 'bg-gray-700 text-gray-300'}`}>
                {item.label}{counts[item.id] ? ` (${counts[item.id]})` : ''}
              </button>
            ))}
          </div>
          {loadError && <p className="text-sm text-red-400">Could not load your records: {loadError.message}</p>}
          {!loaded || !scopes.personal ? (
            <p className="text-gray-400 text-sm">Loading…</p>
          ) : visible.length === 0 ? (
            <p className="text-gray-400 text-sm">Nothing here.</p>
          ) : (
            <div className="space-y-3">
              {visible.map((detection) => (
                <DetectionCard key={detection.id} detection={detection} context={context} onDone={() => setReloadKey((n) => n + 1)} />
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
};
