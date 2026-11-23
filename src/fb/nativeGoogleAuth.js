/**
 * Bridge to native "Sign in with Google" in the Android app (window.LekaluAuth).
 * Google blocks OAuth popups inside WebViews, so the app shell shows the system account picker
 * and returns a Google ID token, which Firebase Auth then signs in with.
 */

const bridge = () => (typeof window === 'undefined' ? undefined : window.LekaluAuth);

export const hasNativeGoogleAuth = () => {
  try {
    return Boolean(bridge()?.isAvailable());
  } catch {
    return false;
  }
};

const ERROR_CODES = {
  cancelled: 'auth/popup-closed-by-user',
  'no-account': 'auth/native-no-account',
};

/** Opens the native account picker and resolves with a Google ID token. */
export const getNativeGoogleIdToken = () => new Promise((resolve, reject) => {
  const requestId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;

  const onResult = (event) => {
    const detail = event.detail || {};
    if (detail.requestId !== requestId) return;
    window.removeEventListener('lekalu-auth', onResult);

    if (detail.idToken) {
      resolve(detail.idToken);
      return;
    }
    const error = new Error(detail.message || 'Google sign-in failed.');
    error.code = ERROR_CODES[detail.error] || 'auth/native-google-failed';
    reject(error);
  };

  window.addEventListener('lekalu-auth', onResult);
  try {
    bridge().signIn(requestId);
  } catch (error) {
    window.removeEventListener('lekalu-auth', onResult);
    reject(error);
  }
});

/** Forget the chosen Google account so the next sign-in shows the picker again. */
export const clearNativeGoogleAuth = () => {
  try {
    bridge()?.signOut();
  } catch {
    // Not in the Android app
  }
};
