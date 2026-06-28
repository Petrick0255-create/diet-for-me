/* storage.js
   localStorage 저장 + Firestore 저장을 함께 처리
*/

import { cloneDefaultState } from "./data.js";
import {
  getCurrentUser,
  saveCloudState,
  loadCloudState
} from "./firebase.js";

const STORAGE_KEY = "foodAccountV2";

let state = cloneDefaultState();
let saveTimer = null;

export function getState() {
  return state;
}

export function setState(nextState) {
  state = nextState;
  saveLocalState();
}

export function loadLocalState() {
  const raw = localStorage.getItem(STORAGE_KEY);

  if (!raw) {
    state = cloneDefaultState();
    return state;
  }

  try {
    const parsed = JSON.parse(raw);
    state = mergeState(cloneDefaultState(), parsed);
  } catch (error) {
    console.error(error);
    state = cloneDefaultState();
  }

  return state;
}

export function saveLocalState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function updateState(mutator) {
  mutator(state);
  saveLocalState();
  scheduleCloudSave();
}

export async function syncFromCloudIfAvailable() {
  const user = getCurrentUser();

  if (!user) return state;

  const cloudState = await loadCloudState(user.uid);

  if (cloudState) {
    state = mergeState(cloneDefaultState(), cloudState);
    saveLocalState();
  } else {
    await saveCloudState(user.uid, state);
  }

  return state;
}

export function applyCloudState(cloudState) {
  state = mergeState(cloneDefaultState(), cloudState);
  saveLocalState();
}

export function scheduleCloudSave() {
  const user = getCurrentUser();

  if (!user) return;

  clearTimeout(saveTimer);

  saveTimer = setTimeout(() => {
    saveCloudState(user.uid, state);
  }, 500);
}

export async function forceCloudSave() {
  const user = getCurrentUser();

  if (!user) return;

  await saveCloudState(user.uid, state);
}

function mergeState(base, incoming) {
  const merged = {
    ...base,
    ...incoming,
    profile: {
      ...base.profile,
      ...(incoming.profile || {})
    },
    foods: Array.isArray(incoming.foods) ? incoming.foods : base.foods,
    exercises: Array.isArray(incoming.exercises)
      ? incoming.exercises
      : base.exercises,
    records: incoming.records || base.records
  };

  return merged;
}