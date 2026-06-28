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
  getDoc,
  setDoc
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

export const auth = getAuth(app);
export const db = getFirestore(app);
export const provider = new GoogleAuthProvider();

export function authListener(callback) {
  return onAuthStateChanged(auth, callback);
}

export async function googleLogin() {
  try {
    return await signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);
    alert(error.code + "\n\n" + error.message);
    throw error;
  }
}

export async function googleLogout() {
  return await signOut(auth);
}

export async function saveUserData(uid, data) {
  return await setDoc(doc(db, "foodAccount", uid), data);
}

export async function loadUserData(uid) {
  const snap = await getDoc(doc(db, "foodAccount", uid));

  if (snap.exists()) {
    return snap.data();
  }

  return null;
}