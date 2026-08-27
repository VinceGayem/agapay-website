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
