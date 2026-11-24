import { describe, it, expect } from 'vitest';
import {
  normalizeMerchantName, merchantSimilarity, resolveTrackableForName, MERCHANT_MATCH_THRESHOLD,
} from '../sms/matching.js';
import { applyKeptLinks, planNewDetections } from '../sms/ingest.js';
import { filterActivities, sanitizeActivityFilters, DEFAULT_ACTIVITY_FILTERS } from '../utils/activityFilters.js';

describe('normalizeMerchantName', () => {
  it('lowercases, drops legal words, numbers and UPI handles', () => {
    expect(normalizeMerchantName('ADYAR Ananda Bhavan Pvt Ltd')).toBe('adyar ananda bhavan');
    expect(normalizeMerchantName('a2b.foods@ybl')).toBe('a2b foods');
    expect(normalizeMerchantName('  Swiggy   123 ')).toBe('swiggy');
    expect(normalizeMerchantName(null)).toBe('');
  });
});

describe('merchantSimilarity', () => {
  const learned = normalizeMerchantName('Adyar Ananda bhavan');
  const score = (name) => merchantSimilarity(normalizeMerchantName(name), learned);

  it('scores variants of the same merchant above the threshold', () => {
    for (const name of [
      'Adyar Ananda bhavan',
      'ADYAR Ananda bhavan',
      'Adyar Ananda bhavan medavakkam',
      'ADYAR ANANDA BHAVAN SWEETS PVT LTD',
      'adyaranandabhavan@ybl',
      'Adyar Anand Bhavan',
    ]) {
      expect(score(name), name).toBeGreaterThanOrEqual(MERCHANT_MATCH_THRESHOLD);
    }
  });

  it('keeps unrelated merchants below the threshold', () => {
    for (const name of ['Saravana Bhavan', 'Swiggy', 'Amazon Pay', 'Ananda Stores']) {
      expect(score(name), name).toBeLessThan(MERCHANT_MATCH_THRESHOLD);
    }
  });
});

describe('resolveTrackableForName', () => {
  const trackables = [
    { id: 'eatout', name: 'Eat out', type: 'expense' },
    { id: 'sweets', name: 'Sweets', type: 'expense' },
    { id: 'salary', name: 'Salary', type: 'income' },
  ];

  it('autofills the learned trackable for similar names, whatever the source', () => {
    const map = { 'adyar ananda bhavan': { trackableId: 'eatout', at: 1 } };
    expect(resolveTrackableForName('Adyar Ananda bhavan medavakkam', map, trackables, 'expense'))
      .toMatchObject({ trackableId: 'eatout', learnedName: 'adyar ananda bhavan' });
    expect(resolveTrackableForName('Saravana Bhavan', map, trackables, 'expense')).toBe(null);
  });

  it('ignores trackables that are missing from the scope or of the other type', () => {
    expect(resolveTrackableForName('Adyar Ananda Bhavan', { 'adyar ananda bhavan': { trackableId: 'deleted', at: 1 } }, trackables, 'expense')).toBe(null);
    expect(resolveTrackableForName('Adyar Ananda Bhavan', { 'adyar ananda bhavan': { trackableId: 'salary', at: 1 } }, trackables, 'expense')).toBe(null);
  });

  it('prefers the closest learned name, then the most recent', () => {
    const map = {
      'adyar ananda bhavan medavakkam': { trackableId: 'sweets', at: 1 },
      'adyar ananda bhavan': { trackableId: 'eatout', at: 2 },
    };
    expect(resolveTrackableForName('Adyar Ananda Bhavan', map, trackables, 'expense').trackableId).toBe('eatout');
    const tie = {
      'adyar ananda bhavan medavakkam': { trackableId: 'eatout', at: 1 },
      'adyar ananda bhavan velachery': { trackableId: 'sweets', at: 5 },
    };
    expect(resolveTrackableForName('ADYAR ANANDA BHAVAN', tie, trackables, 'expense').trackableId).toBe('sweets');
  });

  it('returns null without a usable name', () => {
    expect(resolveTrackableForName(null, { x: { trackableId: 'eatout' } }, trackables, 'expense')).toBe(null);
  });
});

