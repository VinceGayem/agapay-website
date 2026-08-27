// ===== FIREBASE CONFIG =====
const firebaseConfig = {
  apiKey: "AIzaSyAX5VPul6wDfuZeOxiYq9iVWuCvjWaRcPs",
  authDomain: "agapay-mentorship.firebaseapp.com",
  databaseURL: "https://agapay-mentorship-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "agapay-mentorship",
  storageBucket: "agapay-mentorship.firebasestorage.app",
  messagingSenderId: "349570262243",
  appId: "1:349570262243:web:077db86c8ccb5014d591d6"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.database();

// ===== LOCAL CACHE =====
const DB = {
  mentees: {},
  admin: { user: 'admin', password: 'agapayadmin' },
  feedback: {},
  posts: {},
  sessions: {},
  tasks: {},
  taskAnswers: {},
  loggedUsers: {},
  adminInvites: {},
  adminInvitedUsers: {}
};

function objToArr(obj) {
  if (!obj) return [];
  return Object.entries(obj).map(([k, v]) => ({ ...v, _key: k })).reverse();
}

function getData(key) {
  return objToArr(DB[key]);
}

function getDataObj(key) {
  return DB[key] || {};
}

// ===== SECURITY =====
const Security = {
  escapeHtml(str) {
    if (!str) return '';
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  sanitizeInput(str, maxLen) {
    if (!str || typeof str !== 'string') return '';
    return str.trim().substring(0, maxLen || 500);
  },

  _rateLimits: {},
  canSubmit(action, cooldownMs) {
    const now = Date.now();
    const ms = cooldownMs || 2000;
    if (this._rateLimits[action] && now - this._rateLimits[action] < ms) {
      return false;
    }
    this._rateLimits[action] = now;
    return true;
  },

  isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  },

  isValidUsername(user) {
    return /^[a-z0-9_]{3,30}$/.test(user);
  }
};
