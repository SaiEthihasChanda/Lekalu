import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const T0 = Date.UTC(2025, 4, 12, 10, 0, 0);

const smsState = vi.hoisted(() => ({ value: null }));
const store = vi.hoisted(() => ({
  fetchScopeData: vi.fn(),
  acceptDetection: vi.fn(),
  mergeDetection: vi.fn(),
  ignoreDetection: vi.fn(),
  acceptTransfer: vi.fn(),
  completeTrackerFromDetection: vi.fn(),
  convertToTransfer: vi.fn(),
  rememberAccountDigits: vi.fn(),
  rememberMerchant: vi.fn(),
  restoreDetection: vi.fn(),
}));

vi.mock('../contexts/AuthContext.jsx', () => ({ useAuth: () => ({ user: { uid: 'u1' }, group: null }) }));
vi.mock('../sms/SmsContext.jsx', () => ({ useSms: () => smsState.value }));
vi.mock('../sms/store.js', () => store);
vi.mock('../sms/bridge.js', () => ({
  disableSmsDetection: vi.fn(), enableSmsDetection: vi.fn(), openAppSettings: vi.fn(),
  requestNotificationPermission: vi.fn(), requestSmsPermission: vi.fn(), scanSms: vi.fn(() => []),
}));

const { SmsInboxPage } = await import('../pages/SmsInboxPage.jsx');

const detection = {
  id: 'u1_fp1',
  fingerprint: 'fp1',
  status: 'pending',
  smsTime: T0,
  payload: { direction: 'debit', amount: 499, account4: '1234', counterparty: 'netflix', sender: 'HDFCBK' },
};

const scope = (activities = [], trackables = []) => ({
  activities,
  trackers: [],
  trackables,
  sources: [{ id: 'hdfc', cardName: 'HDFC Savings', accountNumber: 'XX1234' }],
});

const setSms = (overrides = {}) => {
  smsState.value = {
    supported: true,
    status: { ownerUid: 'u1', smsPermission: true, notificationPermission: true, scanFrom: T0 - 1000 },
    refreshStatus: vi.fn(),
    sync: vi.fn(),
    detections: [detection],
    loaded: true,
    accountMap: {},
    merchantMap: {},
    redetect: vi.fn(async () => ({ created: 3 })),
    redetecting: false,
    resetLearning: vi.fn(),
    ...overrides,
  };
};

beforeEach(() => {
  Object.values(store).forEach((fn) => fn.mockReset());
});

