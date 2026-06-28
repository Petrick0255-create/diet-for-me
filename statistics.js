/* statistics.js
   통계 시작일 기준으로 섭취/운동/대사량/순칼로리 계산
*/

import {
  todayKey,
  getDayRecord,
  hasDayRecord,
  getDailyTarget
} from "./data.js";

import {
  getState,
  updateState
} from "./storage.js";

import {
  getValue,
  setValue,
  formatNumber
} from "./ui.js";

export function initStatistics() {
  bindStatisticsEvents();
  renderStatistics();
}

function bindStatisticsEvents() {
  document.getElementById("saveStatStartBtn")?.addEventListener("click", saveStatStartDate);
}

function saveStatStartDate() {
  const date = getValue("statStartDate");

  updateState(state => {
    state.profile.statStartDate = date;
  });

  renderStatistics();
}

export function renderStatistics() {
  const state = getState();
  const profile = state.profile;

  if (profile.statStartDate) {
    setValue("statStartDate", profile.statStartDate);
  }

  const startDate = profile.statStartDate || getFirstRecordDate(state) || todayKey();
  const endDate = todayKey();

  let foodTotal = 0;
  let exerciseTotal = 0;
  let targetTotal = 0;
  let recordDays = 0;
  let calcDays = 0;

  const dates = getDateRange(startDate, endDate);

  dates.forEach(dateKey => {
    const day = getDayRecord(state, dateKey);
    const target = getDailyTarget(profile);

    const food = day.foods.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
    const exercise = day.exercises.reduce((sum, item) => sum + Number(item.kcal || 0), 0);

    foodTotal += food;
    exerciseTotal += exercise;
    targetTotal += target;
    calcDays++;

    if (hasDayRecord(state, dateKey)) {
      recordDays++;
    }
  });

  const balance = foodTotal - exerciseTotal - targetTotal;

  let label = "유지 중";
  let cls = "plus";

  if (balance > 1000) {
    label = "찌는 중";
    cls = "minus";
  }

  if (balance < -1000) {
    label = "빠지는 중";
    cls = "plus";
  }

  const statResult = document.getElementById("statResult");
  if (!statResult) return;

  statResult.innerHTML = `
    <div class="stat-big ${cls}">${label}</div>

    <div class="stat-row">
      <span>계산 시작일</span>
      <strong>${startDate}</strong>
    </div>

    <div class="stat-row">
      <span>계산 종료일</span>
      <strong>${endDate}</strong>
    </div>

    <div class="stat-row">
      <span>계산 일수</span>
      <strong>${calcDays}일</strong>
    </div>

    <div class="stat-row">
      <span>기록한 날</span>
      <strong>${recordDays}일</strong>
    </div>

    <div class="stat-row">
      <span>총 섭취</span>
      <strong>${formatNumber(foodTotal)} kcal</strong>
    </div>

    <div class="stat-row">
      <span>총 운동</span>
      <strong>${formatNumber(exerciseTotal)} kcal</strong>
    </div>

    <div class="stat-row">
      <span>기준 대사량 합계</span>
      <strong>${formatNumber(targetTotal)} kcal</strong>
    </div>

    <div class="stat-row">
      <span>최종 결과</span>
      <strong class="${balance > 0 ? "minus" : "plus"}">
        ${balance > 0 ? "+" : ""}${formatNumber(balance)} kcal
      </strong>
    </div>

    <div class="mini-chart">
      <div>
        <span>섭취</span>
        <div class="bar"><i style="width:${getPercent(foodTotal, Math.max(foodTotal, targetTotal, exerciseTotal))}%"></i></div>
      </div>

      <div>
        <span>운동</span>
        <div class="bar"><i style="width:${getPercent(exerciseTotal, Math.max(foodTotal, targetTotal, exerciseTotal))}%"></i></div>
      </div>

      <div>
        <span>대사량</span>
        <div class="bar"><i style="width:${getPercent(targetTotal, Math.max(foodTotal, targetTotal, exerciseTotal))}%"></i></div>
      </div>
    </div>
  `;
}

function getFirstRecordDate(state) {
  const keys = Object.keys(state.records || {})
    .filter(key => hasDayRecord(state, key))
    .sort();

  return keys[0] || "";
}

function getDateRange(start, end) {
  const result = [];

  const current = new Date(start);
  const last = new Date(end);

  if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime())) {
    return [todayKey()];
  }

  while (current <= last) {
    const y = current.getFullYear();
    const m = String(current.getMonth() + 1).padStart(2, "0");
    const d = String(current.getDate()).padStart(2, "0");

    result.push(`${y}-${m}-${d}`);
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function getPercent(value, max) {
  if (!max) return 0;
  return Math.max(4, Math.round((value / max) * 100));
}