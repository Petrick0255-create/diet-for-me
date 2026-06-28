/* firebase.js
   Firebase 로그인 / Firestore 동기화 담당
*/

import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";

import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";

import {
  getFirestore,
  doc,
  setDoc,
  getDoc,
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBwAA3jUPVQMMR61QSAM4-z7G24u4HrAT8",
  authDomain: "diet-for-me-a8b33.firebaseapp.com",
  projectId: "diet-for-me-a8b33",
  storageBucket: "diet-for-me-a8b33.firebasestorage.app",
  messagingSenderId: "766739395332",
  appId: "1:766739395332:web:624056073881ecb80bd651"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const provider = new GoogleAuthProvider();

let currentUser = null;
let unsubscribeSnapshot = null;

export function getCurrentUser() {
  return currentUser;
}

export function listenAuth(callback) {
  return onAuthStateChanged(auth, user => {
    currentUser = user;
    callback(user);
  });
}

export async function loginGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);
    alert(error.code + "\n\n" + error.message);
  }
}

export async function logoutGoogle() {
  await signOut(auth);
}

export function getUserDocRef(userId) {
  return doc(db, "foodAccounts", userId);
}

export async function loadCloudState(userId) {
  const ref = getUserDocRef(userId);
  const snap = await getDoc(ref);

  if (!snap.exists()) return null;

  return snap.data().state || null;
}

export async function saveCloudState(userId, state) {
  const ref = getUserDocRef(userId);

  await setDoc(ref, {
    state,
    updatedAt: Date.now()
  });
}

export function startCloudSync(userId, onStateLoaded) {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }

  const ref = getUserDocRef(userId);

  unsubscribeSnapshot = onSnapshot(ref, snap => {
    if (!snap.exists()) return;

    const cloud = snap.data();

    if (cloud.state) {
      onStateLoaded(cloud.state);
    }
  });

  return unsubscribeSnapshot;
}

export function stopCloudSync() {
  if (unsubscribeSnapshot) {
    unsubscribeSnapshot();
    unsubscribeSnapshot = null;
  }
}