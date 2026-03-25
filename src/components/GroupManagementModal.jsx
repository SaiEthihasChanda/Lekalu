import React, { useState, useEffect } from 'react';
import { Users, Plus, LogOut, Trash2, Copy, X, AlertTriangle, CheckCircle } from 'lucide-react';
import { Modal } from './Modal.jsx';
import { createGroup, joinGroup, leaveGroup, deleteGroup, getUserGroup, getUserId, getUserEmail, initializeAuth, migrateDataToGroup } from '../fb/index.js';

/**
 * Group Management Modal
 * @param {boolean} isOpen - Whether modal is open
 * @param {Function} onClose - Callback to close modal
 * @param {Function} onGroupUpdated - Callback after group update
 */
export const GroupManagementModal = ({ isOpen, onClose, onGroupUpdated }) => {
  const [group, setGroup] = useState(null);
  const [currentUserId, setCurrentUserId] = useState(null);
  const [memberEmails, setMemberEmails] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupCode, setGroupCode] = useState('');
  const [copiedCode, setCopiedCode] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showMigrationDialog, setShowMigrationDialog] = useState(false);
  const [migrationCounts, setMigrationCounts] = useState(null);
  const [isMigrating, setIsMigrating] = useState(false);

  // Load user's group and current user ID on mount
  useEffect(() => {
    const loadGroup = async () => {
      try {
        // Ensure auth is initialized
        await initializeAuth();
        
        const userId = getUserId();
        setCurrentUserId(userId);
        const userGroup = await getUserGroup();
        setGroup(userGroup);
        setShowMigrationDialog(false);
        setMigrationCounts(null);
      } catch (err) {
        console.error('Error loading group:', err);
      }
    };
    if (isOpen) {
      loadGroup();
    }
  }, [isOpen]);

  // Fetch member emails
  useEffect(() => {
    const fetchMemberEmails = async () => {
      if (!group?.members) return;
      
      const emails = {};
      for (const memberId of group.members) {
        try {
          const email = await getUserEmail(memberId);
          emails[memberId] = email || memberId; // Fallback to userId if email not found
        } catch (err) {
          console.error(`Error fetching email for ${memberId}:`, err);
          emails[memberId] = memberId; // Fallback to userId on error
        }
      }
      setMemberEmails(emails);
    };

    if (group) {
      fetchMemberEmails();
    }
  }, [group]);

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      setError('Please enter a group name');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const newGroup = await createGroup(groupName);
      setGroup(newGroup);
      setGroupName('');
      setShowCreateGroup(false);
      // Show migration dialog after successful group creation
      setShowMigrationDialog(true);
      setMigrationCounts(null);
    } catch (err) {
      setError(err.message || 'Failed to create group');
      setLoading(false);
    }
  };

  const handleMigrateData = async () => {
    setIsMigrating(true);
    try {
      const counts = await migrateDataToGroup(group.id);
      setMigrationCounts(counts);
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      setError(err.message || 'Failed to migrate data');
    } finally {
      setIsMigrating(false);
    }
  };

  const handleSkipMigration = () => {
    setShowMigrationDialog(false);
    setMigrationCounts(null);
    setLoading(false);
    if (onGroupUpdated) onGroupUpdated();
  };

  const handleJoinGroup = async () => {
    if (!groupCode.trim()) {
      setError('Please enter a group code');
      return;
    }

    setError('');
    setLoading(true);

    try {
      const joinedGroup = await joinGroup(groupCode);
      setGroup(joinedGroup);
      setGroupCode('');
      setShowJoinGroup(false);
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      setError(err.message || 'Failed to join group');
    } finally {
      setLoading(false);
    }
  };

  const handleLeaveGroup = async () => {
    setError('');
    setLoading(true);

    try {
      await leaveGroup();
      setGroup(null);
      setShowCreateGroup(false);
      setShowJoinGroup(false);
      setShowMigrationDialog(false);
      setMigrationCounts(null);
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      setError(err.message || 'Failed to leave group');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteGroup = async () => {
    setError('');
    setLoading(true);

    try {
      await deleteGroup();
      setGroup(null);
      setShowDeleteConfirm(false);
      setShowCreateGroup(false);
      setShowJoinGroup(false);
      setShowMigrationDialog(false);
      setMigrationCounts(null);
      if (onGroupUpdated) onGroupUpdated();
    } catch (err) {
      setError(err.message || 'Failed to delete group');
    } finally {
      setLoading(false);
    }
  };

  const copyGroupCode = () => {
    navigator.clipboard.writeText(group.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <Users size={24} className="text-accent" />
            <h2 className="text-2xl font-bold text-white">Group Management</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-700 rounded-lg transition-colors"
          >
            <X size={20} className="text-gray-400" />
          </button>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-4 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {/* Migration Dialog - Show on top of everything */}
        {showMigrationDialog && !migrationCounts && (
          <div className="mb-4 bg-blue-500/10 border border-blue-500/50 rounded-lg p-4 space-y-4">
            <div>
              <h4 className="font-semibold text-blue-400 mb-2">Migrate Your Data</h4>
              <p className="text-sm text-blue-300 mb-2">
                Would you like to migrate your existing data (activities, trackables, bank accounts, and tracked items) to this new group? All group members will have access to this data.
              </p>
              <p className="text-xs text-blue-300/70">
                You can always migrate data later from the group settings.
              </p>
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleSkipMigration}
                disabled={isMigrating}
                className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                Skip
              </button>
              <button
                onClick={handleMigrateData}
                disabled={isMigrating}
                className="flex-1 bg-accent hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
              >
                {isMigrating ? 'Migrating...' : 'Migrate Data'}
              </button>
            </div>
          </div>
        )}

        {/* Migration Success - Show on top of everything */}
        {showMigrationDialog && migrationCounts && (
          <div className="mb-4 bg-green-500/10 border border-green-500/50 rounded-lg p-4 space-y-4">
            <div className="flex items-start gap-3">
              <CheckCircle size={20} className="text-green-500 flex-shrink-0 mt-0.5" />
              <div>
                <h4 className="font-semibold text-green-400 mb-2">Data Migrated Successfully</h4>
                <div className="text-sm text-green-300 space-y-1">
                  {migrationCounts.activities > 0 && <p>• {migrationCounts.activities} activities</p>}
                  {migrationCounts.trackables > 0 && <p>• {migrationCounts.trackables} trackables</p>}
                  {migrationCounts.trackers > 0 && <p>• {migrationCounts.trackers} tracked items</p>}
                  {migrationCounts.banks > 0 && <p>• {migrationCounts.banks} bank accounts</p>}
                  {Object.values(migrationCounts).every(count => count === 0) && (
                    <p>• No data to migrate</p>
                  )}
                </div>
              </div>
            </div>
            <button
              onClick={() => {
                setShowMigrationDialog(false);
                setMigrationCounts(null);
                setLoading(false);
                if (onGroupUpdated) onGroupUpdated();
              }}
              className="w-full bg-accent hover:bg-blue-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              Done
            </button>
          </div>
        )}

        {/* Group Status */}
        {group ? (
          <div className="space-y-4">
            {/* Current Group Info */}
            <div className="bg-primary border border-green-500/30 rounded-lg p-4">
              <h3 className="font-semibold text-white mb-3">Current Group</h3>
              
              <div className="space-y-3 mb-4">
                <div>
                  <p className="text-xs text-gray-400">Group Name</p>
                  <p className="text-sm font-medium text-white">{group.name}</p>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Group Code</p>
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-mono font-semibold text-accent bg-primary/50 px-3 py-2 rounded">
                      {group.code}
                    </p>
                    <button
                      onClick={copyGroupCode}
                      className="p-2 hover:bg-gray-700 rounded transition-colors"
                      title="Copy code"
                    >
                      <Copy size={16} className="text-gray-400" />
                    </button>
                  </div>
                  {copiedCode && <p className="text-xs text-green-400">Copied!</p>}
                </div>

                <div>
                  <p className="text-xs text-gray-400">Members</p>
                  <div className="space-y-2">
                    {group.members?.map((memberId) => (
                      <div key={memberId} className="flex items-center gap-2">
                        <div className={`flex-1 text-sm px-3 py-2 rounded ${
                          group.owner === memberId 
                            ? 'bg-yellow-500/20 text-yellow-400 font-medium' 
                            : 'bg-primary/50 text-gray-300'
                        }`}>
                          {memberEmails[memberId] || memberId}
                          {group.owner === memberId && ' 👑'}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="text-xs text-gray-400">Your Role</p>
                  <p className="text-sm font-medium text-white">
                    {group.owner === currentUserId ? 'You are the owner' : 'You are a part of this group'}
                  </p>
                </div>
              </div>

              {/* Group Actions */}
              <div className="space-y-2">
                {group.owner === currentUserId ? (
                  <button
                    onClick={() => setShowDeleteConfirm(true)}
                    disabled={loading}
                    className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <Trash2 size={18} />
                    Delete Group
                  </button>
                ) : (
                  <button
                    onClick={handleLeaveGroup}
                    disabled={loading}
                    className="w-full bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                  >
                    <LogOut size={18} />
                    Leave Group
                  </button>
                )}
              </div>
            </div>

            {/* Delete Confirmation */}
            {showDeleteConfirm && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4">
                <div className="flex items-start gap-3 mb-4">
                  <AlertTriangle size={20} className="text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-red-400 mb-1">Delete Group?</h4>
                    <p className="text-sm text-red-300">
                      All members will be removed from the group. This cannot be undone.
                    </p>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowDeleteConfirm(false)}
                    disabled={loading}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteGroup}
                    disabled={loading}
                    className="flex-1 bg-red-600 hover:bg-red-700 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {loading ? 'Deleting...' : 'Delete'}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          // No Group - Show Create or Join Options
          <div className="space-y-3">
            {!showCreateGroup && !showJoinGroup ? (
              <>
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="w-full bg-accent hover:bg-blue-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Plus size={18} />
                  Create Group
                </button>
                <button
                  onClick={() => setShowJoinGroup(true)}
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2.5 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
                >
                  <Users size={18} />
                  Join Group
                </button>
              </>
            ) : null}

            {/* Create Group Form */}
            {showCreateGroup && !showMigrationDialog && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={groupName}
                  onChange={(e) => setGroupName(e.target.value)}
                  placeholder="Enter group name"
                  className="w-full bg-primary border border-gray-600 rounded-lg px-4 py-2 text-white text-sm focus:outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowCreateGroup(false);
                      setGroupName('');
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleCreateGroup}
                    disabled={loading}
                    className="flex-1 bg-accent hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {loading ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </div>
            )}

            {/* Join Group Form */}
            {showJoinGroup && (
              <div className="space-y-3">
                <input
                  type="text"
                  value={groupCode}
                  onChange={(e) => setGroupCode(e.target.value.slice(0, 6))}
                  placeholder="Enter 6-digit code"
                  maxLength="6"
                  className="w-full bg-primary border border-gray-600 rounded-lg px-4 py-2 text-white text-sm font-mono text-center focus:outline-none focus:border-accent"
                />
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      setShowJoinGroup(false);
                      setGroupCode('');
                    }}
                    className="flex-1 bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleJoinGroup}
                    disabled={loading}
                    className="flex-1 bg-accent hover:bg-blue-600 disabled:opacity-50 text-white font-medium py-2 px-4 rounded-lg transition-colors"
                  >
                    {loading ? 'Joining...' : 'Join'}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info Text */}
        <div className="mt-4 p-3 bg-blue-500/10 border border-blue-500/30 rounded-lg">
          <p className="text-xs text-blue-300">
            💡 Groups allow you to share expenses with others. All data will be visible to group members.
            Leaving or deleting a group will restore your personal data.
          </p>
        </div>
      </div>
    </Modal>
  );
};
