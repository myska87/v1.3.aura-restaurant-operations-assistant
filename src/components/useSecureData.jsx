import { useState, useCallback } from 'react';
import { encryptData, decryptData, tokeniseLocation } from './encryption';

/**
 * React Hook for secure data handling with automatic encryption
 * Prevents accidental plain-text writes and enforces GDPR compliance
 */
export function useSecureData(initialData = {}, options = {}) {
  const {
    encryptFields = [], // Fields to encrypt
    tokeniseGPS = false, // Whether to tokenise GPS data
  } = options;

  const [data, setData] = useState(initialData);
  const [isEncrypting, setIsEncrypting] = useState(false);
  const [error, setError] = useState(null);

  /**
   * Encrypt sensitive fields before saving
   */
  const encryptSensitiveFields = useCallback(async (dataToEncrypt) => {
    if (!dataToEncrypt || encryptFields.length === 0) {
      return dataToEncrypt;
    }

    setIsEncrypting(true);
    setError(null);

    try {
      const encrypted = { ...dataToEncrypt };

      // Encrypt each specified field
      for (const field of encryptFields) {
        if (encrypted[field] && typeof encrypted[field] === 'string') {
          encrypted[field] = await encryptData(encrypted[field]);
          encrypted[`${field}_encrypted`] = true; // Mark as encrypted
        }
      }

      // Tokenise GPS if needed
      if (tokeniseGPS) {
        if (encrypted.clock_in_location) {
          encrypted.clock_in_location = await tokeniseLocation(
            encrypted.clock_in_location.latitude,
            encrypted.clock_in_location.longitude
          );
        }
        if (encrypted.clock_out_location) {
          encrypted.clock_out_location = await tokeniseLocation(
            encrypted.clock_out_location.latitude,
            encrypted.clock_out_location.longitude
          );
        }
      }

      setIsEncrypting(false);
      return encrypted;
    } catch (err) {
      setError(err);
      setIsEncrypting(false);
      console.error('🔒 Encryption error:', err);
      throw new Error('Data encryption failed - cannot save insecurely');
    }
  }, [encryptFields, tokeniseGPS]);

  /**
   * Decrypt sensitive fields after loading
   */
  const decryptSensitiveFields = useCallback(async (dataToDecrypt) => {
    if (!dataToDecrypt || encryptFields.length === 0) {
      return dataToDecrypt;
    }

    try {
      const decrypted = { ...dataToDecrypt };

      // Decrypt each specified field
      for (const field of encryptFields) {
        if (decrypted[`${field}_encrypted`] && decrypted[field]) {
          decrypted[field] = await decryptData(decrypted[field]);
        }
      }

      return decrypted;
    } catch (err) {
      console.error('🔓 Decryption error:', err);
      return dataToDecrypt; // Return encrypted data if decryption fails
    }
  }, [encryptFields]);

  /**
   * Secure save function
   */
  const secureSave = useCallback(async (dataToSave) => {
    // Validate that sensitive fields are not plain text
    for (const field of encryptFields) {
      if (dataToSave[field] && !dataToSave[`${field}_encrypted`]) {
        console.warn(`⚠️ Field "${field}" should be encrypted before saving`);
      }
    }

    return await encryptSensitiveFields(dataToSave);
  }, [encryptSensitiveFields, encryptFields]);

  /**
   * Secure load function
   */
  const secureLoad = useCallback(async (dataToLoad) => {
    return await decryptSensitiveFields(dataToLoad);
  }, [decryptSensitiveFields]);

  /**
   * Update data with automatic encryption
   */
  const secureSetData = useCallback(async (newData) => {
    const encrypted = await encryptSensitiveFields(newData);
    setData(encrypted);
    return encrypted;
  }, [encryptSensitiveFields]);

  return {
    data,
    setData: secureSetData,
    secureSave,
    secureLoad,
    isEncrypting,
    error,
    encryptSensitiveFields,
    decryptSensitiveFields
  };
}