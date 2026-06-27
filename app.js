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
  onSnapshot
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* =========================
   Firebase 설정
   ========================= */

const firebaseConfig = {
  apiKey: "AIzaSyBwAA3jUPVQMMR61QSAM4-z7G24u4HrAT8",
  authDomain: "diet-for-me-a8b33.firebaseapp.com",
  projectId: "diet-for-me-a8b33",
  storageBucket: "diet-for-me-a8b33.firebasestorage.app",
  messagingSenderId: "766739395332",
  appId: "1:766739395332:web:624056073881ecb80bd651"
};

const fbApp = initializeApp(firebaseConfig);
const auth = getAuth(fbApp);
const db = getFirestore(fbApp);
const provider = new GoogleAuthProvider();

let currentUser = null;
let unsubscribeSync = null;

/* =========================
   기본 데이터
   ========================= */

const foodPresets = [
  ["바나나", 105, 27, 1.3, 0.3],
  ["아보카도", 240, 13, 3, 22],
  ["밥 한공기", 300, 65, 6, 1],
  ["돼지갈비 1인분", 480, 15, 30, 32],
  ["돈까스 1장", 700, 55, 28, 40],
  ["치킨 1조각", 250, 8, 18, 16],
  ["닭가슴살", 165, 0, 31, 3.6]
];

const exercisePresets = [
  ["걷기", "30분", 120],
  ["달리기", "30분", 300],
  ["헬스", "30분", 180],
  ["필라테스", "1시간", 220]
];

const meals = ["아침", "점심", "저녁", "간식", "야식"];

let data = JSON.parse(localStorage.getItem("foodAccountData") || "{}");
let profile = JSON.parse(localStorage.getItem("foodAccountProfile") || "{}");

let currentScreen = "food";
let selectedMeal = "아침";
let viewDate = new Date();

/* =========================
   날짜 함수
   ========================= */

function today() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function dateKey(y, m, d) {
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function getDay(date = today()) {
  if (!data[date]) {
    data[date] = {
      foods: [],
      exercises: []
    };
  }

  return data[date];
}

/* =========================
   저장 / 동기화
   ========================= */

async function saveData() {
  localStorage.setItem("foodAccountData", JSON.stringify(data));
  localStorage.setItem("foodAccountProfile", JSON.stringify(profile));

  if (currentUser) {
    await setDoc(doc(db, "foodAccounts", currentUser.uid), {
      data,
      profile,
      updatedAt: Date.now()
    });
  }

  render();
}

function startSync(user) {
  if (unsubscribeSync) unsubscribeSync();

  const ref = doc(db, "foodAccounts", user.uid);

  unsubscribeSync = onSnapshot(ref, snapshot => {
    if (!snapshot.exists()) {
      setDoc(ref, {
        data,
        profile,
        updatedAt: Date.now()
      });
      return;
    }

    const cloud = snapshot.data();

    data = cloud.data || {};
    profile = cloud.profile || {};

    localStorage.setItem("foodAccountData", JSON.stringify(data));
    localStorage.setItem("foodAccountProfile", JSON.stringify(profile));

    loadProfile();
    render();
  });
}

/* =========================
   로그인
   ========================= */

async function loginGoogle() {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    console.error(error);
    alert(error.code + "\n\n" + error.message);
  }
}

async function logoutGoogle() {
  await signOut(auth);
}

onAuthStateChanged(auth, user => {
  currentUser = user;

  const loginBtn = document.getElementById("loginBtn");
  const userStatus = document.getElementById("userStatus");

  if (user) {
    loginBtn.textContent = "로그아웃";
    userStatus.textContent = user.email || "구글 로그인됨";
    startSync(user);
  } else {
    loginBtn.textContent = "구글 로그인";
    userStatus.textContent = "로그인하지 않음";

    if (unsubscribeSync) {
      unsubscribeSync();
      unsubscribeSync = null;
    }
  }
});

/* =========================
   프로필 / 기초대사량
   ========================= */

