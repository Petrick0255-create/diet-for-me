/* calendar.js
   월별 기록 달력 + 날짜 상세 보기
*/

import {
  toDateKey,
  getDayRecord,
  hasDayRecord,
  getDailyTarget
} from "./data.js";

import {
  getState
} from "./storage.js";

import {
  setText,
  renderEmpty,
  formatNumber
} from "./ui.js";

let viewDate = new Date();

export function initCalendar() {
  bindCalendarEvents();
  renderCalendar();
}

function bindCalendarEvents() {
  document.getElementById("prevMonthBtn")?.addEventListener("click", () => {
    viewDate.setMonth(viewDate.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("nextMonthBtn")?.addEventListener("click", () => {
    viewDate.setMonth(viewDate.getMonth() + 1);
    renderCalendar();
  });
}

export function renderCalendar() {
  const state = getState();

  const y = viewDate.getFullYear();
  const m = viewDate.getMonth();

  setText("monthLabel", `${y}년 ${m + 1}월`);

  const firstDate = new Date(y, m, 1);
  const lastDate = new Date(y, m + 1, 0);

  const firstDay = firstDate.getDay();
  const lastDay = lastDate.getDate();

  let html = ["일", "월", "화", "수", "목", "금", "토"]
    .map(day => `<div class="day-name">${day}</div>`)
    .join("");

  for (let i = 0; i < firstDay; i++) {
    html += `<div class="calendar-day blank"></div>`;
  }

  for (let d = 1; d <= lastDay; d++) {
    const date = new Date(y, m, d);
    const key = toDateKey(date);

    const recorded = hasDayRecord(state, key);
    const day = getDayRecord(state, key);

    const food = day.foods.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
    const exercise = day.exercises.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
    const target = recorded ? getDailyTarget(state.profile) : 0;
    const balance = recorded ? food - exercise - target : 0;

    const sign = balance > 0 ? "+" : "";
    const cls = balance > 0 ? "day-plus" : "day-minus";

    html += `
      <button class="calendar-day" data-calendar-date="${key}" type="button">
        <div class="day-num">${d}</div>
        ${
          recorded
            ? `
              <div class="day-money ${cls}">${sign}${formatNumber(balance)}</div>
              <div class="day-money">${formatNumber(food)}kcal</div>
            `
            : `<div class="day-money">-</div>`
        }
      </button>
    `;
  }

  const grid = document.getElementById("calendarGrid");
  if (!grid) return;

  grid.innerHTML = html;

  grid.querySelectorAll("[data-calendar-date]").forEach(btn => {
    btn.addEventListener("click", () => {
      showDayDetail(btn.dataset.calendarDate);
    });
  });
}

export function showDayDetail(dateKey) {
  const state = getState();
  const day = getDayRecord(state, dateKey);

  const food = day.foods.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
  const exercise = day.exercises.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
  const target = getDailyTarget(state.profile);
  const balance = food - exercise - target;

  const detail = document.getElementById("dayDetail");
  if (!detail) return;

  if (!hasDayRecord(state, dateKey)) {
    renderEmpty("dayDetail", `${dateKey} 기록이 없습니다.`);
    return;
  }

  detail.innerHTML = `
    <div class="stat-row">
      <span>${dateKey}</span>
      <strong class="${balance > 0 ? "minus" : "plus"}">
        ${balance > 0 ? "+" : ""}${formatNumber(balance)} kcal
      </strong>
    </div>

    <div class="stat-row">
      <span>먹은 칼로리</span>
      <strong>${formatNumber(food)} kcal</strong>
    </div>

    <div class="stat-row">
      <span>운동 칼로리</span>
      <strong>${formatNumber(exercise)} kcal</strong>
    </div>

    <div class="stat-row">
      <span>기준 대사량</span>
      <strong>${formatNumber(target)} kcal</strong>
    </div>

    <br>

    <div class="card-title">먹은 것</div>
    ${
      day.foods.length
        ? day.foods.map(item => `
          <div class="list-item">
            <div>
              <div class="item-main">${item.meal} · ${item.name}</div>
              <div class="item-sub">${item.quantity || 1}${item.unit || "회"}</div>
            </div>

            <div class="item-money plus">${formatNumber(item.kcal)} kcal</div>
            <div></div>
          </div>
        `).join("")
        : `<div class="empty">먹은 기록 없음</div>`
    }

    <br>

    <div class="card-title">운동</div>
    ${
      day.exercises.length
        ? day.exercises.map(item => `
          <div class="list-item">
            <div>
              <div class="item-main">${item.name}</div>
              <div class="item-sub">${item.minutes || 0}분</div>
            </div>

            <div class="item-money minus">-${formatNumber(item.kcal)} kcal</div>
            <div></div>
          </div>
        `).join("")
        : `<div class="empty">운동 기록 없음</div>`
    }
  `;
}

export function getCurrentCalendarMonth() {
  return {
    year: viewDate.getFullYear(),
    month: viewDate.getMonth() + 1
  };
}