// ═══════════════════════════════════════════════════════════
// Curaah Recover — AES-256-GCM Encryption Utilities
// Privacy-by-design: client-side encryption for sensitive data
// ═══════════════════════════════════════════════════════════

/**
 * Derive a 256-bit AES key from a password using PBKDF2
 * @param {string} password - User's password or derived secret
 * @param {Uint8Array} salt - Random salt (16 bytes recommended)
 * @returns {Promise<CryptoKey>}
 */
export async function deriveKey(password, salt) {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt plaintext using AES-256-GCM
 * @param {string} plaintext - Text to encrypt
 * @param {string} password - Password to derive key from
 * @returns {Promise<string>} Base64 encoded: salt(16) + iv(12) + ciphertext
 */
export async function encrypt(plaintext, password) {
  const enc = new TextEncoder();
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveKey(password, salt);
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    enc.encode(plaintext)
  );
  // Concatenate: salt + iv + ciphertext
  const combined = new Uint8Array(salt.length + iv.length + ciphertext.byteLength);
  combined.set(salt, 0);
  combined.set(iv, salt.length);
  combined.set(new Uint8Array(ciphertext), salt.length + iv.length);
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt AES-256-GCM encrypted text
 * @param {string} encryptedBase64 - Base64 encoded encrypted data
 * @param {string} password - Password to derive key from
 * @returns {Promise<string>} Decrypted plaintext
 */
export async function decrypt(encryptedBase64, password) {
  const dec = new TextDecoder();
  const combined = Uint8Array.from(atob(encryptedBase64), c => c.charCodeAt(0));
  const salt = combined.slice(0, 16);
  const iv = combined.slice(16, 28);
  const ciphertext = combined.slice(28);
  const key = await deriveKey(password, salt);
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv },
    key,
    ciphertext
  );
  return dec.decode(plaintext);
}

/**
 * Hash a phone number using SHA-256 (one-way, for login lookup)
 * @param {string} phone - Phone number to hash
 * @returns {Promise<string>} Hex-encoded SHA-256 hash
 */
export async function hashPhone(phone) {
  const normalized = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+91/, '');
  const enc = new TextEncoder();
  const hash = await crypto.subtle.digest('SHA-256', enc.encode(normalized));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Mask a phone number for display: ****7890
 * @param {string} phone - Full phone number
 * @returns {string} Masked phone
 */
export function maskPhone(phone) {
  const clean = phone.replace(/[\s\-\(\)]/g, '').replace(/^\+91/, '');
  if (clean.length < 4) return '****';
  return '****' + clean.slice(-4);
}

/**
 * Generate a random device ID (used for auto-login)
 * @returns {string} 32-char hex string
 */
export function generateDeviceId() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}

/**
 * Get or create a persistent device ID
 * @returns {string}
 */
export function getDeviceId() {
  let id = localStorage.getItem('curaah_recover_device_id');
  if (!id) {
    id = generateDeviceId();
    localStorage.setItem('curaah_recover_device_id', id);
  }
  return id;
}
