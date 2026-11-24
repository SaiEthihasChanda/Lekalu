import { describe, it, expect } from 'vitest';
import { planNewDetections, fingerprintSms } from '../sms/ingest.js';
import {
  resolveSourceId, findDuplicateActivities, findTrackerMatch, findTransferPair, findRefundOriginals, suggestAction,
} from '../sms/matching.js';

const T0 = Date.UTC(2025, 4, 12, 10, 0, 0);
const MIN = 60 * 1000;
const DAY = 24 * 60 * MIN;

const sms = (body, timestamp = T0, sender = 'VM-HDFCBK-S') => ({ sender, body, timestamp });
const debitSms = (amount, digits = '1234', ref = '513400000001', timestamp = T0, sender = 'VM-HDFCBK-S') =>
  sms(`Rs.${amount} debited from A/c XX${digits} on 12-05-25 to VPA shop@ybl UPI Ref ${ref}`, timestamp, sender);
const creditSms = (amount, digits = '5678', ref = '513400000001', timestamp = T0, sender = 'VM-ICICIB-S') =>
  sms(`Rs.${amount} credited to A/c XX${digits} on 12-05-25 from VPA me@okicici UPI Ref ${ref}`, timestamp, sender);

const toDetection = (plan) => ({ ...plan, id: plan.fingerprint });

describe('planNewDetections', () => {
  it('creates one pending detection per transaction SMS and skips non-transactions', () => {
    const plans = planNewDetections([
      debitSms(500),
      sms('123456 is your OTP for txn of Rs 500. Do not share.'),
      sms('Hello, meeting at 5'),
    ], []);
    expect(plans).toHaveLength(1);
    expect(plans[0]).toMatchObject({ status: 'pending', smsTime: T0, payload: { amount: 500, direction: 'debit', sender: 'HDFCBK' } });
  });

  it('never re-imports an SMS that is already stored, whatever its status', () => {
    const [first] = planNewDetections([debitSms(500)], []);
    const ignored = { ...first, status: 'ignored' };
    expect(planNewDetections([debitSms(500)], [ignored])).toEqual([]);
  });

  it('treats the same SMS seen by the receiver and the inbox scan with different timestamps as one', () => {
    const fromReceiver = debitSms(500, '1234', '513400000001', T0, 'VM-HDFCBK-T');
    const fromScan = debitSms(500, '1234', '513400000001', T0 + 40 * 1000, 'AD-HDFCBK-S');
    expect(planNewDetections([fromReceiver, fromScan], [])).toHaveLength(1);
  });

  it('keeps two genuinely separate payments of the same amount', () => {
    const plans = planNewDetections([
      debitSms(20, '1234', '513400000001', T0),
      debitSms(20, '1234', '513400000002', T0 + 5 * MIN),
    ], []);
    expect(plans.map((p) => p.status)).toEqual(['pending', 'pending']);
  });

  it('marks a second notification of the same UPI reference as a duplicate', () => {
    const plans = planNewDetections([
      debitSms(250, '1234', '513499999999', T0, 'VM-HDFCBK-S'),
      sms('You paid Rs 250.00 to shop@ybl from A/c XX1234. UPI Ref No 513499999999', T0 + MIN, 'VM-PAYTMB-S'),
    ], []);
    expect(plans[1]).toMatchObject({ status: 'duplicate', duplicateOf: plans[0].fingerprint });
  });

  it('does not mark the two sides of a self-transfer (same ref, opposite direction) as duplicates', () => {
    const plans = planNewDetections([debitSms(1000), creditSms(1000)], []);
    expect(plans.map((p) => p.status)).toEqual(['pending', 'pending']);
  });

  it('stores readable-looking but unparseable money SMS as unparsed', () => {
    const plans = planNewDetections([sms('Your A/c XX1234 has been debited towards EMI. Ref 513400001111')], []);
    expect(plans[0].status).toBe('unparsed');
  });

  it('fingerprints ignore the operator prefix on the sender', () => {
    expect(fingerprintSms(sms('x', 1, 'VM-HDFCBK')).fingerprint).toBe(fingerprintSms(sms('x', 1, 'JD-HDFCBK-T')).fingerprint);
  });
});

