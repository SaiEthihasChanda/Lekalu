import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Modal } from '../components/Modal.jsx';
import { BankAccountForm, BankAccountCard } from '../components/BankAccountForm.jsx';
import { TrackableForm, TrackableCard } from '../components/TrackableForm.jsx';
import { useBankAccounts, useTrackables, useActivities } from '../hooks/index.js';
import { calculateAccountBalance, formatAmount } from '../utils/analytics.js';

export const TrackablesPage = () => {
  const [activeTab, setActiveTab] = useState('trackables');
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);
  const [isTrackableModalOpen, setIsTrackableModalOpen] = useState(false);
  const [editingAccountId, setEditingAccountId] = useState(null);
  const [editingTrackableId, setEditingTrackableId] = useState(null);

  const { accounts, addAccount, updateAccount, deleteAccount } = useBankAccounts();
  const { trackables, addTrackable, updateTrackable, deleteTrackable } = useTrackables();
  const { activities } = useActivities();

  const editingAccount = editingAccountId ? accounts.find(a => a.id === editingAccountId) : undefined;
  const editingTrackable = editingTrackableId ? trackables.find(t => t.id === editingTrackableId) : undefined;

  const handleAddAccount = async (data) => {
    if (editingAccountId) {
      await updateAccount(editingAccountId, data);
      setEditingAccountId(null);
    } else {
      await addAccount(data);
    }
    setIsAccountModalOpen(false);
  };

  const handleAddTrackable = async (data) => {
    if (editingTrackableId) {
      await updateTrackable(editingTrackableId, data);
      setEditingTrackableId(null);
    } else {
      await addTrackable(data);
    }
    setIsTrackableModalOpen(false);
  };

  const handleEditAccount = (id) => {
    setEditingAccountId(id);
    setIsAccountModalOpen(true);
  };

  const handleEditTrackable = (id) => {
    setEditingTrackableId(id);
    setIsTrackableModalOpen(true);
  };

  const handleCloseAccountModal = () => {
    setIsAccountModalOpen(false);
    setEditingAccountId(null);
  };

  const handleCloseTrackableModal = () => {
    setIsTrackableModalOpen(false);
    setEditingTrackableId(null);
  };

  const accountsMap = new Map(accounts.map(a => [a.id, a]));

  return (
    <div className="p-4 md:p-8">
      <div className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold text-white mb-2">Trackables</h1>
        <p className="text-sm md:text-base text-gray-400">Manage your recurring income and expenses</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-6 md:mb-8 border-b border-gray-700 overflow-x-auto">
        <button
          onClick={() => setActiveTab('trackables')}
          className={`pb-4 px-3 md:px-4 font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
            activeTab === 'trackables'
              ? 'text-accent border-b-2 border-accent'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Trackables
        </button>
        <button
          onClick={() => setActiveTab('accounts')}
          className={`pb-4 px-3 md:px-4 font-medium transition-colors text-sm md:text-base whitespace-nowrap ${
            activeTab === 'accounts'
              ? 'text-accent border-b-2 border-accent'
              : 'text-gray-400 hover:text-gray-300'
          }`}
        >
          Bank Accounts
        </button>
      </div>

      {/* Trackables Panel */}
      {activeTab === 'trackables' && (
        <div>
          <button
            onClick={() => setIsTrackableModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center md:justify-start gap-2 bg-accent hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg mb-6 transition-colors text-sm md:text-base"
          >
            <Plus size={20} />
            Add Trackable
          </button>

          <div className="grid grid-cols-1 gap-3 md:gap-4">
            {trackables.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm md:text-base">
                No trackables created yet. Add one to get started!
              </div>
            ) : (
              trackables.map(trackable => (
                <TrackableCard
                  key={trackable.id}
                  trackable={trackable}
                  onEdit={() => handleEditTrackable(trackable.id)}
                  onDelete={() => deleteTrackable(trackable.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Accounts Panel */}
      {activeTab === 'accounts' && (
        <div>
          <button
            onClick={() => setIsAccountModalOpen(true)}
            className="w-full md:w-auto flex items-center justify-center md:justify-start gap-2 bg-accent hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg mb-6 transition-colors text-sm md:text-base"
          >
            <Plus size={20} />
            Add Bank Account
          </button>

          <div className="space-y-2 md:space-y-3">
            {accounts.length === 0 ? (
              <div className="text-center py-12 text-gray-400 text-sm md:text-base">
                No bank accounts added yet. Add one to get started!
              </div>
            ) : (
              accounts.map(account => (
                <BankAccountCard
                  key={account.id}
                  account={account}
                  balance={formatAmount(calculateAccountBalance(account.id, account.openingBalance, activities))}
                  onEdit={() => handleEditAccount(account.id)}
                  onDelete={() => deleteAccount(account.id)}
                />
              ))
            )}
          </div>
        </div>
      )}

      {/* Account Modal */}
      <Modal
        isOpen={isAccountModalOpen}
        onClose={handleCloseAccountModal}
        title={editingAccountId ? 'Edit Account' : 'Add Bank Account'}
        size="md"
      >
        <BankAccountForm
          account={editingAccount}
          onSubmit={handleAddAccount}
          onCancel={handleCloseAccountModal}
        />
      </Modal>

      {/* Trackable Modal */}
      <Modal
        isOpen={isTrackableModalOpen}
        onClose={handleCloseTrackableModal}
        title={editingTrackableId ? 'Edit Trackable' : 'Add Trackable'}
        size="md"
      >
        <TrackableForm
          trackable={editingTrackable}
          accounts={accounts}
          onSubmit={handleAddTrackable}
          onCancel={handleCloseTrackableModal}
        />
      </Modal>
    </div>
  );
};
