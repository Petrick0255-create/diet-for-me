/* exercise.js
   운동 기록 추가 / 수정 / 삭제 / 렌더링
*/

import {
  createId,
  todayKey,
  getDayRecord
} from "./data.js";

import {
  getState,
  updateState
} from "./storage.js";

import {
  openModal,
  closeAllModals,
  renderEmpty,
  setText,
  setValue,
  getValue,
  getNumber,
  formatNumber
} from "./ui.js";

let editingExercise = null;

export function initExercise() {
  bindExerciseEvents();
  renderExerciseList();
}

function bindExerciseEvents() {
  document.getElementById("entrySaveBtn")?.addEventListener("click", saveExerciseEntry);
}

export function openExerciseAdd() {
  editingExercise = null;

  setText("entryTitle", "운동 추가");
  setValue("entryDate", todayKey());
  setValue("entryName", "");
  setValue("entryQty", 1);
  setValue("entryKcal", "");
  setValue("entryTime", "");

  document.getElementById("mealLabel")?.classList.add("hidden");
  document.getElementById("mealGrid")?.classList.add("hidden");
  document.getElementById("quantityLabel")?.classList.add("hidden");
  document.getElementById("entryQty")?.classList.add("hidden");

  document.getElementById("timeLabel")?.classList.remove("hidden");
  document.getElementById("entryTime")?.classList.remove("hidden");

  openModal("entrySheet");
}

function openExerciseEdit(dateKey, index) {
  const state = getState();
  const item = state.records[dateKey]?.exercises[index];

  if (!item) return;

  editingExercise = {
    dateKey,
    index
  };

  setText("entryTitle", "운동 수정");
  setValue("entryDate", dateKey);
  setValue("entryName", item.name);
  setValue("entryTime", item.minutes || "");
  setValue("entryKcal", item.kcal);

  document.getElementById("mealLabel")?.classList.add("hidden");
  document.getElementById("mealGrid")?.classList.add("hidden");
  document.getElementById("quantityLabel")?.classList.add("hidden");
  document.getElementById("entryQty")?.classList.add("hidden");

  document.getElementById("timeLabel")?.classList.remove("hidden");
  document.getElementById("entryTime")?.classList.remove("hidden");

  openModal("entrySheet");
}

function saveExerciseEntry() {
  const date = getValue("entryDate") || todayKey();
  const name = getValue("entryName").trim();
  const minutes = getNumber("entryTime");
  const kcal = getNumber("entryKcal");

  const title = document.getElementById("entryTitle")?.textContent || "";
  if (!title.includes("운동")) return;

  if (!name || !kcal) {
    alert("운동명과 소비 칼로리를 입력하세요.");
    return;
  }

  updateState(state => {
    const day = getDayRecord(state, date);

    const payload = {
      id: editingExercise ? day.exercises[editingExercise.index].id : createId("exerciseRecord"),
      name,
      minutes: minutes || 0,
      kcal
    };

    if (editingExercise) {
      const oldDay = getDayRecord(state, editingExercise.dateKey);

      if (editingExercise.dateKey !== date) {
        oldDay.exercises.splice(editingExercise.index, 1);
        day.exercises.push(payload);
      } else {
        day.exercises[editingExercise.index] = payload;
      }
    } else {
      day.exercises.push(payload);
    }
  });

  editingExercise = null;
  closeAllModals();
  renderExerciseList();
}

function removeExerciseEntry(dateKey, index) {
  if (!confirm("이 운동 기록을 삭제할까요?")) return;

  updateState(state => {
    const day = getDayRecord(state, dateKey);
    day.exercises.splice(index, 1);
  });

  renderExerciseList();
}

export function renderExerciseList(date = todayKey()) {
  const state = getState();
  const day = getDayRecord(state, date);
  const list = document.getElementById("exerciseList");

  if (!list) return;

  if (!day.exercises.length) {
    renderEmpty("exerciseList", "아직 운동 기록이 없습니다.");
    return;
  }

  list.innerHTML = day.exercises.map((item, index) => `
    <div class="list-item">
      <div>
        <div class="item-main">${item.name}</div>
        <div class="item-sub">${item.minutes || 0}분 운동</div>
      </div>

      <div class="item-money minus">-${formatNumber(item.kcal)} kcal</div>

      <button class="more-btn" data-exercise-action="${index}" type="button">⋯</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-exercise-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.exerciseAction);
      const action = prompt("1 수정 / 2 삭제", "1");

      if (action === "1") openExerciseEdit(date, index);
      if (action === "2") removeExerciseEntry(date, index);
    });
  });
}

export function getTodayExerciseTotal() {
  const state = getState();
  const day = getDayRecord(state, todayKey());

  return day.exercises.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
}

export function getExerciseTotalByDate(dateKey) {
  const state = getState();
  const day = getDayRecord(state, dateKey);

  return day.exercises.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
}