function saveProfile() {
  const h = Number(document.getElementById("height").value);
  const w = Number(document.getElementById("weight").value);
  const a = Number(document.getElementById("age").value);
  const g = document.getElementById("gender").value;

  if (!h || !w || !a) {
    alert("키, 몸무게, 나이를 입력하세요.");
    return;
  }

  let bmr;

  if (g === "male") {
    bmr = Math.round(10 * w + 6.25 * h - 5 * a + 5);
  } else {
    bmr = Math.round(10 * w + 6.25 * h - 5 * a - 161);
  }

  profile = {
    height: h,
    weight: w,
    age: a,
    gender: g,
    bmr
  };

  saveData();
}

function loadProfile() {
  if (profile.height) document.getElementById("height").value = profile.height;
  if (profile.weight) document.getElementById("weight").value = profile.weight;
  if (profile.age) document.getElementById("age").value = profile.age;
  if (profile.gender) document.getElementById("gender").value = profile.gender;
}

function totals(date = today()) {
  const d = getDay(date);

  const food = d.foods.reduce((sum, item) => {
    return sum + Number(item.kcal || 0);
  }, 0);

  const exercise = d.exercises.reduce((sum, item) => {
    return sum + Number(item.kcal || 0);
  }, 0);

  const bmr = Number(profile.bmr || 0);
  const balance = food - exercise - bmr;

  return {
    food,
    exercise,
    bmr,
    balance
  };
}

/* =========================
   화면 전환
   ========================= */

function showScreen(screen) {
  currentScreen = screen;

  document.querySelectorAll(".screen").forEach(el => {
    el.classList.remove("active");
  });

  document.getElementById(`screen-${screen}`).classList.add("active");

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  document.querySelector(`.tab-btn[data-screen="${screen}"]`).classList.add("active");

  document.getElementById("fab").style.display =
    screen === "food" || screen === "exercise" ? "block" : "none";

  render();
}

/* =========================
   입력창
   ========================= */

function openEntry() {
  selectedMeal = "아침";

  document.getElementById("entryOverlay").classList.remove("hidden");
  document.getElementById("entrySheet").classList.remove("hidden");

  document.getElementById("entryDate").value = today();
  document.getElementById("entryName").value = "";
  document.getElementById("entryKcal").value = "";
  document.getElementById("entryTime").value = "";

  if (currentScreen === "food") {
    document.getElementById("entryTitle").textContent = "먹은 거 추가";
    document.getElementById("mealLabel").textContent = "구분";

    document.getElementById("timeLabel").classList.add("hidden");
    document.getElementById("entryTime").classList.add("hidden");

    renderMealChips();
  }

  if (currentScreen === "exercise") {
    document.getElementById("entryTitle").textContent = "운동 추가";
    document.getElementById("mealLabel").textContent = "운동";

    document.getElementById("timeLabel").classList.remove("hidden");
    document.getElementById("entryTime").classList.remove("hidden");

    document.getElementById("mealGrid").innerHTML = "";
  }
}

function closeEntry() {
  document.getElementById("entryOverlay").classList.add("hidden");
  document.getElementById("entrySheet").classList.add("hidden");
}

function renderMealChips() {
  const grid = document.getElementById("mealGrid");

  grid.innerHTML = meals.map(meal => `
    <button
      class="category-chip ${meal === selectedMeal ? "active" : ""}"
      data-meal="${meal}"
    >
      ${meal}
    </button>
  `).join("");

  document.querySelectorAll(".category-chip").forEach(btn => {
    btn.addEventListener("click", () => {
      selectedMeal = btn.dataset.meal;
      renderMealChips();
    });
  });
}

function saveEntry() {
  const date = document.getElementById("entryDate").value || today();
  const name = document.getElementById("entryName").value.trim();
  const kcal = Number(document.getElementById("entryKcal").value);
  const time = Number(document.getElementById("entryTime").value);

  if (!name || !kcal) {
    alert("이름과 칼로리를 입력하세요.");
    return;
  }

  const d = getDay(date);

  if (currentScreen === "food") {
    d.foods.push({
      meal: selectedMeal,
      name,
      kcal
    });
  }

  if (currentScreen === "exercise") {
    d.exercises.push({
      name,
      min: time || 0,
      kcal
    });
  }

  closeEntry();
  saveData();
}

