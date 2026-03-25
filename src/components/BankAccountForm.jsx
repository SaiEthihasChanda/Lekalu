import { useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';

export const BankAccountForm = ({ account, onSubmit, isLoading = false, onCancel }) => {
  const [cardName, setCardName] = useState(account?.cardName || '');
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber || '');

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!cardName || !accountNumber) {
      alert('Please fill in all fields');
      return;
    }

    onSubmit({ cardName, accountNumber });
    setCardName('');
    setAccountNumber('');
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Card Name *</label>
        <input
          type="text"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-accent"
          placeholder="e.g., Chase Credit Card"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Account Number *</label>
        <input
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-accent"
          placeholder="e.g., ****1234"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-accent hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Account'}
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

export const BankAccountCard = ({ account, onEdit, onDelete }) => {
  return (
    <div className="bg-secondary border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-accent transition-colors">
      <div>
        <h3 className="text-white font-medium">{account.cardName}</h3>
        <p className="text-sm text-gray-400 mt-1">{account.accountNumber}</p>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={onEdit}
          className="p-2 hover:bg-gray-700 rounded transition-colors"
        >
          <Edit2 size={18} className="text-gray-400" />
        </button>
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-900/50 rounded transition-colors"
        >
          <Trash2 size={18} className="text-red-400" />
        </button>
      </div>
    </div>
  );
};
