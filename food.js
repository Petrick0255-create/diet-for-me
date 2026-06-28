/* food.js
   먹은 거 기록 추가 / 수정 / 삭제 / 렌더링
*/

import {
  MEALS,
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

import {
  renderFoodDatalist,
  updateAutoKcal,
  getSelectedFoodInfo
} from "./autocomplete.js";

let selectedMeal = "아침";
let editingFood = null;

export function initFood() {
  bindFoodEvents();
  renderMealChips();
  renderFoodList();
}

function bindFoodEvents() {
  document.getElementById("entrySaveBtn")?.addEventListener("click", saveFoodEntry);

  document.getElementById("entryName")?.addEventListener("input", updateAutoKcal);
  document.getElementById("entryQty")?.addEventListener("input", updateAutoKcal);
}

export function openFoodAdd() {
  editingFood = null;
  selectedMeal = "아침";

  setText("entryTitle", "먹은 거 추가");
  setValue("entryDate", todayKey());
  setValue("entryName", "");
  setValue("entryQty", 1);
  setValue("entryKcal", "");

  document.getElementById("mealLabel")?.classList.remove("hidden");
  document.getElementById("mealGrid")?.classList.remove("hidden");
  document.getElementById("quantityLabel")?.classList.remove("hidden");
  document.getElementById("entryQty")?.classList.remove("hidden");

  document.getElementById("timeLabel")?.classList.add("hidden");
  document.getElementById("entryTime")?.classList.add("hidden");

  renderFoodDatalist();
  renderMealChips();
  openModal("entrySheet");
}

function openFoodEdit(dateKey, index) {
  const state = getState();
  const item = state.records[dateKey]?.foods[index];

  if (!item) return;

  editingFood = {
    dateKey,
    index
  };

  selectedMeal = item.meal || "아침";

  setText("entryTitle", "먹은 거 수정");
  setValue("entryDate", dateKey);
  setValue("entryName", item.name);
  setValue("entryQty", item.quantity || 1);
  setValue("entryKcal", item.kcal);

  document.getElementById("mealLabel")?.classList.remove("hidden");
  document.getElementById("mealGrid")?.classList.remove("hidden");
  document.getElementById("quantityLabel")?.classList.remove("hidden");
  document.getElementById("entryQty")?.classList.remove("hidden");

  document.getElementById("timeLabel")?.classList.add("hidden");
  document.getElementById("entryTime")?.classList.add("hidden");

  renderFoodDatalist();
  renderMealChips();
  openModal("entrySheet");
}

function renderMealChips() {
  const grid = document.getElementById("mealGrid");
  if (!grid) return;

  grid.innerHTML = MEALS.map(meal => `
    <button
      class="category-chip ${meal === selectedMeal ? "active" : ""}"
      data-meal="${meal}"
      type="button"
    >
      ${meal}
    </button>
  `).join("");

  grid.querySelectorAll("[data-meal]").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedMeal = btn.dataset.meal;
      renderMealChips();
    });
  });
}

function saveFoodEntry() {
  const title = document.getElementById("entryTitle")?.textContent || "";
  if (!title.includes("먹은")) return;

  const date = getValue("entryDate") || todayKey();
  const name = getValue("entryName").trim();
  const quantity = getNumber("entryQty") || 1;
  const kcal = getNumber("entryKcal");

  if (!name || !kcal) {
    alert("품목명과 칼로리를 입력하세요.");
    return;
  }

  const foodInfo = getSelectedFoodInfo();

  updateState(state => {
    const day = getDayRecord(state, date);

    const payload = {
      id: editingFood ? day.foods[editingFood.index].id : createId("foodRecord"),
      meal: selectedMeal,
      foodId: foodInfo.foodId,
      name,
      unit: foodInfo.unit,
      unitKcal: foodInfo.unitKcal,
      quantity,
      kcal
    };

    if (editingFood) {
      const oldDay = getDayRecord(state, editingFood.dateKey);

      if (editingFood.dateKey !== date) {
        oldDay.foods.splice(editingFood.index, 1);
        day.foods.push(payload);
      } else {
        day.foods[editingFood.index] = payload;
      }
    } else {
      day.foods.push(payload);
    }
  });

  editingFood = null;
  closeAllModals();
  renderFoodList();
}

function removeFoodEntry(dateKey, index) {
  if (!confirm("이 먹은 기록을 삭제할까요?")) return;

  updateState(state => {
    const day = getDayRecord(state, dateKey);
    day.foods.splice(index, 1);
  });

  renderFoodList();
}

export function renderFoodList(date = todayKey()) {
  const state = getState();
  const day = getDayRecord(state, date);
  const list = document.getElementById("foodList");

  if (!list) return;

  if (!day.foods.length) {
    renderEmpty("foodList", "아직 먹은 기록이 없습니다.");
    return;
  }

  list.innerHTML = day.foods.map((item, index) => `
    <div class="list-item">
      <div>
        <div class="item-main">${item.meal} · ${item.name}</div>
        <div class="item-sub">
          ${item.quantity || 1}${item.unit || "회"} · ${formatNumber(item.unitKcal || item.kcal)} kcal 기준
        </div>
      </div>

      <div class="item-money plus">${formatNumber(item.kcal)} kcal</div>

      <button class="more-btn" data-food-action="${index}" type="button">⋯</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-food-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.foodAction);
      const action = prompt("1 수정 / 2 삭제", "1");

      if (action === "1") openFoodEdit(date, index);
      if (action === "2") removeFoodEntry(date, index);
    });
  });
}

export function getTodayFoodTotal() {
  const state = getState();
  const day = getDayRecord(state, todayKey());

  return day.foods.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
}

export function getFoodTotalByDate(dateKey) {
  const state = getState();
  const day = getDayRecord(state, dateKey);

  return day.foods.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
}