function removeFood(index) {
  getDay().foods.splice(index, 1);
  saveData();
}

function removeExercise(index) {
  getDay().exercises.splice(index, 1);
  saveData();
}

function renderFoodList() {
  const d = getDay();
  const list = document.getElementById("foodList");

  if (d.foods.length === 0) {
    list.innerHTML = `<div class="empty">아직 입력한 음식이 없습니다.</div>`;
    return;
  }

  list.innerHTML = d.foods.map((item, index) => `
    <div class="list-item">
      <div>
        <div class="item-main">${item.meal} · ${item.name}</div>
        <div class="item-sub">섭취 기록</div>
      </div>
      <div class="item-money plus">${item.kcal} kcal</div>
      <button class="more-btn" data-food-index="${index}">×</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-food-index]").forEach(btn => {
    btn.addEventListener("click", () => {
      removeFood(Number(btn.dataset.foodIndex));
    });
  });
}

function renderExerciseList() {
  const d = getDay();
  const list = document.getElementById("exerciseList");

  if (d.exercises.length === 0) {
    list.innerHTML = `<div class="empty">아직 입력한 운동이 없습니다.</div>`;
    return;
  }

  list.innerHTML = d.exercises.map((item, index) => `
    <div class="list-item">
      <div>
        <div class="item-main">${item.name}</div>
        <div class="item-sub">${item.min || 0}분 운동</div>
      </div>
      <div class="item-money minus">-${item.kcal} kcal</div>
      <button class="more-btn" data-exercise-index="${index}">×</button>
    </div>
  `).join("");

  document.querySelectorAll("[data-exercise-index]").forEach(btn => {
    btn.addEventListener("click", () => {
      removeExercise(Number(btn.dataset.exerciseIndex));
    });
  });
}

function renderPresetTables() {
  document.getElementById("foodPresetTable").innerHTML = foodPresets.map(item => `
    <tr>
      <td>${item[0]}</td>
      <td>${item[1]}</td>
      <td>${item[2]}g</td>
      <td>${item[3]}g</td>
      <td>${item[4]}g</td>
    </tr>
  `).join("");

  document.getElementById("exercisePresetTable").innerHTML = exercisePresets.map(item => `
    <tr>
      <td>${item[0]}</td>
      <td>${item[1]}</td>
      <td>${item[2]}</td>
    </tr>
  `).join("");
}

function changeMonth(diff) {
  viewDate.setMonth(viewDate.getMonth() + diff);
  renderCalendar();
  renderStats();
}

function renderCalendar() {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth() + 1;

  document.getElementById("monthLabel").textContent = `${y}년 ${m}월`;

  const first = new Date(y, m - 1, 1);
  const last = new Date(y, m, 0).getDate();
  const startDay = first.getDay();

  let html = ["일", "월", "화", "수", "목", "금", "토"]
    .map(day => `<div class="day-name">${day}</div>`)
    .join("");

  for (let i = 0; i < startDay; i++) {
    html += `<div class="calendar-day blank"></div>`;
  }

  for (let d = 1; d <= last; d++) {
    const key = dateKey(y, m, d);
    const t = totals(key);
    const sign = t.balance > 0 ? "+" : "";
    const cls = t.balance > 0 ? "day-plus" : "day-minus";

    html += `
      <button class="calendar-day" data-detail-date="${key}">
        <div class="day-num">${d}</div>
        <div class="day-money ${cls}">${sign}${t.balance}</div>
        <div class="day-money">${t.food}kcal</div>
      </button>
    `;
  }

  document.getElementById("calendarGrid").innerHTML = html;

  document.querySelectorAll("[data-detail-date]").forEach(btn => {
    btn.addEventListener("click", () => {
      showDayDetail(btn.dataset.detailDate);
    });
  });
}

function showDayDetail(date) {
  const d = getDay(date);
  const t = totals(date);

  document.getElementById("dayDetail").innerHTML = `
    <div class="stat-row">
      <span>${date}</span>
      <strong class="${t.balance > 0 ? "minus" : "plus"}">
        ${t.balance > 0 ? "+" : ""}${t.balance} kcal
      </strong>
    </div>

    <div class="stat-row">
      <span>먹은 칼로리</span>
      <strong>${t.food} kcal</strong>
    </div>

    <div class="stat-row">
      <span>운동 칼로리</span>
      <strong>${t.exercise} kcal</strong>
    </div>

    <div class="stat-row">
      <span>기초대사량</span>
      <strong>${t.bmr} kcal</strong>
    </div>

    <br>

    <div class="card-title">먹은 것</div>
    ${
      d.foods.length
        ? d.foods.map(item => `
          <div class="list-item">
            <div>
              <div class="item-main">${item.meal} · ${item.name}</div>
              <div class="item-sub">섭취 기록</div>
            </div>
            <div class="item-money plus">${item.kcal} kcal</div>
            <div></div>
          </div>
        `).join("")
        : `<div class="empty">먹은 기록 없음</div>`
    }

    <br>

    <div class="card-title">운동</div>
    ${
      d.exercises.length
        ? d.exercises.map(item => `
          <div class="list-item">
            <div>
              <div class="item-main">${item.name}</div>
              <div class="item-sub">${item.min || 0}분 운동</div>
            </div>
            <div class="item-money minus">-${item.kcal} kcal</div>
            <div></div>
          </div>
        `).join("")
        : `<div class="empty">운동 기록 없음</div>`
    }
  `;
}

function renderStats() {
  const y = viewDate.getFullYear();
  const m = viewDate.getMonth() + 1;
  const last = new Date(y, m, 0).getDate();

  let food = 0;
  let exercise = 0;
  let bmr = 0;
  let balance = 0;

  for (let d = 1; d <= last; d++) {
    const key = dateKey(y, m, d);
    const t = totals(key);

    food += t.food;
    exercise += t.exercise;
    bmr += t.bmr;
    balance += t.balance;
  }

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
      <span>이번 달 섭취</span>
      <strong>${food} kcal</strong>
    </div>

    <div class="stat-row">
      <span>이번 달 운동</span>
      <strong>${exercise} kcal</strong>
    </div>

    <div class="stat-row">
      <span>이번 달 기초대사량 합계</span>
      <strong>${bmr} kcal</strong>
    </div>

    <div class="stat-row">
      <span>이번 달 최종 결과</span>
      <strong class="${balance > 0 ? "minus" : "plus"}">
        ${balance > 0 ? "+" : ""}${balance} kcal
      </strong>
    </div>
  `;
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
  } else {
    document.getElementById("themeBtn").textContent = "☀️";
  }
}