describe('SmsInboxPage', () => {
  it('shows only a notice where SMS is unsupported (web / Play build)', () => {
    setSms({ supported: false });
    render(<SmsInboxPage />);
    expect(screen.getByText(/available in the Lekalu Android app/i)).toBeInTheDocument();
    expect(store.fetchScopeData).not.toHaveBeenCalled();
  });

  it('accepts a new transaction with the source resolved from the account digits', async () => {
    setSms();
    store.fetchScopeData.mockResolvedValue(scope());
    render(<SmsInboxPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Add activity/i }));
    await waitFor(() => expect(store.acceptDetection).toHaveBeenCalledTimes(1));
    expect(store.acceptDetection.mock.calls[0][0]).toMatchObject({
      detection: { fingerprint: 'fp1' },
      groupId: null,
      activity: { amount: 499, type: 'expense', description: 'netflix', accountId: 'hdfc' },
    });
  });

  it('offers linking to a matching manual entry instead of adding a duplicate', async () => {
    setSms();
    const manual = { id: 'manual-1', amount: 499, type: 'expense', description: 'Netflix', date: T0 - 3600 * 1000, accountId: 'hdfc' };
    store.fetchScopeData.mockResolvedValue(scope([manual]));
    render(<SmsInboxPage />);

    const linkButton = await screen.findByRole('button', { name: /link, don’t add/i });
    await waitFor(() => expect(linkButton).toBeEnabled());
    fireEvent.click(linkButton);
    await waitFor(() => expect(store.mergeDetection).toHaveBeenCalledWith({ detection, activityId: 'manual-1' }));
    expect(store.acceptDetection).not.toHaveBeenCalled();
  });

  it('ignores a detection', async () => {
    setSms();
    store.fetchScopeData.mockResolvedValue(scope());
    render(<SmsInboxPage />);
    fireEvent.click(await screen.findByRole('button', { name: /^Ignore$/i }));
    await waitFor(() => expect(store.ignoreDetection).toHaveBeenCalledWith({ detection }));
  });

  describe('trackable learning', () => {
    const eatOut = { id: 'eatout', name: 'Eat out', type: 'expense', accountId: 'cash' };
    const sweets = { id: 'sweets', name: 'Sweets', type: 'expense' };
    const restaurant = {
      ...detection,
      id: 'u1_fp2',
      fingerprint: 'fp2',
      payload: { ...detection.payload, counterparty: 'ADYAR ANANDA BHAVAN MEDAVAKKAM' },
    };

    it('autofills the trackable learned for a similar name and records it', async () => {
      setSms({ detections: [restaurant], merchantMap: { 'adyar ananda bhavan': { trackableId: 'eatout', at: 1 } } });
      store.fetchScopeData.mockResolvedValue(scope([], [eatOut, sweets]));
      render(<SmsInboxPage />);

      expect(await screen.findByText(/Suggested because you used it for “adyar ananda bhavan”/)).toBeInTheDocument();
      fireEvent.click(screen.getByRole('button', { name: /Add activity/i }));
      await waitFor(() => expect(store.acceptDetection).toHaveBeenCalledTimes(1));
      // Account digits (••1234 -> HDFC) win over the trackable's own source
      expect(store.acceptDetection.mock.calls[0][0].activity).toMatchObject({ trackableId: 'eatout', accountId: 'hdfc' });
    });

    it('learns the new choice when the user changes the trackable', async () => {
      setSms({ detections: [restaurant], merchantMap: { 'adyar ananda bhavan medavakkam': { trackableId: 'eatout', at: 1 } } });
      store.fetchScopeData.mockResolvedValue(scope([], [eatOut, sweets]));
      render(<SmsInboxPage />);

      const select = await screen.findByLabelText('Trackable');
      await waitFor(() => expect(select).toHaveValue('eatout'));
      fireEvent.change(select, { target: { value: 'sweets' } });
      expect(screen.getByLabelText(/Use Sweets for/)).toBeChecked();
      fireEvent.click(screen.getByRole('button', { name: /Add activity/i }));
      await waitFor(() => expect(store.acceptDetection).toHaveBeenCalledTimes(1));
      expect(store.rememberMerchant).toHaveBeenCalledWith('u1', expect.any(Object), 'ADYAR ANANDA BHAVAN MEDAVAKKAM', 'sweets');
    });

    it('does not learn when the box is unticked, and uses the trackable source when digits do not match', async () => {
      const unknownCard = { ...restaurant, payload: { ...restaurant.payload, account4: '9999' } };
      setSms({ detections: [unknownCard] });
      const data = scope([], [eatOut]);
      store.fetchScopeData.mockResolvedValue({ ...data, sources: [...data.sources, { id: 'cash', cardName: 'Cash', accountNumber: '' }] });
      render(<SmsInboxPage />);

      fireEvent.change(await screen.findByLabelText('Trackable'), { target: { value: 'eatout' } });
      fireEvent.click(screen.getByLabelText(/Use Eat out for/));
      fireEvent.click(screen.getByRole('button', { name: /Add activity/i }));
      await waitFor(() => expect(store.acceptDetection).toHaveBeenCalledTimes(1));
      expect(store.acceptDetection.mock.calls[0][0].activity).toMatchObject({ trackableId: 'eatout', accountId: 'cash' });
      expect(store.rememberMerchant).not.toHaveBeenCalled();
    });

    it('learns from the manual record a detection is linked to', async () => {
      setSms({ detections: [restaurant] });
      const manual = { id: 'manual-1', amount: 499, type: 'expense', description: 'Lunch', date: T0 - 3600 * 1000, accountId: 'hdfc', trackableId: 'eatout' };
      store.fetchScopeData.mockResolvedValue(scope([manual], [eatOut]));
      render(<SmsInboxPage />);

      const linkButton = await screen.findByRole('button', { name: /link, don’t add/i });
      await waitFor(() => expect(linkButton).toBeEnabled());
      fireEvent.click(linkButton);
      await waitFor(() => expect(store.mergeDetection).toHaveBeenCalledTimes(1));
      expect(store.rememberMerchant).toHaveBeenCalledWith('u1', expect.any(Object), 'ADYAR ANANDA BHAVAN MEDAVAKKAM', 'eatout');
    });
  });

  it('clears and re-detects from the chosen date after confirmation', async () => {
    setSms();
    store.fetchScopeData.mockResolvedValue(scope());
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true);
    render(<SmsInboxPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Re-detect…/ }));
    fireEvent.change(screen.getByLabelText(/Read SMS again from/), { target: { value: '2025-05-01' } });
    fireEvent.click(screen.getByRole('button', { name: /Clear and re-detect/ }));
    await waitFor(() => expect(smsState.value.redetect).toHaveBeenCalledWith(new Date('2025-05-01T00:00:00').getTime()));
    expect(await screen.findByText(/Done: 3 SMS detected/)).toBeInTheDocument();
    confirmSpy.mockRestore();
  });

  it('does nothing when re-detect is not confirmed', async () => {
    setSms();
    store.fetchScopeData.mockResolvedValue(scope());
    const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false);
    render(<SmsInboxPage />);

    fireEvent.click(await screen.findByRole('button', { name: /Re-detect…/ }));
    fireEvent.click(screen.getByRole('button', { name: /Clear and re-detect/ }));
    expect(smsState.value.redetect).not.toHaveBeenCalled();
    confirmSpy.mockRestore();
  });
});