const sources = [
  { id: 'hdfc', cardName: 'HDFC Savings', accountNumber: '50100012341234' },
  { id: 'icici', cardName: 'ICICI', accountNumber: '****5678' },
  { id: 'cash', cardName: 'Cash', accountNumber: '' },
];

describe('resolveSourceId', () => {
  it('matches the account number suffix, prefers learned mappings, and refuses ambiguity', () => {
    expect(resolveSourceId({ account4: '1234' }, sources)).toBe('hdfc');
    expect(resolveSourceId({ account4: '5678' }, sources)).toBe('icici');
    expect(resolveSourceId({ account4: '9999' }, sources)).toBe(null);
    expect(resolveSourceId({ account4: '9999' }, sources, { 9999: 'cash' })).toBe('cash');
    expect(resolveSourceId({ account4: '9999' }, sources, { 9999: 'deleted-source' })).toBe(null);
    const twins = [...sources, { id: 'hdfc2', accountNumber: 'XX1234' }];
    expect(resolveSourceId({ account4: '1234' }, twins)).toBe(null);
  });
});

const detection = (overrides = {}) => ({
  fingerprint: 'fp-a',
  status: 'pending',
  smsTime: T0,
  payload: { direction: 'debit', amount: 499, account4: '1234', counterparty: 'netflix', refNo: null },
  ...overrides,
});

describe('findDuplicateActivities', () => {
  const manual = { id: 'm1', amount: 499, type: 'expense', date: T0 - DAY, accountId: 'hdfc' };

  it('finds a manual entry with the same amount and type within 2 days', () => {
    expect(findDuplicateActivities(detection(), 'hdfc', [manual]).map((a) => a.id)).toEqual(['m1']);
  });

  it('skips entries outside the window, of another type, another source, or already linked', () => {
    expect(findDuplicateActivities(detection(), 'hdfc', [{ ...manual, date: T0 - 3 * DAY }])).toEqual([]);
    expect(findDuplicateActivities(detection(), 'hdfc', [{ ...manual, type: 'income' }])).toEqual([]);
    expect(findDuplicateActivities(detection(), 'hdfc', [{ ...manual, accountId: 'icici' }])).toEqual([]);
    expect(findDuplicateActivities(detection(), 'hdfc', [manual], new Set(['m1']))).toEqual([]);
  });

  it('handles Firestore timestamps and transfers out of the same source', () => {
    const transfer = { id: 't1', amount: 499, type: 'transfer', fromAccountId: 'hdfc', toAccountId: 'icici', date: { toMillis: () => T0 } };
    expect(findDuplicateActivities(detection(), 'hdfc', [transfer]).map((a) => a.id)).toEqual(['t1']);
  });
});

describe('findTrackerMatch', () => {
  const trackables = [{ id: 'netflix', name: 'Netflix', type: 'expense', trackerAmount: 499 }];

  it('matches a pending occurrence of the same amount near the SMS date', () => {
    const trackers = [
      { id: 'tr-old', trackableId: 'netflix', status: 'pending', occurrenceDate: T0 - 30 * DAY },
      { id: 'tr-now', trackableId: 'netflix', status: 'pending', occurrenceDate: T0 - DAY },
    ];
    expect(findTrackerMatch(detection(), trackers, trackables)?.tracker.id).toBe('tr-now');
  });

  it('ignores completed occurrences, other amounts and far-away dates', () => {
    expect(findTrackerMatch(detection(), [{ id: 'x', trackableId: 'netflix', status: 'completed', occurrenceDate: T0 }], trackables)).toBe(null);
    expect(findTrackerMatch(detection({ payload: { direction: 'debit', amount: 500 } }), [{ id: 'x', trackableId: 'netflix', status: 'pending', occurrenceDate: T0 }], trackables)).toBe(null);
    expect(findTrackerMatch(detection(), [{ id: 'x', trackableId: 'netflix', status: 'pending', occurrenceDate: T0 + 5 * DAY }], trackables)).toBe(null);
  });
});

