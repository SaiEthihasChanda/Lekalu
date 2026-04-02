import { useState, useMemo } from 'react';
import { AmountConfirmationModal } from './AmountConfirmationModal.jsx';

export const EditActivityForm = ({ activity, trackables, accounts, onSubmit, isLoading = false, onCancel }) => {
  const [amount, setAmount] = useState(activity?.amount?.toString() || '');
  const [type, setType] = useState(activity?.type || 'expense');
  const [trackableId, setTrackableId] = useState(activity?.trackableId || '');
  const [accountId, setAccountId] = useState(activity?.accountId || '');
  const [fromAccountId, setFromAccountId] = useState(activity?.fromAccountId || accounts[0]?.id || '');
  const [toAccountId, setToAccountId] = useState(activity?.toAccountId || accounts[1]?.id || '');
  const [description, setDescription] = useState(activity?.description || '');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!amount) {
      alert('Please fill in amount');
      return;
    }

    // For transfer type, validate that from and to accounts are different
    if (type === 'transfer') {
      if (!fromAccountId || !toAccountId) {
        alert('Please select both source and destination accounts for transfer');
        return;
      }
      if (fromAccountId === toAccountId) {
        alert('Source and destination accounts must be different');
        return;
      }
    }

    // Build data object
    const data = {
      amount: parseFloat(amount),
      type,
      description,
    };

    // Add accountId/transfer fields based on type
    if (type === 'transfer') {
      data.fromAccountId = fromAccountId;
      data.toAccountId = toAccountId;
    } else if (accountId) {
      data.accountId = accountId;
    }

    // Add trackableId if selected and not a transfer
    if (trackableId && type !== 'transfer') {
      data.trackableId = trackableId;
    }

    // Check if amount is suspiciously large (> 99 lakhs)
    if (parseFloat(amount) > 9900000) {
      setPendingData(data);
      setShowConfirmModal(true);
      return;
    }

    onSubmit(data);
  };

  const handleConfirmAmount = () => {
    if (pendingData) {
      onSubmit(pendingData);
      setPendingData(null);
      setShowConfirmModal(false);
    }
  };

  const handleCancelAmount = () => {
    setPendingData(null);
    setShowConfirmModal(false);
  };

  const filteredTrackables = trackables.filter(t => t.type === type);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Type</label>
        <div className="flex gap-2 md:gap-3">
          {['income', 'expense', 'transfer'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 md:py-2 px-3 md:px-4 rounded-lg font-medium transition-colors text-xs md:text-sm ${
                type === t
                  ? 'bg-accent text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {t.charAt(0).toUpperCase() + t.slice(1)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Amount *</label>
        <input
          type="number"
          step="0.01"
          min="0"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 md:px-4 py-2 md:py-2 text-white placeholder-gray-400 focus:outline-none focus:border-accent text-sm md:text-base"
          placeholder="0.00"
        />
      </div>

      {type !== 'transfer' && (
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Trackable</label>
          {filteredTrackables.length > 0 ? (
            <select
              value={trackableId}
              onChange={(e) => setTrackableId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 md:px-4 py-2 text-white focus:outline-none focus:border-accent text-sm md:text-base"
            >
              <option value="">Select a trackable (optional)</option>
              {filteredTrackables.map(t => (
                <option key={t.id} value={t.id}>
                  {t.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-xs md:text-sm text-gray-400 py-2">No trackables created for this type</p>
          )}
        </div>
      )}

      {type === 'transfer' ? (
        <>
          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">From Account *</label>
            <select
              value={fromAccountId}
              onChange={(e) => setFromAccountId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 md:px-4 py-2 text-white focus:outline-none focus:border-accent text-sm md:text-base"
            >
              <option value="">Select source account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.cardName} ({acc.accountNumber || 'no number'})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">To Account *</label>
            <select
              value={toAccountId}
              onChange={(e) => setToAccountId(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 md:px-4 py-2 text-white focus:outline-none focus:border-accent text-sm md:text-base"
            >
              <option value="">Select destination account</option>
              {accounts.map(acc => (
                <option key={acc.id} value={acc.id}>
                  {acc.cardName} ({acc.accountNumber || 'no number'})
                </option>
              ))}
            </select>
          </div>
        </>
      ) : (
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Account</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 md:px-4 py-2 text-white focus:outline-none focus:border-accent text-sm md:text-base"
          >
            <option value="">Select an account</option>
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.cardName} ({acc.accountNumber || 'no number'})
              </option>
            ))}
          </select>
        </div>
      )}

      <div>
        <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Description</label>
        <input
          type="text"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 md:px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-accent text-sm md:text-base"
          placeholder="Enter activity description"
        />
      </div>

      <div className="flex gap-3">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-accent hover:bg-blue-600 text-white font-medium py-2 md:py-3 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm md:text-base"
        >
          {isLoading ? 'Saving...' : 'Save Changes'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 md:py-3 px-4 rounded-lg transition-colors text-sm md:text-base"
          >
            Cancel
          </button>
        )}
      </div>

      <AmountConfirmationModal
        isOpen={showConfirmModal}
        amount={pendingData?.amount || 0}
        onConfirm={handleConfirmAmount}
        onCancel={handleCancelAmount}
      />
    </form>
  );
};
