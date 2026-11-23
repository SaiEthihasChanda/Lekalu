import { describe, it, expect, vi, beforeEach } from 'vitest';

const calls = vi.hoisted(() => []);
const fakeDocs = vi.hoisted(() => ({ value: [] }));

vi.mock('firebase/firestore', () => ({
  collection: vi.fn((db, name) => ({ name })),
  deleteField: vi.fn(),
  doc: vi.fn((db, coll, id) => ({ path: `${coll}/${id}` })),
  getDocs: vi.fn(async () => ({ docs: fakeDocs.value })),
  onSnapshot: vi.fn(),
  query: vi.fn((...args) => args),
  runTransaction: vi.fn(),
  serverTimestamp: vi.fn(() => 'ts'),
  setDoc: vi.fn(async (ref, data) => calls.push({ op: 'setDoc', ref, data })),
  where: vi.fn(),
  writeBatch: vi.fn(() => {
    const deletes = [];
    return {
      delete: (ref) => deletes.push(ref.path),
      commit: async () => calls.push({ op: 'commit', deletes }),
    };
  }),
}));
vi.mock('../fb/index.js', () => ({ db: {}, getUserId: () => 'u1', initializeAuth: vi.fn() }));

const { flushDetections } = await import('../sms/store.js');
const { decryptData, generateEncryptionKey } = await import('../utils/encryption.js');

const snap = (id, data) => ({ id, ref: { path: `smsDetections/${id}` }, data: () => data });

beforeEach(() => {
  calls.length = 0;
});

describe('flushDetections', () => {
  it('saves links of recorded SMS before deleting every detection, and never touches activities', async () => {
    fakeDocs.value = [
      snap('u1_a', { fingerprint: 'a', status: 'accepted', activityId: 'sms_a', activityGroupId: null }),
      snap('u1_b', { fingerprint: 'b', status: 'merged', activityId: 'manual-1', activityGroupId: 'g1' }),
      snap('u1_c', { fingerprint: 'c', status: 'accepted', activityId: 'sms_c', trackerId: 'rent_1' }),
      snap('u1_d', { fingerprint: 'd', status: 'ignored', activityId: null }),
      snap('u1_e', { fingerprint: 'e', status: 'pending', activityId: null }),
    ];
    const earlier = { e: { status: 'accepted', activityId: 'sms_e' }, old: { status: 'merged', activityId: 'm9' } };

    const result = await flushDetections('u1', earlier);

    expect(calls[0].op).toBe('setDoc');
    expect(calls[0].ref.path).toBe('smsSettings/u1');
    const saved = decryptData(calls[0].data, generateEncryptionKey('u1', null)).keptLinks;
    expect(saved).toEqual({
      a: { status: 'accepted', activityId: 'sms_a', activityGroupId: null },
      b: { status: 'merged', activityId: 'manual-1', activityGroupId: 'g1' },
      c: { status: 'accepted', activityId: 'sms_c', trackerId: 'rent_1', activityGroupId: null },
      // 'e' was put back for review after the last re-detect, so its stale link is dropped
      old: { status: 'merged', activityId: 'm9' },
    });
    expect(result.keptLinks).toEqual(saved);

    const deleted = calls.filter((call) => call.op === 'commit').flatMap((call) => call.deletes);
    expect(deleted).toEqual(['smsDetections/u1_a', 'smsDetections/u1_b', 'smsDetections/u1_c', 'smsDetections/u1_d', 'smsDetections/u1_e']);
    expect(deleted.some((path) => path.startsWith('activities/'))).toBe(false);
    expect(result.deleted).toBe(5);
  });

  it('deletes nothing if saving the links fails', async () => {
    const { setDoc } = await import('firebase/firestore');
    setDoc.mockRejectedValueOnce(new Error('offline'));
    fakeDocs.value = [snap('u1_a', { fingerprint: 'a', status: 'accepted', activityId: 'sms_a' })];
    await expect(flushDetections('u1', {})).rejects.toThrow('offline');
    expect(calls.some((call) => call.op === 'commit')).toBe(false);
  });

  it('splits large deletes into batches under the Firestore limit', async () => {
    fakeDocs.value = Array.from({ length: 1000 }, (_, i) => snap(`u1_${i}`, { fingerprint: String(i), status: 'pending' }));
    await flushDetections('u1', {});
    const commits = calls.filter((call) => call.op === 'commit');
    expect(commits.map((call) => call.deletes.length)).toEqual([450, 450, 100]);
  });
});
