import { useState } from 'react';
import { Trash2, Edit2 } from 'lucide-react';
import { AmountConfirmationModal } from './AmountConfirmationModal.jsx';

export const BankAccountForm = ({ account, onSubmit, isLoading = false, onCancel }) => {
  const [cardName, setCardName] = useState(account?.cardName || '');
  const [accountNumber, setAccountNumber] = useState(account?.accountNumber || '');
  const [openingBalance, setOpeningBalance] = useState(account?.openingBalance?.toString() || '0');
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingData, setPendingData] = useState(null);

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!cardName) {
      alert('Please fill in Card Name');
      return;
    }

    const data = { cardName, accountNumber, openingBalance: parseFloat(openingBalance) || 0 };

    // Check if amount is suspiciously large (> 99 lakhs)
    if (parseFloat(openingBalance) > 9900000) {
      setPendingData(data);
      setShowConfirmModal(true);
      return;
    }

    onSubmit(data);
    setCardName('');
    setAccountNumber('');
    setOpeningBalance('0');
  };

  const handleConfirmAmount = () => {
    if (pendingData) {
      onSubmit(pendingData);
      setPendingData(null);
      setShowConfirmModal(false);

      setCardName('');
      setAccountNumber('');
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
        <label className="block text-sm font-medium text-gray-300 mb-2">Account Number</label>
        <input
          type="text"
          value={accountNumber}
          onChange={(e) => setAccountNumber(e.target.value)}
          className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2 text-white placeholder-gray-400 focus:outline-none focus:border-accent"
          placeholder="e.g., ****1234 (optional)"
        />
      </div>

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

      <AmountConfirmationModal
        isOpen={showConfirmModal}
        amount={pendingData?.openingBalance || 0}
        onConfirm={handleConfirmAmount}
        onCancel={handleCancelAmount}
      />
    </form>
  );
};

export const BankAccountCard = ({ account, onEdit, onDelete, balance }) => {
  return (
    <div className="bg-secondary border border-gray-700 rounded-lg p-4 flex items-center justify-between hover:border-accent transition-colors">
      <div>
        <h3 className="text-white font-medium">{account.cardName}</h3>
        {account.accountNumber && <p className="text-sm text-gray-400 mt-1">{account.accountNumber}</p>}
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
