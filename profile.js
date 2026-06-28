/* profile.js
   정보 탭: 키/몸무게/기초대사량/일일대사량/자주 먹는 음식 관리
*/

import {
  calculateBmr,
  createId
} from "./data.js";

import {
  getState,
  updateState
} from "./storage.js";

import {
  getValue,
  getNumber,
  setValue,
  setText,
  renderEmpty
} from "./ui.js";

let editingFoodId = null;

export function initProfile() {
  bindProfileEvents();
  renderProfile();
  renderMyFoods();
}

function bindProfileEvents() {
  document.getElementById("calcBmrBtn")?.addEventListener("click", saveCalculatedBmr);
  document.getElementById("saveDailyCalorieBtn")?.addEventListener("click", saveDailyCalorie);
  document.getElementById("openFoodPresetBtn")?.addEventListener("click", openFoodPresetAdd);

  document.getElementById("presetSaveBtn")?.addEventListener("click", saveFoodPreset);
  document.getElementById("presetCloseBtn")?.addEventListener("click", closePresetSheet);
  document.getElementById("presetCancelBtn")?.addEventListener("click", closePresetSheet);
}

export function renderProfile() {
  const state = getState();
  const p = state.profile;

  setValue("height", p.height);
  setValue("weight", p.weight);
  setValue("age", p.age);
  setValue("gender", p.gender);
  setValue("dailyCalorieInput", p.dailyCalorie || "");

  setText("bmrText", p.bmr ? `${p.bmr}` : "-");
  setText("dailyCalorieText", p.dailyCalorie ? `${p.dailyCalorie}` : "-");

  if (p.statStartDate) {
    setValue("statStartDate", p.statStartDate);
  }
}

function saveCalculatedBmr() {
  const height = getValue("height");
  const weight = getValue("weight");
  const age = getValue("age");
  const gender = getValue("gender");

  const bmr = calculateBmr({
    height,
    weight,
    age,
    gender
  });

  if (!bmr) {
    alert("키, 몸무게, 나이를 입력하세요.");
    return;
  }

  updateState(state => {
    state.profile.height = height;
    state.profile.weight = weight;
    state.profile.age = age;
    state.profile.gender = gender;
    state.profile.bmr = bmr;

    if (!state.profile.dailyCalorie) {
      state.profile.dailyCalorie = bmr;
    }
  });

  renderProfile();
}

function saveDailyCalorie() {
  const daily = getNumber("dailyCalorieInput");

  if (!daily) {
    alert("일일 대사량을 입력하세요.");
    return;
  }

  updateState(state => {
    state.profile.dailyCalorie = daily;
  });

  renderProfile();
}

export function saveStatStartDate() {
  const date = getValue("statStartDate");

  updateState(state => {
    state.profile.statStartDate = date;
  });
}

function openFoodPresetAdd() {
  editingFoodId = null;

  setText("presetTitle", "품목 추가");
  setValue("presetName", "");
  setValue("presetUnit", "개");
  setValue("presetKcal", "");

  document.getElementById("entryOverlay")?.classList.remove("hidden");
  document.getElementById("presetSheet")?.classList.remove("hidden");
}

function openFoodPresetEdit(foodId) {
  const state = getState();
  const food = state.foods.find(item => item.id === foodId);

  if (!food) return;

  editingFoodId = foodId;

  setText("presetTitle", "품목 수정");
  setValue("presetName", food.name);
  setValue("presetUnit", food.unit || "개");
  setValue("presetKcal", food.kcal);

  document.getElementById("entryOverlay")?.classList.remove("hidden");
  document.getElementById("presetSheet")?.classList.remove("hidden");
}

function closePresetSheet() {
  editingFoodId = null;

  document.getElementById("entryOverlay")?.classList.add("hidden");
  document.getElementById("presetSheet")?.classList.add("hidden");
}

function saveFoodPreset() {
  const name = getValue("presetName").trim();
  const unit = getValue("presetUnit").trim() || "개";
  const kcal = getNumber("presetKcal");

  if (!name || !kcal) {
    alert("품목명과 칼로리를 입력하세요.");
    return;
  }

  updateState(state => {
    if (editingFoodId) {
      const food = state.foods.find(item => item.id === editingFoodId);

      if (food) {
        food.name = name;
        food.unit = unit;
        food.kcal = kcal;
      }
    } else {
      state.foods.push({
        id: createId("food"),
        name,
        unit,
        kcal,
        favorite: false
      });
    }
  });

  closePresetSheet();
  renderMyFoods();
}

function removeFoodPreset(foodId) {
  if (!confirm("이 품목을 삭제할까요?")) return;

  updateState(state => {
    state.foods = state.foods.filter(item => item.id !== foodId);
  });

  renderMyFoods();
}

function toggleFavorite(foodId) {
  updateState(state => {
    const food = state.foods.find(item => item.id === foodId);
    if (food) food.favorite = !food.favorite;
  });

  renderMyFoods();
}

export function renderMyFoods() {
  const state = getState();
  const list = document.getElementById("myFoodPresetList");

  if (!list) return;

  if (!state.foods.length) {
    renderEmpty("myFoodPresetList", "등록된 음식 품목이 없습니다.");
    return;
  }

  const sorted = [...state.foods].sort((a, b) => {
    if (a.favorite !== b.favorite) return a.favorite ? -1 : 1;
    return a.name.localeCompare(b.name, "ko");
  });

  list.innerHTML = sorted.map(food => `
    <div class="list-item">
      <div>
        <div class="item-main">${food.favorite ? "⭐ " : ""}${food.name}</div>
        <div class="item-sub">1${food.unit || "회"} · ${food.kcal} kcal</div>
      </div>

      <div class="item-money plus">${food.kcal}</div>

      <button class="more-btn" data-food-setting="${food.id}">⋯</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-food-setting]").forEach(btn => {
    btn.addEventListener("click", () => {
      const foodId = btn.dataset.foodSetting;
      const action = prompt("1 수정 / 2 삭제 / 3 즐겨찾기", "1");

      if (action === "1") openFoodPresetEdit(foodId);
      if (action === "2") removeFoodPreset(foodId);
      if (action === "3") toggleFavorite(foodId);
    });
  });
}