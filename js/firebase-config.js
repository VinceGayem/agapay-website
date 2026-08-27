// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyAX5VPul6wDfuZeOxiYq9iVWuCvjWaRcPs",
  authDomain: "agapay-mentorship.firebaseapp.com",
  databaseURL: "https://agapay-mentorship-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "agapay-mentorship",
  storageBucket: "agapay-mentorship.firebasestorage.app",
  messagingSenderId: "349570262243",
  appId: "1:349570262243:web:077db86c8ccb5014d591d6",
  measurementId: "G-120CMNNMLZ"
};

// Initialize Firebase (compat SDK - works with regular scripts)
firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== SECURITY UTILITIES =====
const Security = {
  // Sanitize HTML to prevent XSS
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  // Sanitize input - trim and limit length
  sanitizeInput(str, maxLen = 500) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().substring(0, maxLen);
  },

  // Rate limiter - prevents spam submissions
  _rateLimits: {},
  canSubmit(action, cooldownMs = 2000) {
    const now = Date.now();
    if (this._rateLimits[action] && now - this._rateLimits[action] < cooldownMs) {
      return false;
    }
    this._rateLimits[action] = now;
    return true;
  },

  // Validate email format
  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  // Validate username - alphanumeric only
  isValidUsername(user) {
    return /^[a-z0-9_]{3,30}$/.test(user);
  },

  // Generate CSRF-like token for admin actions
  _adminToken: null,
  generateAdminToken() {
    this._adminToken = Math.random().toString(36).substring(2) + Date.now().toString(36);
    return this._adminToken;
  },
  verifyAdminToken(token) {
    return this._adminToken === token;
  }
};
