import { useLayoutEffect, useState, useEffect } from 'react';

const STORAGE_PREFIX = 'lekalu_ui_state';

const buildStorageKey = (namespace, userId) => {
  if (!namespace || !userId) {
    return null;
  }

  return `${STORAGE_PREFIX}:${namespace}:${userId}`;
};

const readStoredValue = (storageKey, fallbackValue) => {
  if (!storageKey || typeof localStorage === 'undefined') {
    return fallbackValue;
  }

  try {
    const rawValue = localStorage.getItem(storageKey);
    if (rawValue == null) {
      return fallbackValue;
    }

    return JSON.parse(rawValue);
  } catch (error) {
    console.error(`Error reading persisted state for ${storageKey}:`, error);
    return fallbackValue;
  }
};

const writeStoredValue = (storageKey, value) => {
  if (!storageKey || typeof localStorage === 'undefined') {
    return;
  }

  try {
    localStorage.setItem(storageKey, JSON.stringify(value));
  } catch (error) {
    console.error(`Error saving persisted state for ${storageKey}:`, error);
  }
};

/**
 * Persist a small piece of user-specific UI state in localStorage.
 * @param {string} namespace - Stable key prefix for the state slice
 * @param {string|undefined} userId - Current user ID
 * @param {any} initialValue - Fallback value when nothing is stored yet
 * @returns {[any, Function]}
 */
export const usePersistentUserState = (namespace, userId, initialValue) => {
  const storageKey = buildStorageKey(namespace, userId);
  const [value, setValue] = useState(() => readStoredValue(storageKey, initialValue));

  useLayoutEffect(() => {
    setValue(readStoredValue(storageKey, initialValue));
  }, [storageKey, initialValue]);

  useLayoutEffect(() => {
    writeStoredValue(storageKey, value);
  }, [storageKey, value]);

  // Refresh state from localStorage when app becomes visible
  useEffect(() => {
    if (!storageKey) return;

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        // App became visible, refresh state from localStorage
        setValue(readStoredValue(storageKey, initialValue));
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [storageKey, initialValue]);

  return [value, setValue];
};