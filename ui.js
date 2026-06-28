/* ui.js
   화면 전환 / 공통 UI / 다크모드 / 모달 열고 닫기
*/

let currentScreen = "food";
let currentModal = null;

export function getCurrentScreen() {
  return currentScreen;
}

export function setCurrentScreen(screen) {
  currentScreen = screen;
}

export function initTheme() {
  const savedTheme = localStorage.getItem("foodAccountTheme");

  if (savedTheme === "light") {
    document.body.classList.add("light");
  }

  updateThemeButton();
}

export function toggleTheme() {
  document.body.classList.toggle("light");

  const isLight = document.body.classList.contains("light");
  localStorage.setItem("foodAccountTheme", isLight ? "light" : "dark");

  updateThemeButton();
}

function updateThemeButton() {
  const btn = document.getElementById("themeBtn");
  if (!btn) return;

  btn.textContent = document.body.classList.contains("light") ? "🌙" : "☀️";
}

export function showScreen(screen) {
  currentScreen = screen;

  document.querySelectorAll(".screen").forEach(el => {
    el.classList.remove("active");
  });

  const target = document.getElementById(`screen-${screen}`);
  if (target) target.classList.add("active");

  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.classList.remove("active");
  });

  const tab = document.querySelector(`.tab-btn[data-screen="${screen}"]`);
  if (tab) tab.classList.add("active");

  const fab = document.getElementById("fab");

  if (fab) {
    fab.style.display =
      screen === "food" || screen === "exercise" || screen === "info"
        ? "block"
        : "none";
  }
}

export function openModal(modalId) {
  closeAllModals();

  const overlay = document.getElementById("entryOverlay");
  const modal = document.getElementById(modalId);

  if (overlay) overlay.classList.remove("hidden");
  if (modal) modal.classList.remove("hidden");

  currentModal = modalId;
}

export function closeAllModals() {
  const overlay = document.getElementById("entryOverlay");
  if (overlay) overlay.classList.add("hidden");

  document.querySelectorAll(".entry-sheet").forEach(sheet => {
    sheet.classList.add("hidden");
  });

  currentModal = null;
}

export function getCurrentModal() {
  return currentModal;
}

export function setUserStatus(user) {
  const status = document.getElementById("userStatus");
  const loginBtn = document.getElementById("loginBtn");

  if (!status || !loginBtn) return;

  if (user) {
    status.textContent = user.email || "구글 로그인됨";
    loginBtn.textContent = "로그아웃";
  } else {
    status.textContent = "로그인하지 않음";
    loginBtn.textContent = "구글 로그인";
  }
}

export function formatKcal(value) {
  const n = Number(value || 0);
  const sign = n > 0 ? "+" : "";
  return `${sign}${n.toLocaleString()} kcal`;
}

export function formatNumber(value) {
  return Number(value || 0).toLocaleString();
}

export function setText(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export function setValue(id, value) {
  const el = document.getElementById(id);
  if (el) el.value = value ?? "";
}

export function getValue(id) {
  const el = document.getElementById(id);
  if (!el) return "";
  return el.value;
}

export function getNumber(id) {
  return Number(getValue(id) || 0);
}

export function clearElement(id) {
  const el = document.getElementById(id);
  if (el) el.innerHTML = "";
}

export function renderEmpty(id, text) {
  const el = document.getElementById(id);
  if (!el) return;

  el.innerHTML = `<div class="empty">${text}</div>`;
}

export function bindTabs(onChange) {
  document.querySelectorAll(".tab-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const screen = btn.dataset.screen;
      showScreen(screen);
      onChange?.(screen);
    });
  });
}

export function bindCommonButtons({ onTheme, onLogin, onFab, onClose }) {
  document.getElementById("themeBtn")?.addEventListener("click", onTheme);
  document.getElementById("loginBtn")?.addEventListener("click", onLogin);
  document.getElementById("fab")?.addEventListener("click", onFab);

  document.getElementById("entryOverlay")?.addEventListener("click", onClose);

  document.querySelectorAll(".entry-close, .entry-cancel").forEach(btn => {
    btn.addEventListener("click", onClose);
  });
}