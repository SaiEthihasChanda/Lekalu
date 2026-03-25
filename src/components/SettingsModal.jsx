import React, { useState } from 'react';
import { Settings, AlertTriangle, Trash2, X } from 'lucide-react';
import { deleteAllUserData } from '../fb/index.js';
import { Modal } from './Modal.jsx';

/**
 * Settings Modal Component
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Callback to close modal
 * @param {Function} onDataCleared - Callback after data is cleared
 */
export const SettingsModal = ({ isOpen, onClose, onDataCleared }) => {
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [error, setError] = useState('');

  const handleClearData = async () => {
    setError('');
    setIsDeleting(true);

    try {
      await deleteAllUserData();
      // Clear local storage
      localStorage.clear();
      // Callback to parent to refresh or navigate
      if (onDataCleared) {
        onDataCleared();
      }
      // Close modals
      setShowConfirm(false);
      onClose();
      // Reload page to reset state
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Failed to clear data. Please try again.');
      console.error('Error clearing data:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Settings size={24} className="text-accent" />
            <h2 className="text-2xl font-bold text-white">Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Settings Options */}
        <div className="space-y-4">
          {/* Clear Data Section */}
          <div className="bg-primary border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white mb-1">Clear All Data</h3>
                <p className="text-sm text-gray-400">
                  Delete all your bank accounts, trackables, activities, and trackers. This action cannot be undone.
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {!showConfirm ? (
              <button
                onClick={() => setShowConfirm(true)}
                className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
              >
                <Trash2 size={18} />
                Clear All Data
              </button>
            ) : (
              <div className="space-y-2">
                <p className="text-sm text-red-400 font-medium">
                  Are you sure? This will permanently delete everything.
                </p>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowConfirm(false)}
                    disabled={isDeleting}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleClearData}
                    disabled={isDeleting}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {isDeleting ? 'Clearing...' : 'Confirm Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Modal>
  );
};
