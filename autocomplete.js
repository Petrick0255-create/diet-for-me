/* autocomplete.js
   자주 먹는 음식 자동완성 + 개수에 따른 칼로리 자동 계산
*/

import { getState } from "./storage.js";
import { getValue, getNumber, setValue } from "./ui.js";

let selectedFood = null;

export function initAutocomplete() {
  bindAutocompleteEvents();
  renderFoodDatalist();
}

export function renderFoodDatalist() {
  const state = getState();
  const datalist = document.getElementById("foodPresetDatalist");

  if (!datalist) return;

  datalist.innerHTML = state.foods.map(food => `
    <option value="${food.name}">
  `).join("");
}

function bindAutocompleteEvents() {
  document.getElementById("entryName")?.addEventListener("input", handleFoodInput);
  document.getElementById("entryQty")?.addEventListener("input", updateAutoKcal);
}

function handleFoodInput() {
  const name = getValue("entryName").trim();
  const state = getState();

  selectedFood = state.foods.find(food => food.name === name) || null;

  if (selectedFood) {
    updateAutoKcal();
  }
}

export function findFoodByName(name) {
  const state = getState();
  const keyword = String(name || "").trim();

  if (!keyword) return null;

  return (
    state.foods.find(food => food.name === keyword) ||
    state.foods.find(food => food.name.includes(keyword)) ||
    null
  );
}

export function updateAutoKcal() {
  const name = getValue("entryName").trim();
  const qty = getNumber("entryQty") || 1;

  selectedFood = findFoodByName(name);

  if (!selectedFood) return;

  const kcal = Math.round(Number(selectedFood.kcal || 0) * qty);
  setValue("entryKcal", kcal);
}

export function getSelectedFoodInfo() {
  const name = getValue("entryName").trim();
  const food = findFoodByName(name);

  if (!food) {
    return {
      foodId: "",
      name,
      unit: "회",
      unitKcal: 0
    };
  }

  return {
    foodId: food.id,
    name: food.name,
    unit: food.unit || "회",
    unitKcal: Number(food.kcal || 0)
  };
}