function render() {
  document.getElementById("bmrText").textContent = profile.bmr ? profile.bmr : "-";

  const t = totals();

  document.getElementById("todayFood").textContent = t.food;
  document.getElementById("todayBalance").textContent =
    `${t.balance > 0 ? "+" : ""}${t.balance}`;

  renderFoodList();
  renderExerciseList();
  renderPresetTables();
  renderCalendar();
  renderStats();
}

function bindEvents() {
  document.getElementById("themeBtn").addEventListener("click", toggleTheme);
  document.getElementById("loginBtn").addEventListener("click", () => {
    if (currentUser) {
      logoutGoogle();
    } else {
      loginGoogle();
    }
  });

  document.getElementById("profileSaveBtn").addEventListener("click", saveProfile);
  document.getElementById("fab").addEventListener("click", openEntry);

  document.getElementById("entryOverlay").addEventListener("click", closeEntry);
  document.getElementById("entryCloseBtn").addEventListener("click", closeEntry);
  document.getElementById("entryCancelBtn").addEventListener("click", closeEntry);
  document.getElementById("entrySaveBtn").addEventListener("click", saveEntry);

  document.getElementById("prevMonthBtn").addEventListener("click", () => changeMonth(-1));
  document.getElementById("nextMonthBtn").addEventListener("click", () => changeMonth(1));

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      showScreen(btn.dataset.screen);
    });
  });
}

bindEvents();
loadTheme();
loadProfile();
render();