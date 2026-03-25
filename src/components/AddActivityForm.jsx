import { useState, useMemo } from 'react';

export const AddActivityForm = ({ trackables, accounts, onSubmit, isLoading = false }) => {
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('expense');
  const [trackableId, setTrackableId] = useState('');
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [description, setDescription] = useState('');

  const selectedTrackable = useMemo(() => {
    return trackables.find(t => t.id === trackableId);
  }, [trackableId, trackables]);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!amount) {
      alert('Please fill in amount');
      return;
    }

    // If trackable is selected, we don't need to validate accountId (it comes from trackable)
    // Otherwise, accountId is required
    if (!trackableId && !accountId) {
      alert('Please select an account or trackable');
      return;
    }

    // Build data object without undefined fields
    const data = {
      amount: parseFloat(amount),
      type,
      description,
    };

    // Add accountId only if it has a value
    const finalAccountId = trackableId ? selectedTrackable?.accountId : accountId;
    if (finalAccountId) {
      data.accountId = finalAccountId;
    }

    // Only include trackableId if it's not empty
    if (trackableId) {
      data.trackableId = trackableId;
    }

    onSubmit(data);

    setAmount('');
    setType('expense');
    setTrackableId('');
    setDescription('');
  };

  // Filter trackables by type (don't filter out tracked ones - user can still manually add them)
  const filteredTrackables = trackables.filter(
    t => t.type === type
  );
  const trackablesMap = new Map(trackables.map(t => [t.id, t]));

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
            <p className="text-xs md:text-sm text-gray-400 py-2">No trackables created yet for this type</p>
          )}
        </div>
      )}

      {!trackableId && (
        <div>
          <label className="block text-xs md:text-sm font-medium text-gray-300 mb-2">Account *</label>
          <select
            value={accountId}
            onChange={(e) => setAccountId(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 md:px-4 py-2 text-white focus:outline-none focus:border-accent text-sm md:text-base"
          >
            {accounts.map(acc => (
              <option key={acc.id} value={acc.id}>
                {acc.cardName} ({acc.accountNumber})
              </option>
            ))}
          </select>
        </div>
      )}

      {trackableId && selectedTrackable && (
        <div className="bg-secondary rounded-lg p-3 border border-gray-600">
          <p className="text-xs md:text-sm text-gray-400 mb-1">Account (from trackable)</p>
          <p className="text-white font-medium text-sm md:text-base">
            {(() => {
              const account = accounts.find(a => a.id === selectedTrackable.accountId);
              return account ? `${account.cardName} (${account.accountNumber})` : 'Unknown Account';
            })()}
          </p>
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

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-accent hover:bg-blue-600 text-white font-medium py-2 md:py-3 px-4 rounded-lg transition-colors disabled:opacity-50 text-sm md:text-base"
      >
        {isLoading ? 'Adding...' : 'Add Activity'}
      </button>
    </form>
  );
};
