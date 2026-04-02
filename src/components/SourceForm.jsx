import { useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { AmountConfirmationModal } from './AmountConfirmationModal.jsx';

export const SourceForm = ({ source, onSubmit, isLoading = false, onCancel, isNewSource = false }) => {
  const [cardName, setCardName] = useState(source?.cardName || '');
  const [accountNumber, setAccountNumber] = useState(source?.accountNumber || '');
  const [sourceType, setSourceType] = useState(source?.sourceType || 'none');
  const [openingBalance, setOpeningBalance] = useState(source?.openingBalance?.toString() || '0');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!cardName) {
      alert('Please fill in Source Name');
      return;
    }

    const data = { cardName, accountNumber, sourceType, openingBalance: parseFloat(openingBalance) || 0 };

    // Check if amount is suspiciously large (> 99 lakhs)
    if (parseFloat(openingBalance) > 9900000) {
      setPendingData(data);
      setShowConfirmModal(true);
      return;
    }

    onSubmit(data);
    setCardName('');
    setAccountNumber('');
    setSourceType('none');
    setOpeningBalance('0');
  };

  const handleConfirmAmount = () => {
    if (pendingData) {
      onSubmit(pendingData);
      setPendingData(null);
      setShowConfirmModal(false);

      setCardName('');
      setAccountNumber('');
      setSourceType('none');
      setOpeningBalance('0');
    }
  };

  const handleCancelAmount = () => {
    setPendingData(null);
    setShowConfirmModal(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Source Name *</label>
        <input
          type="text"
          value={cardName}
          onChange={(e) => setCardName(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-accent"
          placeholder="e.g., Chase Credit Card"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
        <input
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-accent"
          placeholder="e.g., ****1234 (optional)"
        />
      </div>

      {isNewSource && (
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Source Type *</label>
          <div className="space-y-2">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="sourceType"
                value="credit"
                checked={sourceType === 'credit'}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-gray-300">Credit Card</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="sourceType"
                value="debit"
                checked={sourceType === 'debit'}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-gray-300">Debit Account</span>
            </label>
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="radio"
                name="sourceType"
                value="none"
                checked={sourceType === 'none'}
                onChange={(e) => setSourceType(e.target.value)}
                className="w-4 h-4"
              />
              <span className="text-gray-300">Other / None</span>
            </label>
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Opening Balance</label>
        <input
          type="number"
          step="0.01"
          value={openingBalance}
          onChange={(e) => setOpeningBalance(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-accent"
          placeholder="0.00"
        />
      </div>

      <div className="flex gap-2">
        <button
          type="submit"
          disabled={isLoading}
          className="flex-1 bg-accent hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors disabled:opacity-50"
        >
          {isLoading ? 'Saving...' : 'Save Source'}
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

      <AmountConfirmationModal
        isOpen={showConfirmModal}
        amount={pendingData?.openingBalance || 0}
        onConfirm={handleConfirmAmount}
        onCancel={handleCancelAmount}
      />
    </form>
  );
};

export const SourceCard = ({ source, onEdit, onDelete, balance }) => {
  const sourceTypeLabel = {
    credit: '💳 Credit Card',
    debit: '🏦 Debit Account',
    none: '📊 Other'
  }[source.sourceType || 'none'];

  return (
    <div className="bg-secondary border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-accent transition-colors">
      <div>
        <h3 className="text-white font-medium">{source.cardName}</h3>
        <p className="text-sm text-gray-400 mt-1">{sourceTypeLabel}</p>
        {source.accountNumber && <p className="text-sm text-gray-400">{source.accountNumber}</p>}
        {balance !== undefined && (
          <p className="text-sm text-gray-300 mt-2">Balance: <span className={balance >= 0 ? 'text-green-400' : 'text-red-400'}>{balance}</span></p>
        )}
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
