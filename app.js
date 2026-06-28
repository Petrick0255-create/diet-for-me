import {
  googleLogin,
  googleLogout,
  authListener,
  saveUserData,
  loadUserData
} from "./firebase.js";

/* =========================
   기본 데이터
========================= */

const MEALS = ["아침", "점심", "저녁", "간식", "야식"];

const DEFAULT_FOODS = [
  { id: "banana", name: "바나나", unit: "개", kcal: 105 },
  { id: "avocado", name: "아보카도", unit: "개", kcal: 240 },
  { id: "rice", name: "밥", unit: "공기", kcal: 300 },
  { id: "pork", name: "돼지갈비", unit: "인분", kcal: 480 },
  { id: "tonkatsu", name: "돈까스", unit: "장", kcal: 700 },
  { id: "chicken", name: "치킨", unit: "조각", kcal: 250 },
  { id: "breast", name: "닭가슴살", unit: "개", kcal: 165 }
];

const DEFAULT_STATE = {
  profile: {
    height: "",
    weight: "",
    age: "",
    gender: "male",
    bmr: 0,
    dailyCalorie: 0,
    statStartDate: ""
  },

  foods: DEFAULT_FOODS,

  records: {}
};

let state = loadLocal() || structuredClone(DEFAULT_STATE);

let currentUser = null;
let currentTab = "food";
let currentMonth = new Date();

let entryMode = "food";
let editing = null;
let selectedMeal = "아침";

let presetEditingId = null;