describe('findTransferPair', () => {
  const resolve = (payload) => resolveSourceId(payload, sources);
  const debit = detection({ fingerprint: 'd', payload: { direction: 'debit', amount: 1000, account4: '1234', refNo: null } });
  const credit = detection({ fingerprint: 'c', smsTime: T0 + 2 * MIN, payload: { direction: 'credit', amount: 1000, account4: '5678', refNo: null } });

  it('pairs a debit and a credit between two known own accounts', () => {
    expect(findTransferPair(debit, [debit, credit], resolve)?.fingerprint).toBe('c');
    expect(findTransferPair(credit, [debit, credit], resolve)?.fingerprint).toBe('d');
  });

  it('does not pair with an unknown account unless the UPI reference matches', () => {
    const stranger = { ...credit, payload: { ...credit.payload, account4: '0000' } };
    expect(findTransferPair(debit, [debit, stranger], resolve)).toBe(null);
    const sameRef = {
      ...stranger,
      payload: { ...stranger.payload, refNo: 'R1' },
    };
    expect(findTransferPair({ ...debit, payload: { ...debit.payload, refNo: 'R1' } }, [debit, sameRef], resolve)?.fingerprint).toBe('c');
  });

  it('does not pair across too much time or the same account', () => {
    expect(findTransferPair(debit, [debit, { ...credit, smsTime: T0 + 2 * 60 * MIN }], resolve)).toBe(null);
    expect(findTransferPair(debit, [debit, { ...credit, payload: { ...credit.payload, account4: '1234' } }], resolve)).toBe(null);
  });
});

describe('findRefundOriginals', () => {
  it('finds the earlier expense from the same merchant', () => {
    const refund = detection({ payload: { direction: 'credit', amount: 1250, counterparty: 'BIGBASKET', isRefund: true } });
    const activities = [
      { id: 'other', amount: 1250, type: 'expense', description: 'Fuel', date: T0 - 2 * DAY },
      { id: 'orig', amount: 1250, type: 'expense', description: 'BigBasket groceries', date: T0 - 3 * DAY },
      { id: 'future', amount: 1250, type: 'expense', description: 'BigBasket', date: T0 + DAY },
    ];
    expect(findRefundOriginals(refund, activities).map((a) => a.id)).toEqual(['orig', 'other']);
  });
});

describe('suggestAction', () => {
  const base = { activities: [], trackers: [], trackables: [], claimedActivityIds: new Set(), resolveSource: (p) => resolveSourceId(p, sources) };

  it('offers converting an SMS-created half into a transfer, never a manual record', () => {
    const credit = detection({ fingerprint: 'c', payload: { direction: 'credit', amount: 1000, account4: '5678' } });
    const debitDone = detection({ fingerprint: 'd', status: 'accepted', activityId: 'sms_d', payload: { direction: 'debit', amount: 1000, account4: '1234' } });
    const smsActivity = { id: 'sms_d', amount: 1000, type: 'expense', smsFingerprint: 'd', date: T0, accountId: 'hdfc' };

    const fromSms = suggestAction({ ...base, detection: credit, detections: [credit, debitDone], activities: [smsActivity] });
    expect(fromSms.kind).toBe('convert-transfer');

    const manual = { ...smsActivity, smsFingerprint: undefined };
    const fromManual = suggestAction({ ...base, detection: credit, detections: [credit, debitDone], activities: [manual] });
    expect(fromManual.kind).not.toBe('convert-transfer');
  });

  it('falls back to a plain accept', () => {
    expect(suggestAction({ ...base, detection: detection(), detections: [] }).kind).toBe('accept');
  });
});
