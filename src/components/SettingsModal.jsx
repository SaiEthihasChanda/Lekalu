import React, { useState, useEffect } from 'react';
import { Settings, AlertTriangle, Trash2, X, Users, Lock, Fingerprint } from 'lucide-react';
import { deleteAllUserData, getUserId, initializeAuth } from '../fb/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Modal } from './Modal.jsx';
import { GroupManagementModal } from './GroupManagementModal.jsx';
import { BiometricSettings } from './BiometricAuth.jsx';
import { isMobileDevice } from '../utils/webauthn.js';

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
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const { group, user } = useAuth();
  const isGroupOwner = group && user && group.owner === user.uid;

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
    <>
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
          {/* Group Management Section */}
          <div className="bg-primary border border-accent/30 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <Users size={20} className="text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white mb-1">Group Management</h3>
                <p className="text-sm text-gray-400">
                  Create or join a group to share expenses with others
                </p>
              </div>
            </div>

            <button
              onClick={() => setIsGroupModalOpen(true)}
              className="w-full bg-accent hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Users size={18} />
              Manage Group
            </button>
          </div>

          {/* Biometric Settings Section (Mobile Only) */}
          {isMobileDevice() && (
            <BiometricSettings />
          )}

          {/* Clear Data Section */}
          <div className="bg-primary border border-red-500/30 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white mb-1">Clear All Data</h3>
                <p className="text-sm text-gray-400">
                  {isGroupOwner 
                    ? 'Delete ALL group data (all members\' accounts, trackables, activities, and trackers). This action cannot be undone.' 
                    : 'Delete all your personal bank accounts, trackables, activities, and trackers. This action cannot be undone.'}
                </p>
              </div>
            </div>

            {error && (
              <div className="mb-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{error}</p>
              </div>
            )}

            {group && !isGroupOwner ? (
              <div className="p-3 bg-orange-500/10 border border-orange-500/50 rounded-lg flex items-start gap-3">
                <Lock size={18} className="text-orange-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-medium text-orange-400">Group Member Restriction</p>
                  <p className="text-xs text-orange-300 mt-1">
                    Only the group owner can clear data. Leave the group first to clear your personal data.
                  </p>
                </div>
              </div>
            ) : (
              <>
                {!showConfirm ? (
                  <button
                    onClick={() => setShowConfirm(true)}
                    className="w-full bg-red-600 hover:bg-red-700 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    {isGroupOwner ? 'Delete All Group Data' : 'Clear All Data'}
                  </button>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-red-400 font-medium">
                      {isGroupOwner 
                        ? 'Delete ALL GROUP data from all members? This cannot be undone.' 
                        : 'Are you sure? This will permanently delete all your data.'}
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
              </>
            )}
          </div>
        </div>
      </div>
    </Modal>

    {/* Group Management Modal */}
    <GroupManagementModal
      isOpen={isGroupModalOpen}
      onClose={() => setIsGroupModalOpen(false)}
      onGroupUpdated={() => {
        // Optionally refresh or reload after group changes
      }}
    />
  </>
);
};