describe('applyKeptLinks (re-detect)', () => {
  const sms = (amount, ref, timestamp) => ({
    sender: 'VM-HDFCBK-S',
    body: `Rs.${amount} debited from A/c XX1234 on 12-05-25 to VPA shop@ybl UPI Ref ${ref}`,
    timestamp,
  });

  it('brings recorded SMS back as recorded and leaves the rest pending', () => {
    const plans = planNewDetections([sms(100, '513400000001', 1000), sms(200, '513400000002', 2000)], []);
    const keptLinks = { [plans[0].fingerprint]: { status: 'accepted', activityId: `sms_${plans[0].fingerprint}`, activityGroupId: null } };
    const result = applyKeptLinks(plans, keptLinks);
    expect(result[0]).toMatchObject({ status: 'accepted', link: { activityId: `sms_${plans[0].fingerprint}` } });
    expect(result[1].status).toBe('pending');
    expect(result[1].link).toBeUndefined();
  });

  it('keeps a merged link as merged and survives a missing map', () => {
    const [plan] = planNewDetections([sms(100, '513400000001', 1000)], []);
    expect(applyKeptLinks([plan], { [plan.fingerprint]: { status: 'merged', activityId: 'manual-1' } })[0].status).toBe('merged');
    expect(applyKeptLinks([plan], undefined)[0].status).toBe('pending');
  });
});

describe('filterActivities', () => {
  const trackablesMap = new Map([['eatout', { id: 'eatout', accountId: 'cash' }]]);
  const activities = [
    { id: 'a', type: 'expense', accountId: 'hdfc', trackableId: 'eatout' },
    { id: 'b', type: 'income', accountId: 'hdfc' },
    { id: 'c', type: 'transfer', fromAccountId: 'hdfc', toAccountId: 'icici' },
    { id: 'd', type: 'Self Transfer', fromAccountId: 'icici', toAccountId: 'cash' },
    { id: 'e', type: 'expense', trackableId: 'eatout' },
  ];
  const ids = (filters) => filterActivities(activities, { ...DEFAULT_ACTIVITY_FILTERS, ...filters }, trackablesMap).map((a) => a.id);

  it('passes everything with no filters', () => {
    expect(ids({})).toEqual(['a', 'b', 'c', 'd', 'e']);
  });

  it('filters by type, counting every transfer spelling', () => {
    expect(ids({ type: 'expense' })).toEqual(['a', 'e']);
    expect(ids({ type: 'transfer' })).toEqual(['c', 'd']);
  });

  it('filters by source, including transfers in or out and the trackable source fallback', () => {
    expect(ids({ sourceId: 'hdfc' })).toEqual(['a', 'b', 'c']);
    expect(ids({ sourceId: 'cash' })).toEqual(['d', 'e']);
  });

  it('filters by trackable or by "no trackable", and combines filters', () => {
    expect(ids({ trackableId: 'eatout' })).toEqual(['a', 'e']);
    expect(ids({ trackableId: 'none' })).toEqual(['b', 'c', 'd']);
    expect(ids({ trackableId: 'eatout', sourceId: 'hdfc' })).toEqual(['a']);
  });

  it('drops filters that point at deleted sources or trackables', () => {
    expect(sanitizeActivityFilters({ sourceId: 'gone', type: 'bogus', trackableId: 'gone' }, [{ id: 'hdfc' }], [{ id: 'eatout' }]))
      .toEqual(DEFAULT_ACTIVITY_FILTERS);
    expect(sanitizeActivityFilters({ sourceId: 'hdfc', type: 'income', trackableId: 'none' }, [{ id: 'hdfc' }], []))
      .toEqual({ sourceId: 'hdfc', type: 'income', trackableId: 'none' });
  });
});
