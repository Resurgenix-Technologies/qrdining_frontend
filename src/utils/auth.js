// ─── Crypto Utilities for Client-Side Auth ───
// NOTE: True security requires a backend. This provides client-side
// hashing and session management as the frontend security layer.

// SHA-256 hash using Web Crypto API
export function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