/* =========================
   기본 유틸
========================= */

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function makeId(prefix) {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function getDay(key = todayKey()) {
  if (!state.records[key]) {
    state.records[key] = {
      foods: [],
      exercises: []
    };
  }

  return state.records[key];
}

function hasRecord(key) {
  const day = state.records[key];
  if (!day) return false;

  return day.foods.length > 0 || day.exercises.length > 0;
}

function getTargetCalorie() {
  return Number(state.profile.dailyCalorie || state.profile.bmr || 0);
}

function sumFoods(key = todayKey()) {
  const day = getDay(key);
  return day.foods.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
}

function sumExercises(key = todayKey()) {
  const day = getDay(key);
  return day.exercises.reduce((sum, item) => sum + Number(item.kcal || 0), 0);
}

function getBalance(key = todayKey()) {
  if (!hasRecord(key)) return 0;

  return sumFoods(key) - sumExercises(key) - getTargetCalorie();
}

function format(n) {
  return Number(n || 0).toLocaleString();
}

/* =========================
   저장
========================= */

function loadLocal() {
  try {
    const raw = localStorage.getItem("foodAccountSimpleV1");
    if (!raw) return null;

    const saved = JSON.parse(raw);

    return {
      ...structuredClone(DEFAULT_STATE),
      ...saved,
      profile: {
        ...DEFAULT_STATE.profile,
        ...(saved.profile || {})
      },
      foods: Array.isArray(saved.foods) ? saved.foods : DEFAULT_FOODS,
      records: saved.records || {}
    };
  } catch (e) {
    console.error(e);
    return null;
  }
}

function saveLocal() {
  localStorage.setItem("foodAccountSimpleV1", JSON.stringify(state));
}

async function saveAll() {
  saveLocal();

  if (currentUser) {
    await saveUserData(currentUser.uid, {
      state,
      updatedAt: Date.now()
    });
  }

  renderAll();
}

/* =========================
   Firebase 로그인
========================= */

function initAuth() {
  authListener(async user => {
    currentUser = user;

    const loginBtn = document.getElementById("loginBtn");
    const userStatus = document.getElementById("userStatus");

    if (user) {
      loginBtn.textContent = "로그아웃";
      userStatus.textContent = user.email || "구글 로그인됨";

      const cloud = await loadUserData(user.uid);

      if (cloud && cloud.state) {
        state = {
          ...structuredClone(DEFAULT_STATE),
          ...cloud.state,
          profile: {
            ...DEFAULT_STATE.profile,
            ...(cloud.state.profile || {})
          },
          foods: Array.isArray(cloud.state.foods) ? cloud.state.foods : DEFAULT_FOODS,
          records: cloud.state.records || {}
        };

        saveLocal();
      } else {
        await saveAll();
      }
    } else {
      loginBtn.textContent = "구글 로그인";
      userStatus.textContent = "로그인하지 않음";
    }

    renderAll();
  });
}

async function toggleLogin() {
  if (currentUser) {
    await googleLogout();
  } else {
    await googleLogin();
  }
}

/* =========================
   탭 / 공통 UI
========================= */

function showTab(tab) {
  currentTab = tab;

  document.querySelectorAll(".screen").forEach(el => {
    el.classList.remove("active");
  });

  document.getElementById(`tab-${tab}`).classList.add("active");

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  document.querySelector(`.tab-btn[data-tab="${tab}"]`).classList.add("active");

  const fab = document.getElementById("fab");

  if (tab === "food" || tab === "exercise" || tab === "info") {
    fab.style.display = "block";
  } else {
    fab.style.display = "none";
  }

  renderAll();
}

function openOverlay() {
  document.getElementById("overlay").classList.remove("hidden");
}

function closeOverlay() {
  document.getElementById("overlay").classList.add("hidden");
  document.getElementById("entrySheet").classList.add("hidden");
  document.getElementById("presetSheet").classList.add("hidden");

  editing = null;
  presetEditingId = null;
}

function toggleTheme() {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");
  localStorage.setItem("foodAccountTheme", isLight ? "light" : "dark");

  document.getElementById("themeBtn").textContent = isLight ? "🌙" : "☀️";
}

function loadTheme() {
  const theme = localStorage.getItem("foodAccountTheme");

  if (theme === "light") {
    document.body.classList.add("light");
    document.getElementById("themeBtn").textContent = "🌙";
  }
}

/* =========================
   정보 탭
========================= */

function calcBmr() {
  const h = Number(document.getElementById("height").value);
  const w = Number(document.getElementById("weight").value);
  const a = Number(document.getElementById("age").value);
  const g = document.getElementById("gender").value;

  if (!h || !w || !a) {
    alert("키, 몸무게, 나이를 입력하세요.");
    return;
  }

  let bmr;

  if (g === "female") {
    bmr = Math.round(10 * w + 6.25 * h - 5 * a - 161);
  } else {
    bmr = Math.round(10 * w + 6.25 * h - 5 * a + 5);
  }

  state.profile.height = h;
  state.profile.weight = w;
  state.profile.age = a;
  state.profile.gender = g;
  state.profile.bmr = bmr;

  if (!state.profile.dailyCalorie) {
    state.profile.dailyCalorie = bmr;
  }

  saveAll();
}

function saveDailyCalorie() {
  const daily = Number(document.getElementById("dailyCalorieInput").value);

  if (!daily) {
    alert("일일 대사량을 입력하세요.");
    return;
  }

  state.profile.dailyCalorie = daily;
  saveAll();
}

function saveStatStartDate() {
  state.profile.statStartDate = document.getElementById("statStartDate").value;
  saveAll();
}

function renderProfile() {
  const p = state.profile;

  document.getElementById("height").value = p.height || "";
  document.getElementById("weight").value = p.weight || "";
  document.getElementById("age").value = p.age || "";
  document.getElementById("gender").value = p.gender || "male";
  document.getElementById("dailyCalorieInput").value = p.dailyCalorie || "";
  document.getElementById("statStartDate").value = p.statStartDate || "";

  document.getElementById("bmrText").textContent = p.bmr ? format(p.bmr) : "-";
  document.getElementById("dailyText").textContent = p.dailyCalorie ? format(p.dailyCalorie) : "-";
}

/* =========================
   자주 먹는 품목
========================= */

function openPresetAdd() {
  presetEditingId = null;

  document.getElementById("presetTitle").textContent = "품목 추가";
  document.getElementById("presetName").value = "";
  document.getElementById("presetUnit").value = "개";
  document.getElementById("presetKcal").value = "";

  openOverlay();
  document.getElementById("presetSheet").classList.remove("hidden");
}

function openPresetEdit(id) {
  const food = state.foods.find(f => f.id === id);
  if (!food) return;

  presetEditingId = id;

  document.getElementById("presetTitle").textContent = "품목 수정";
  document.getElementById("presetName").value = food.name;
  document.getElementById("presetUnit").value = food.unit;
  document.getElementById("presetKcal").value = food.kcal;

  openOverlay();
  document.getElementById("presetSheet").classList.remove("hidden");
}

function savePreset() {
  const name = document.getElementById("presetName").value.trim();
  const unit = document.getElementById("presetUnit").value.trim() || "개";
  const kcal = Number(document.getElementById("presetKcal").value);

  if (!name || !kcal) {
    alert("품목명과 칼로리를 입력하세요.");
    return;
  }

  if (presetEditingId) {
    const food = state.foods.find(f => f.id === presetEditingId);
    if (food) {
      food.name = name;
      food.unit = unit;
      food.kcal = kcal;
    }
  } else {
    state.foods.push({
      id: makeId("preset"),
      name,
      unit,
      kcal
    });
  }

  closeOverlay();
  saveAll();
}

function deletePreset(id) {
  if (!confirm("이 품목을 삭제할까요?")) return;

  state.foods = state.foods.filter(f => f.id !== id);
  saveAll();
}

function renderPresets() {
  const list = document.getElementById("presetList");

  if (!state.foods.length) {
    list.innerHTML = `<div class="empty">등록된 품목이 없습니다.</div>`;
    return;
  }

  list.innerHTML = state.foods.map(food => `
    <div class="list-item">
      <div>
        <div class="item-main">${food.name}</div>
        <div class="item-sub">1${food.unit} · ${format(food.kcal)} kcal</div>
      </div>

      <div class="item-money plus">${format(food.kcal)}</div>

      <button class="more-btn" data-preset="${food.id}">⋯</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-preset]").forEach(btn => {
    btn.addEventListener("click", () => {
      const id = btn.dataset.preset;
      const action = prompt("1 수정 / 2 삭제", "1");

      if (action === "1") openPresetEdit(id);
      if (action === "2") deletePreset(id);
    });
  });

  renderFoodOptions();
}

function renderFoodOptions() {
  const datalist = document.getElementById("foodOptions");

  datalist.innerHTML = state.foods.map(food => `
    <option value="${food.name}">
  `).join("");
}

function findPresetByName(name) {
  const keyword = String(name || "").trim();

  if (!keyword) return null;

  return (
    state.foods.find(f => f.name === keyword) ||
    state.foods.find(f => f.name.includes(keyword)) ||
    null
  );
}

function autoFillKcal() {
  if (entryMode !== "food") return;

  const name = document.getElementById("entryName").value.trim();
  const qty = Number(document.getElementById("entryQty").value || 1);
  const preset = findPresetByName(name);

  if (!preset) return;

  document.getElementById("entryKcal").value = Math.round(preset.kcal * qty);
}

/* =========================
   먹은 거 / 운동 입력
========================= */

function openEntry(mode, editInfo = null) {
  entryMode = mode;
  editing = editInfo;

  document.getElementById("entryDate").value = todayKey();
  document.getElementById("entryName").value = "";
  document.getElementById("entryQty").value = 1;
  document.getElementById("entryTime").value = "";
  document.getElementById("entryKcal").value = "";

  if (mode === "food") {
    selectedMeal = "아침";
    document.getElementById("entryTitle").textContent = editInfo ? "먹은 거 수정" : "먹은 거 추가";
    document.getElementById("mealArea").classList.remove("hidden");
    document.getElementById("qtyArea").classList.remove("hidden");
    document.getElementById("timeArea").classList.add("hidden");
    renderMealChips();
  }

  if (mode === "exercise") {
    document.getElementById("entryTitle").textContent = editInfo ? "운동 수정" : "운동 추가";
    document.getElementById("mealArea").classList.add("hidden");
    document.getElementById("qtyArea").classList.add("hidden");
    document.getElementById("timeArea").classList.remove("hidden");
  }

  if (editInfo) {
    const day = getDay(editInfo.date);
    const item = mode === "food"
      ? day.foods[editInfo.index]
      : day.exercises[editInfo.index];

    if (item) {
      document.getElementById("entryDate").value = editInfo.date;
      document.getElementById("entryName").value = item.name;
      document.getElementById("entryKcal").value = item.kcal;

      if (mode === "food") {
        selectedMeal = item.meal || "아침";
        document.getElementById("entryQty").value = item.quantity || 1;
        renderMealChips();
      }

      if (mode === "exercise") {
        document.getElementById("entryTime").value = item.minutes || "";
      }
    }
  }

  openOverlay();
  document.getElementById("entrySheet").classList.remove("hidden");
}

function renderMealChips() {
  const grid = document.getElementById("mealGrid");

  grid.innerHTML = MEALS.map(meal => `
    <button
      type="button"
      class="category-chip ${meal === selectedMeal ? "active" : ""}"
      data-meal="${meal}"
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

function saveEntry() {
  const date = document.getElementById("entryDate").value || todayKey();
  const name = document.getElementById("entryName").value.trim();
  const kcal = Number(document.getElementById("entryKcal").value);

  if (!name || !kcal) {
    alert("이름과 칼로리를 입력하세요.");
    return;
  }

  const day = getDay(date);

  if (entryMode === "food") {
    const qty = Number(document.getElementById("entryQty").value || 1);
    const preset = findPresetByName(name);

    const payload = {
      id: editing ? day.foods[editing.index]?.id : makeId("food"),
      meal: selectedMeal,
      name: preset ? preset.name : name,
      foodId: preset ? preset.id : "",
      unit: preset ? preset.unit : "회",
      unitKcal: preset ? preset.kcal : kcal,
      quantity: qty,
      kcal
    };

    if (editing) {
      const oldDay = getDay(editing.date);

      if (editing.date !== date) {
        oldDay.foods.splice(editing.index, 1);
        day.foods.push(payload);
      } else {
        day.foods[editing.index] = payload;
      }
    } else {
      day.foods.push(payload);
    }
  }

  if (entryMode === "exercise") {
    const minutes = Number(document.getElementById("entryTime").value || 0);

    const payload = {
      id: editing ? day.exercises[editing.index]?.id : makeId("exercise"),
      name,
      minutes,
      kcal
    };

    if (editing) {
      const oldDay = getDay(editing.date);

      if (editing.date !== date) {
        oldDay.exercises.splice(editing.index, 1);
        day.exercises.push(payload);
      } else {
        day.exercises[editing.index] = payload;
      }
    } else {
      day.exercises.push(payload);
    }
  }

  closeOverlay();
  saveAll();
}

function deleteFood(date, index) {
  if (!confirm("이 먹은 기록을 삭제할까요?")) return;

  getDay(date).foods.splice(index, 1);
  saveAll();
}

function deleteExercise(date, index) {
  if (!confirm("이 운동 기록을 삭제할까요?")) return;

  getDay(date).exercises.splice(index, 1);
  saveAll();
}

/* =========================
   리스트 렌더링
========================= */

function renderFoodList(date = todayKey()) {
  const list = document.getElementById("foodList");
  const day = getDay(date);

  if (!day.foods.length) {
    list.innerHTML = `<div class="empty">아직 먹은 기록이 없습니다.</div>`;
    return;
  }

  list.innerHTML = day.foods.map((item, index) => `
    <div class="list-item">
      <div>
        <div class="item-main">${item.meal} · ${item.name}</div>
        <div class="item-sub">
          ${item.quantity || 1}${item.unit || "회"} · 1${item.unit || "회"} ${format(item.unitKcal || item.kcal)} kcal
        </div>
      </div>

      <div class="item-money plus">${format(item.kcal)} kcal</div>

      <button class="more-btn" data-food-action="${index}">⋯</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-food-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.foodAction);
      const action = prompt("1 수정 / 2 삭제", "1");

      if (action === "1") openEntry("food", { date, index });
      if (action === "2") deleteFood(date, index);
    });
  });
}

function renderExerciseList(date = todayKey()) {
  const list = document.getElementById("exerciseList");
  const day = getDay(date);

  if (!day.exercises.length) {
    list.innerHTML = `<div class="empty">아직 운동 기록이 없습니다.</div>`;
    return;
  }

  list.innerHTML = day.exercises.map((item, index) => `
    <div class="list-item">
      <div>
        <div class="item-main">${item.name}</div>
        <div class="item-sub">${item.minutes || 0}분 운동</div>
      </div>

      <div class="item-money minus">-${format(item.kcal)} kcal</div>

      <button class="more-btn" data-exercise-action="${index}">⋯</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-exercise-action]").forEach(btn => {
    btn.addEventListener("click", () => {
      const index = Number(btn.dataset.exerciseAction);
      const action = prompt("1 수정 / 2 삭제", "1");

      if (action === "1") openEntry("exercise", { date, index });
      if (action === "2") deleteExercise(date, index);
    });
  });
}

/* =========================
   달력
========================= */

function renderCalendar() {
  const y = currentMonth.getFullYear();
  const m = currentMonth.getMonth();

  document.getElementById("monthLabel").textContent = `${y}년 ${m + 1}월`;

  const first = new Date(y, m, 1);
  const last = new Date(y, m + 1, 0);

  let html = ["일", "월", "화", "수", "목", "금", "토"]
    .map(day => `<div class="day-name">${day}</div>`)
    .join("");

  for (let i = 0; i < first.getDay(); i++) {
    html += `<div class="calendar-day blank"></div>`;
  }

  for (let d = 1; d <= last.getDate(); d++) {
    const key = dateKey(new Date(y, m, d));
    const recorded = hasRecord(key);

    const food = recorded ? sumFoods(key) : 0;
    const balance = recorded ? getBalance(key) : 0;
    const sign = balance > 0 ? "+" : "";
    const cls = balance > 0 ? "day-plus" : "day-minus";

    html += `
      <button class="calendar-day" data-date="${key}">
        <div class="day-num">${d}</div>
        ${
          recorded
            ? `
              <div class="day-money ${cls}">${sign}${format(balance)}</div>
              <div class="day-money">${format(food)}kcal</div>
            `
            : `<div class="day-money">-</div>`
        }
      </button>
    `;
  }

  const grid = document.getElementById("calendarGrid");
  grid.innerHTML = html;

  grid.querySelectorAll("[data-date]").forEach(btn => {
    btn.addEventListener("click", () => showDayDetail(btn.dataset.date));
  });
}

function showDayDetail(key) {
  const detail = document.getElementById("dayDetail");

  if (!hasRecord(key)) {
    detail.innerHTML = `<div class="empty">${key} 기록이 없습니다.</div>`;
    return;
  }

  const day = getDay(key);
  const food = sumFoods(key);
  const exercise = sumExercises(key);
  const target = getTargetCalorie();
  const balance = getBalance(key);

  detail.innerHTML = `
    <div class="stat-row">
      <span>${key}</span>
      <strong class="${balance > 0 ? "minus" : "plus"}">
        ${balance > 0 ? "+" : ""}${format(balance)} kcal
      </strong>
    </div>

    <div class="stat-row">
      <span>먹은 칼로리</span>
      <strong>${format(food)} kcal</strong>
    </div>

    <div class="stat-row">
      <span>운동 칼로리</span>
      <strong>${format(exercise)} kcal</strong>
    </div>

    <div class="stat-row">
      <span>기준 대사량</span>
      <strong>${format(target)} kcal</strong>
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
            <div class="item-money plus">${format(item.kcal)} kcal</div>
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
            <div class="item-money minus">-${format(item.kcal)} kcal</div>
            <div></div>
          </div>
        `).join("")
        : `<div class="empty">운동 기록 없음</div>`
    }
  `;
}

/* =========================
   통계
========================= */

function getFirstRecordDate() {
  const keys = Object.keys(state.records)
    .filter(key => hasRecord(key))
    .sort();

  return keys[0] || todayKey();
}

function getDateRange(start, end) {
  const result = [];

  const current = new Date(start);
  const last = new Date(end);

  if (Number.isNaN(current.getTime()) || Number.isNaN(last.getTime())) {
    return [todayKey()];
  }

  while (current <= last) {
    result.push(dateKey(current));
    current.setDate(current.getDate() + 1);
  }

  return result;
}

function renderStats() {
  const start = state.profile.statStartDate || getFirstRecordDate();
  const end = todayKey();

  document.getElementById("statStartDate").value = start;

  const dates = getDateRange(start, end);

  let food = 0;
  let exercise = 0;
  let target = 0;
  let recordDays = 0;

  dates.forEach(key => {
    food += sumFoods(key);
    exercise += sumExercises(key);
    target += getTargetCalorie();

    if (hasRecord(key)) recordDays++;
  });

  const balance = food - exercise - target;

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

  document.getElementById("statResult").innerHTML = `
    <div class="stat-big ${cls}">${label}</div>

    <div class="stat-row">
      <span>계산 시작일</span>
      <strong>${start}</strong>
    </div>

    <div class="stat-row">
      <span>계산 종료일</span>
      <strong>${end}</strong>
    </div>

    <div class="stat-row">
      <span>계산 일수</span>
      <strong>${dates.length}일</strong>
    </div>

    <div class="stat-row">
      <span>기록한 날</span>
      <strong>${recordDays}일</strong>
    </div>

    <div class="stat-row">
      <span>총 섭취</span>
      <strong>${format(food)} kcal</strong>
    </div>

    <div class="stat-row">
      <span>총 운동</span>
      <strong>${format(exercise)} kcal</strong>
    </div>

    <div class="stat-row">
      <span>기준 대사량 합계</span>
      <strong>${format(target)} kcal</strong>
    </div>

    <div class="stat-row">
      <span>최종 결과</span>
      <strong class="${balance > 0 ? "minus" : "plus"}">
        ${balance > 0 ? "+" : ""}${format(balance)} kcal
      </strong>
    </div>
  `;
}

/* =========================
   오늘 요약
========================= */

function renderToday() {
  const food = sumFoods();
  const exercise = sumExercises();
  const target = getTargetCalorie();
  const balance = hasRecord(todayKey()) ? getBalance() : 0;

  const balanceEl = document.getElementById("todayBalance");
  const summaryEl = document.getElementById("todaySummary");

  balanceEl.textContent = `${balance > 0 ? "+" : ""}${format(balance)} kcal`;
  balanceEl.className = `hero-value ${balance > 0 ? "minus" : "plus"}`;

  summaryEl.textContent =
    `섭취 ${format(food)} · 운동 ${format(exercise)} · 기준 ${format(target)}`;
}

/* =========================
   전체 렌더링
========================= */

function renderAll() {
  renderProfile();
  renderPresets();
  renderFoodList();
  renderExerciseList();
  renderCalendar();
  renderStats();
  renderToday();
}

/* =========================
   이벤트 연결
========================= */

function bindEvents() {
  document.getElementById("themeBtn").addEventListener("click", toggleTheme);
  document.getElementById("loginBtn").addEventListener("click", toggleLogin);

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showTab(btn.dataset.tab);
    });
  });

  document.getElementById("fab").addEventListener("click", () => {
    if (currentTab === "food") openEntry("food");
    else if (currentTab === "exercise") openEntry("exercise");
    else if (currentTab === "info") openPresetAdd();
  });

  document.getElementById("overlay").addEventListener("click", closeOverlay);
  document.getElementById("entryCloseBtn").addEventListener("click", closeOverlay);
  document.getElementById("entryCancelBtn").addEventListener("click", closeOverlay);
  document.getElementById("presetCloseBtn").addEventListener("click", closeOverlay);
  document.getElementById("presetCancelBtn").addEventListener("click", closeOverlay);

  document.getElementById("entrySaveBtn").addEventListener("click", saveEntry);
  document.getElementById("presetSaveBtn").addEventListener("click", savePreset);

  document.getElementById("entryName").addEventListener("input", autoFillKcal);
  document.getElementById("entryQty").addEventListener("input", autoFillKcal);

  document.getElementById("calcBmrBtn").addEventListener("click", calcBmr);
  document.getElementById("saveDailyBtn").addEventListener("click", saveDailyCalorie);
  document.getElementById("saveStatStartBtn").addEventListener("click", saveStatStartDate);
  document.getElementById("addPresetBtn").addEventListener("click", openPresetAdd);

  document.getElementById("prevMonthBtn").addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  });

  document.getElementById("nextMonthBtn").addEventListener("click", () => {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  });
}

/* =========================
   앱 시작
========================= */

document.addEventListener("DOMContentLoaded", () => {
  loadTheme();
  bindEvents();
  initAuth();
  renderAll();
  showTab("food");
});