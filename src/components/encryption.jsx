/**
 * Client-side encryption utilities for GDPR compliance
 * Note: For production, encryption keys should be managed server-side
 */

const ENCRYPTION_KEY_STORAGE = 'aura_encryption_key';
const KEY_ROTATION_DAYS = 90;

/**
 * Generate encryption key (in production, this should be server-side)
 */
function generateEncryptionKey() {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create encryption key
 */
export function getEncryptionKey() {
  const stored = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
  
  if (stored) {
    const keyData = JSON.parse(stored);
    const daysSinceRotation = (Date.now() - keyData.created) / (1000 * 60 * 60 * 24);
    
    // Check if key needs rotation
    if (daysSinceRotation < KEY_ROTATION_DAYS) {
      return keyData.key;
    }
    
    console.warn('🔄 Encryption key expired, rotating...');
  }
  
  // Generate new key
  const newKey = generateEncryptionKey();
  localStorage.setItem(ENCRYPTION_KEY_STORAGE, JSON.stringify({
    key: newKey,
    created: Date.now(),
    rotated: Date.now()
  }));
  
  return newKey;
}

/**
 * Simple encryption using Web Crypto API
 * In production, use AES-256-GCM on server side
 */
export async function encryptData(plaintext) {
  if (!plaintext || plaintext === '') return plaintext;
  
  try {
    // Convert string to bytes
    const encoder = new TextEncoder();
    const data = encoder.encode(plaintext);
    
    // Generate IV
    const iv = crypto.getRandomValues(new Uint8Array(12));
    
    // Get key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(getEncryptionKey().substring(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['encrypt']
    );
    
    // Encrypt
    const encrypted = await crypto.subtle.encrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      data
    );
    
    // Combine IV + encrypted data
    const combined = new Uint8Array(iv.length + encrypted.byteLength);
    combined.set(iv);
    combined.set(new Uint8Array(encrypted), iv.length);
    
    // Return as base64
    return btoa(String.fromCharCode(...combined));
  } catch (error) {
    console.error('Encryption failed:', error);
    return plaintext; // Fallback to plaintext if encryption fails
  }
}

/**
 * Decrypt data
 */
export async function decryptData(encrypted) {
  if (!encrypted || encrypted === '') return encrypted;
  
  try {
    // Decode base64
    const combined = new Uint8Array(
      atob(encrypted).split('').map(char => char.charCodeAt(0))
    );
    
    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const data = combined.slice(12);
    
    // Get key
    const keyMaterial = await crypto.subtle.importKey(
      'raw',
      new TextEncoder().encode(getEncryptionKey().substring(0, 32)),
      { name: 'AES-GCM' },
      false,
      ['decrypt']
    );
    
    // Decrypt
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv },
      keyMaterial,
      data
    );
    
    // Convert bytes to string
    const decoder = new TextDecoder();
    return decoder.decode(decrypted);
  } catch (error) {
    console.error('Decryption failed:', error);
    return encrypted; // Return encrypted value if decryption fails
  }
}

/**
 * Hash sensitive data (one-way, for anonymisation)
 */
export async function hashData(data) {
  if (!data) return data;
  
  const encoder = new TextEncoder();
  const dataBuffer = encoder.encode(data);
  const hashBuffer = await crypto.subtle.digest('SHA-256', dataBuffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Tokenise GPS coordinates
 */
export async function tokeniseLocation(latitude, longitude) {
  if (!latitude || !longitude) return null;
  
  const locationString = `${latitude},${longitude}`;
  const token = await hashData(locationString);
  
  return {
    token: token.substring(0, 16), // Use first 16 chars
    precision_level: 'tokenised', // Indicate this is tokenised
    approximate_area: getApproximateArea(latitude, longitude)
  };
}

/**
 * Get approximate area (city-level) instead of exact coordinates
 */
function getApproximateArea(lat, lng) {
  // Round to 2 decimal places = ~1km precision
  const roundedLat = Math.round(lat * 100) / 100;
  const roundedLng = Math.round(lng * 100) / 100;
  return `Area_${roundedLat}_${roundedLng}`;
}

/**
 * Anonymise user data (for GDPR Right to Erasure)
 */
export async function anonymiseUserData(userData) {
  const anonymised = { ...userData };
  
  // Replace PII with hashed values
  if (anonymised.full_name) {
    anonymised.full_name = `DELETED_USER_${await hashData(anonymised.email).then(h => h.substring(0, 8))}`;
  }
  
  if (anonymised.email) {
    anonymised.email = `deleted_${await hashData(anonymised.email).then(h => h.substring(0, 16))}@anonymised.local`;
  }
  
  if (anonymised.phone) {
    anonymised.phone = 'DELETED';
  }
  
  if (anonymised.photo_url) {
    anonymised.photo_url = null;
  }
  
  if (anonymised.emergency_contact) {
    anonymised.emergency_contact = 'DELETED';
  }
  
  // Mark as anonymised
  anonymised.anonymised = true;
  anonymised.anonymised_at = new Date().toISOString();
  
  return anonymised;
}

/**
 * Check if encryption key needs rotation
 */
export function checkKeyRotation() {
  const stored = localStorage.getItem(ENCRYPTION_KEY_STORAGE);
  if (!stored) return { needsRotation: false, daysUntilRotation: KEY_ROTATION_DAYS, lastRotation: new Date().toISOString() };
  
  const keyData = JSON.parse(stored);
  const daysSinceRotation = (Date.now() - keyData.created) / (1000 * 60 * 60 * 24);
  const daysUntilRotation = KEY_ROTATION_DAYS - daysSinceRotation;
  
  return {
    needsRotation: daysSinceRotation >= KEY_ROTATION_DAYS,
    daysUntilRotation: Math.max(0, Math.ceil(daysUntilRotation)),
    lastRotation: new Date(keyData.rotated).toISOString()
  };
}