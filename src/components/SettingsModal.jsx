import React, { useState, useEffect, useRef } from 'react';
import { Settings, AlertTriangle, Trash2, X, Users, Lock, ShieldCheck, ExternalLink } from 'lucide-react';
import { deleteAllUserData, getUserId, initializeAuth, saveAnalyticsConfig, getAnalyticsConfig, saveThemePreference, getThemePreference } from '../fb/index.js';
import { useAuth } from '../contexts/AuthContext.jsx';
import { Modal } from './Modal.jsx';
import { GroupManagementModal } from './GroupManagementModal.jsx';
import { BiometricSettings } from './BiometricAuth.jsx';
import { AnalyticsDisplaySettings } from './AnalyticsDisplaySettings.jsx';
import { isMobileDevice, registerBiometric } from '../utils/webauthn.js';
import { DEFAULT_THEME, applyTheme, normalizeTheme, resolveThemePalette } from '../utils/theme.js';

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
  const [isBiometricRegistering, setIsBiometricRegistering] = useState(false);
  const [biometricError, setBiometricError] = useState('');
  const [biometricSuccess, setBiometricSuccess] = useState('');
  const [refreshKey, setRefreshKey] = useState(0);
  const [analyticsConfig, setAnalyticsConfig] = useState(null);
  const [isLoadingAnalyticsConfig, setIsLoadingAnalyticsConfig] = useState(false);
  const [isSavingAnalyticsConfig, setIsSavingAnalyticsConfig] = useState(false);
  const [analyticsConfigError, setAnalyticsConfigError] = useState('');
  const [analyticsConfigSuccess, setAnalyticsConfigSuccess] = useState('');
  const [themeDraft, setThemeDraft] = useState(DEFAULT_THEME);
  const [isSavingTheme, setIsSavingTheme] = useState(false);
  const [themeError, setThemeError] = useState('');
  const [themeSuccess, setThemeSuccess] = useState('');
  const { group, user } = useAuth();
  const isGroupOwner = group && user && group.owner === user.uid;
  const themeDraftRef = useRef(DEFAULT_THEME);

  useEffect(() => {
    themeDraftRef.current = themeDraft;
  }, [themeDraft]);

  // Load analytics config on mount
  useEffect(() => {
    const loadConfig = async () => {
      setIsLoadingAnalyticsConfig(true);
      try {
        const [config, theme] = await Promise.all([
          getAnalyticsConfig(user?.uid),
          getThemePreference(user?.uid),
        ]);
        setAnalyticsConfig(config);
        const normalizedTheme = normalizeTheme(theme);
        setThemeDraft(normalizedTheme);
        applyTheme(normalizedTheme);
      } catch (err) {
        console.error('Error loading analytics config:', err);
        setAnalyticsConfigError('Failed to load analytics configuration');
      } finally {
        setIsLoadingAnalyticsConfig(false);
      }
    };

    if (isOpen && user) {
      loadConfig();
    }
  }, [isOpen, user]);

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

  const handleBiometricRegister = async () => {
    setBiometricError('');
    setBiometricSuccess('');
    setIsBiometricRegistering(true);

    try {
      if (!user) {
        throw new Error('User not authenticated');
      }

      console.log('[Biometric] Starting registration for user:', user.uid);

      // Register biometric
      const credential = await registerBiometric(user.uid, user.email);
      console.log('[Biometric] Registration successful:', credential);

      // Serialize credential to store it
      const credentialData = {
        id: credential.id,
        rawId: Array.from(new Uint8Array(credential.rawId)),
        response: {
          clientDataJSON: Array.from(new Uint8Array(credential.response.clientDataJSON)),
          attestationObject: Array.from(new Uint8Array(credential.response.attestationObject)),
        },
        type: credential.type,
        deviceName: `Device registered on ${new Date().toLocaleDateString()}`,
        registeredAt: new Date().getTime(),
      };

      // Store in localStorage (keyed by userId)
      const existingCredentials = JSON.parse(
        localStorage.getItem(`biometricCredentials_${user.uid}`) || '[]'
      );
      existingCredentials.push(credentialData);
      localStorage.setItem(
        `biometricCredentials_${user.uid}`,
        JSON.stringify(existingCredentials)
      );

      console.log('[Biometric] Stored credential to localStorage');
      console.log('[Biometric] Storage key:', `biometricCredentials_${user.uid}`);
      console.log('[Biometric] All stored credentials:', existingCredentials);
      console.log('[Biometric] Verify localStorage has it:', localStorage.getItem(`biometricCredentials_${user.uid}`));
      setBiometricSuccess('Biometric registered successfully! Next login will require verification.');
      setRefreshKey(prev => prev + 1);
      
      // Clear success message after 3 seconds
      setTimeout(() => setBiometricSuccess(''), 3000);
    } catch (err) {
      const errorMessage = err.message || 'Failed to register biometric';
      console.error('[Biometric] Registration error:', err);
      setBiometricError(errorMessage);
    } finally {
      setIsBiometricRegistering(false);
    }
  };

  const handleBiometricRemove = (credentialId) => {
    if (!user) return;

    try {
      const credentials = JSON.parse(
        localStorage.getItem(`biometricCredentials_${user.uid}`) || '[]'
      );
      const filtered = credentials.filter(cred => cred.id !== credentialId);
      localStorage.setItem(
        `biometricCredentials_${user.uid}`,
        JSON.stringify(filtered)
      );
      setBiometricSuccess('Biometric device removed successfully.');
      setRefreshKey(prev => prev + 1);
      setTimeout(() => setBiometricSuccess(''), 3000);
    } catch (err) {
      setBiometricError('Failed to remove biometric device.');
      console.error('[Biometric] Remove error:', err);
    }
  };

  // Handle analytics config changes
  const handleAnalyticsConfigChange = async (newConfig) => {
    setAnalyticsConfig(newConfig);
    setIsSavingAnalyticsConfig(true);
    setAnalyticsConfigError('');
    setAnalyticsConfigSuccess('');

    try {
      await saveAnalyticsConfig(newConfig, user?.uid);
      setAnalyticsConfigSuccess('Analytics configuration saved successfully!');
      setTimeout(() => setAnalyticsConfigSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving analytics config:', err);
      setAnalyticsConfigError('Failed to save analytics configuration');
    } finally {
      setIsSavingAnalyticsConfig(false);
    }
  };

  const persistTheme = async (nextTheme, successMessage) => {
    setThemeError('');
    setThemeSuccess('');
    setIsSavingTheme(true);

    applyTheme(nextTheme);

    try {
      await saveThemePreference(nextTheme, user?.uid);
      setThemeSuccess(successMessage);
      setTimeout(() => setThemeSuccess(''), 3000);
    } catch (err) {
      console.error('Error saving theme preference:', err);
      setThemeError('Failed to save theme preference');
    } finally {
      setIsSavingTheme(false);
    }
  };

  const handleThemeColorChange = (field, value) => {
    const currentTheme = themeDraftRef.current;
    const nextTheme = {
      mode: 'custom',
      background: field === 'background' ? value : currentTheme.background,
      foreground: field === 'foreground' ? value : currentTheme.foreground,
    };

    themeDraftRef.current = nextTheme;
    setThemeDraft(nextTheme);
    persistTheme(nextTheme, 'Theme palette saved successfully!');
  };

  const handleThemeReset = () => {
    themeDraftRef.current = DEFAULT_THEME;
    setThemeDraft(DEFAULT_THEME);
    persistTheme(DEFAULT_THEME, 'Default theme restored successfully!');
  };

  const themePalette = resolveThemePalette(themeDraft);
  const isDefaultTheme =
    themeDraft.preset === DEFAULT_THEME.preset &&
    themeDraft.background?.toUpperCase() === DEFAULT_THEME.background.toUpperCase() &&
    themeDraft.foreground?.toUpperCase() === DEFAULT_THEME.foreground.toUpperCase();

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
              className="w-full bg-accent hover:bg-accent/90 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <Users size={18} />
              Manage Group
            </button>
          </div>

          {/* Biometric Settings Section (Mobile Only) */}
          {isMobileDevice() && (
            <>
              <BiometricSettings
                key={refreshKey}
                credentials={user ? JSON.parse(localStorage.getItem(`biometricCredentials_${user.uid}`) || '[]') : []}
                onRegister={handleBiometricRegister}
                onRemove={handleBiometricRemove}
                isLoading={isBiometricRegistering}
              />
              {biometricError && (
                <div className="p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                  <p className="text-red-400 text-sm">{biometricError}</p>
                </div>
              )}
              {biometricSuccess && (
                <div className="p-3 bg-green-500/10 border border-green-500/50 rounded-lg">
                  <p className="text-green-400 text-sm">{biometricSuccess}</p>
                </div>
              )}
            </>
          )}

          {/* Theme Section */}
          <div className="bg-primary border border-accent/30 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <div
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-700 flex-shrink-0 mt-0.5 overflow-hidden"
                style={{ backgroundColor: `rgb(${themePalette.baseBackground})` }}
              >
                <div
                  className="h-5 w-5 rounded-md border border-white/20"
                  style={{ backgroundColor: `rgb(${themePalette.baseForeground})` }}
                />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold text-white mb-1">Theme</h3>
                  <span className="rounded-full border border-gray-600 bg-secondary px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-gray-300">
                    {isDefaultTheme ? 'Default' : 'Custom'}
                  </span>
                </div>
                <p className="text-sm text-gray-400">
                  Pick a background and foreground color with the wheel to shape the whole app.
                </p>
              </div>
            </div>

            <div className="mb-4 rounded-xl border border-gray-700 bg-secondary p-3">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-lg border border-white/10 p-3" style={{ backgroundColor: `rgb(${themePalette.primary})` }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Background</p>
                  <p className="mt-8 text-xs text-white/80">{themeDraft.background}</p>
                </div>
                <div className="rounded-lg border border-white/10 p-3" style={{ backgroundColor: `rgb(${themePalette.secondary})` }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Foreground</p>
                  <p className="mt-8 text-xs text-white/80">{themeDraft.foreground}</p>
                </div>
                <div className="rounded-lg border border-white/10 p-3" style={{ backgroundColor: `rgb(${themePalette.accent})` }}>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-white/70">Accent</p>
                  <p className="mt-8 text-xs text-white/80">Auto</p>
                </div>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <label className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">Background color</span>
                  <span className="font-mono text-xs uppercase text-gray-400">{themeDraft.background}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-secondary/90 p-2">
                  <input
                    type="color"
                    value={themeDraft.background}
                    onChange={(event) => handleThemeColorChange('background', event.target.value)}
                    className="h-12 w-14 cursor-pointer rounded-lg border border-gray-600 bg-transparent p-1"
                    aria-label="Background color"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">Main shell tone</p>
                    <p className="text-xs text-gray-400">Drives the app background and shell surfaces.</p>
                  </div>
                </div>
              </label>

              <label className="space-y-2">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-medium text-white">Foreground color</span>
                  <span className="font-mono text-xs uppercase text-gray-400">{themeDraft.foreground}</span>
                </div>
                <div className="flex items-center gap-3 rounded-xl border border-gray-700 bg-secondary/90 p-2">
                  <input
                    type="color"
                    value={themeDraft.foreground}
                    onChange={(event) => handleThemeColorChange('foreground', event.target.value)}
                    className="h-12 w-14 cursor-pointer rounded-lg border border-gray-600 bg-transparent p-1"
                    aria-label="Foreground color"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-white">Card and sidebar tone</p>
                    <p className="text-xs text-gray-400">Keeps the app in a distinct second tone.</p>
                  </div>
                </div>
              </label>
            </div>

            <div className="mt-3 flex items-center justify-between gap-3">
              <button
                type="button"
                onClick={handleThemeReset}
                className="text-xs font-medium text-gray-400 transition-colors hover:text-accent"
              >
                Reset background and foreground
              </button>
              <p className="text-xs text-gray-500">
                {isSavingTheme ? 'Saving theme...' : 'Changes are applied live.'}
              </p>
            </div>

            {themeError && (
              <div className="mt-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                <p className="text-red-400 text-sm">{themeError}</p>
              </div>
            )}

            {themeSuccess && (
              <div className="mt-3 p-3 bg-green-500/10 border border-green-500/50 rounded-lg">
                <p className="text-green-400 text-sm">{themeSuccess}</p>
              </div>
            )}
          </div>

          {/* Analytics Display Settings Section */}
          <div className="bg-primary border border-accent/30 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <Settings size={20} className="text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white mb-1">Analytics Display</h3>
                <p className="text-sm text-gray-400">
                  Customize which visualizations appear in your analytics dashboard
                </p>
              </div>
            </div>

            {isLoadingAnalyticsConfig ? (
              <p className="text-gray-400 text-sm text-center py-4">Loading configuration...</p>
            ) : analyticsConfig ? (
              <>
                <AnalyticsDisplaySettings
                  config={analyticsConfig}
                  onConfigChange={handleAnalyticsConfigChange}
                  isLoading={isSavingAnalyticsConfig}
                />
                {analyticsConfigError && (
                  <div className="mt-3 p-3 bg-red-500/10 border border-red-500/50 rounded-lg">
                    <p className="text-red-400 text-sm">{analyticsConfigError}</p>
                  </div>
                )}
                {analyticsConfigSuccess && (
                  <div className="mt-3 p-3 bg-green-500/10 border border-green-500/50 rounded-lg">
                    <p className="text-green-400 text-sm">{analyticsConfigSuccess}</p>
                  </div>
                )}
              </>
            ) : null}
          </div>

          {/* Privacy Policy Section */}
          <div className="bg-primary border border-accent/30 rounded-lg p-4">
            <div className="flex items-start gap-3 mb-4">
              <ShieldCheck size={20} className="text-accent flex-shrink-0 mt-0.5" />
              <div className="flex-1 min-w-0">
                <h3 className="font-semibold text-white mb-1">Privacy Policy</h3>
                <p className="text-sm text-gray-400">
                  Review how Lekalu handles account, expense, and app data.
                </p>
              </div>
            </div>

            <a
              href="/privacy.html"
              target="_blank"
              rel="noreferrer"
              className="w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={18} />
              Open Privacy Policy
            </a>

            <a
              href="/account-deletion.html"
              target="_blank"
              rel="noreferrer"
              className="mt-2 w-full bg-gray-700 hover:bg-gray-600 text-white font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <ExternalLink size={18} />
              Account Deletion Request
            </a>
          </div>

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
