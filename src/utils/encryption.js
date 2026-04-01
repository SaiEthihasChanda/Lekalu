import CryptoJS from 'crypto-js';

/**
 * Encryption utility for end-to-end encryption of user data
 * Data is encrypted on the client before sending to Firebase
 * Only the client can decrypt using the user's password/key
 */

/**
 * Generate encryption key from user ID, group ID, and optional password
 * @param {string} userId - User's Firebase UID
 * @param {string} groupId - Optional group ID (if in a group, use this for encryption)
 * @param {string} password - Optional password (defaults to userId or groupId)
 * @returns {string} Encryption key
 */
export const generateEncryptionKey = (userId, groupId = null, password = '') => {
  // If in a group, use group ID for key generation so all members use same key
  // This allows group members to decrypt each other's data
  const keySource = groupId || userId;
  const key = `${keySource}:${password || keySource}`;
  return CryptoJS.SHA256(key).toString();
};

/**
 * Encrypt data object for storage in Firebase
 * Sensitive fields are encrypted, structural fields remain for queries
 * @param {Object} data - Data to encrypt
 * @param {string} encryptionKey - Encryption key
 * @returns {Object} Data with encrypted sensitive fields
 */
export const encryptData = (data, encryptionKey) => {
  try {
    // Fields to encrypt (sensitive user data)
    const sensitiveFields = [
      'cardName',
      'accountNumber',
      'name',
      'amount',
      'description',
      'type',
      'includeInTracker',
      'trackerAmount',
      'isDone',
      'completedAt',
    ];

    // Create encrypted copy
    const encrypted = { ...data };

    // Encrypt each sensitive field
    sensitiveFields.forEach((field) => {
      if (encrypted.hasOwnProperty(field) && encrypted[field] != null) {
        const value = encrypted[field];
        // Encrypt the field value as JSON
        const jsonString = JSON.stringify(value);
        encrypted[field] = CryptoJS.AES.encrypt(jsonString, encryptionKey).toString();
        // Mark as encrypted
        encrypted[`_encrypted_${field}`] = true;
      }
    });

    return encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw error;
  }
};

/**
 * Decrypt data object retrieved from Firebase
 * @param {Object} data - Encrypted data from Firebase
 * @param {string} encryptionKey - Encryption key
 * @returns {Object} Decrypted data
 */
export const decryptData = (data, encryptionKey) => {
  try {
    // Create decrypted copy
    const decrypted = { ...data };

    // Find all encrypted fields and decrypt them
    Object.keys(data).forEach((key) => {
      if (key.startsWith('_encrypted_')) {
        const fieldName = key.replace('_encrypted_', '');
        if (decrypted.hasOwnProperty(fieldName) && decrypted[fieldName]) {
          try {
            // Decrypt the field value
            const decryptedBytes = CryptoJS.AES.decrypt(decrypted[fieldName], encryptionKey);
            const decryptedString = decryptedBytes.toString(CryptoJS.enc.Utf8);
            // Parse JSON value
            decrypted[fieldName] = JSON.parse(decryptedString);
          } catch (err) {
            // Silently fail: set corrupted field to null
            decrypted[fieldName] = null;
          }
        }
        // Remove the encryption marker
        delete decrypted[key];
      }
    });

    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw error;
  }
};

/**
 * Encrypt array of data objects
 * @param {Array} dataArray - Array of data objects
 * @param {string} encryptionKey - Encryption key
 * @returns {Array} Array of encrypted data objects
 */
export const encryptDataArray = (dataArray, encryptionKey) => {
  return dataArray.map((item) => encryptData(item, encryptionKey));
};

/**
 * Decrypt array of data objects
 * @param {Array} dataArray - Array of encrypted data objects
 * @param {string} encryptionKey - Encryption key
 * @returns {Array} Array of decrypted data objects
 */
export const decryptDataArray = (dataArray, encryptionKey) => {
  return dataArray.map((item) => decryptData(item, encryptionKey));
};
