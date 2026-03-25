import { useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';

export const TrackableForm = ({ trackable, accounts, onSubmit, isLoading = false, onCancel }) => {
  const [name, setName] = useState(trackable?.name || '');
  const [accountId, setAccountId] = useState(trackable?.accountId || '');
  const [type, setType] = useState(trackable?.type || 'expense');
  const [includeInTracker, setIncludeInTracker] = useState(trackable?.includeInTracker || false);
  const [trackerAmount, setTrackerAmount] = useState(trackable?.trackerAmount?.toString() || '');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!name) {
      alert('Please fill in the required fields');
      return;
    }

    if (includeInTracker && !trackerAmount) {
      alert('Please enter a tracker amount');
      return;
    }

    const data = {
      name,
      type,
      includeInTracker,
    };

    // Only include trackerAmount if trackable is being tracked
    if (includeInTracker && trackerAmount) {
      data.trackerAmount = parseFloat(trackerAmount);
    }

    // Only include accountId if selected
    if (accountId) {
      data.accountId = accountId;
    }

    onSubmit(data);

    setName('');
    setAccountId('');
    setType('expense');
    setIncludeInTracker(false);
    setTrackerAmount('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Name *</label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-accent"
          placeholder="e.g., Netflix Subscription"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Account</label>
        <select
          value={accountId}
          onChange={(e) => setAccountId(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white focus:outline-none focus:border-accent"
        >
          <option value="">Select an account (optional)</option>
          {accounts.map(acc => (
            <option key={acc.id} value={acc.id}>
              {acc.cardName} ({acc.accountNumber})
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Type</label>
        <div className="flex gap-3">
          {['income', 'expense'].map(t => (
            <button
              key={t}
              type="button"
              onClick={() => setType(t)}
              className={`flex-1 py-2 px-4 rounded-lg font-medium transition-colors ${
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

      <div className="flex items-center gap-3">
        <input
          type="checkbox"
          id="includeInTracker"
          checked={includeInTracker}
          onChange={(e) => setIncludeInTracker(e.target.checked)}
          className="w-4 h-4 bg-gray-700 border border-gray-600 rounded cursor-pointer"
        />
        <label htmlFor="includeInTracker" className="text-sm font-medium text-gray-300">
          Include in Tracker
        </label>
      </div>

      {includeInTracker && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Tracker Amount *</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={trackerAmount}
            onChange={(e) => setTrackerAmount(e.target.value)}
            className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-accent"
            placeholder="0.00"
          />
        </div>
      )}

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-accent hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Trackable'}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
};

export const TrackableCard = ({ trackable, account, onEdit, onDelete }) => {
  // Validate data before rendering to prevent crashes from failed decryption
  if (!trackable || !trackable.name || !trackable.type) {
    return null; // Don't render if critical data is missing
  }

  const typeColor = trackable.type === 'income' ? 'text-green-400' : 'text-red-400';

  return (
    <div className="bg-secondary border border-gray-700 rounded-lg p-4 hover:border-accent transition-colors">
      <div className="flex items-center justify-between mb-3">
        <div className="flex-1">
          <h3 className="text-white font-medium">{trackable.name}</h3>
          {account && account.cardName && <p className="text-xs text-gray-400 mt-1">{account.cardName}</p>}
        </div>
        <span className={`text-sm font-medium ${typeColor}`}>
          {trackable.type.charAt(0).toUpperCase() + trackable.type.slice(1)}
        </span>
      </div>

      {trackable.includeInTracker && trackable.trackerAmount != null && (
        <div className="mb-3 p-2 bg-primary/50 rounded text-sm text-gray-300">
          Tracked Amount: ${trackable.trackerAmount.toFixed(2) || '0.00'}
        </div>
      )}

      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
        >
          <Edit2 size={16} className="text-gray-400" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-900/50 rounded transition-colors"
        >
          <Trash2 size={16} className="text-red-400" />
        </button>
      </div>
    </div>
  );
};
