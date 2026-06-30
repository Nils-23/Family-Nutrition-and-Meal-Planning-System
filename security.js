// ============================================================================
// security.js — Data Integrity & System Security utilities
// ----------------------------------------------------------------------------
// Provides password encryption (SHA-256 with a per-user random salt) and basic
// input sanitisation helpers. Passwords are NEVER stored or compared in plain
// text: only the salted hash and the salt are persisted in Firestore, so even a
// full database read cannot reveal a user's password.
// ============================================================================

/**
 * Generate a cryptographically-random salt as a hex string.
 * @param {number} byteLen number of random bytes (default 16 = 128 bits)
 */
export function generateSalt(byteLen = 16) {
  const bytes = new Uint8Array(byteLen);
  crypto.getRandomValues(bytes);
  return bytesToHex(bytes);
}

/**
 * Hash a password with its salt using SHA-256 (Web Crypto API).
 * Returns the digest as a lowercase hex string.
 */
export async function hashPassword(password, salt) {
  const encoded = new TextEncoder().encode(`${salt}::${password}`);
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return bytesToHex(new Uint8Array(digest));
}

/**
 * Verify a candidate password against a stored salt + hash.
 * Uses a length-safe, constant-time comparison to resist timing attacks.
 */
export async function verifyPassword(password, salt, expectedHash) {
  if (typeof salt !== 'string' || typeof expectedHash !== 'string') return false;
  const actual = await hashPassword(password, salt);
  if (actual.length !== expectedHash.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) {
    diff |= actual.charCodeAt(i) ^ expectedHash.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Sanitise free-text input before storing it: enforce a type, strip angle
 * brackets (mitigates HTML/script injection), trim, and cap the length
 * (mitigates oversized-payload / storage-bloat attacks).
 */
export function sanitizeText(value, maxLen = 100) {
  if (typeof value !== 'string') return '';
  return value.replace(/[<>]/g, '').trim().slice(0, maxLen);
}

/**
 * Escape a value for safe insertion into innerHTML.
 */
export function escapeHTML(value) {
  if (value == null) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

// --- internal helper -------------------------------------------------------
function bytesToHex(bytes) {
  return Array.from(bytes).map(b => b.toString(16).padStart(2, '0')).join('');
}
