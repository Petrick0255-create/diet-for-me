/* app.js
   앱 시작점
*/

import {
  loadLocalState,
  syncFromCloudIfAvailable,
  applyCloudState,
  forceCloudSave
} from "./storage.js";

import {
  listenAuth,
  loginGoogle,
  logoutGoogle,
  startCloudSync,
  stopCloudSync,
  getCurrentUser
} from "./firebase.js";

import {
  initTheme,
  toggleTheme,
  showScreen,
  getCurrentScreen,
  bindTabs,
  bindCommonButtons,
  closeAllModals,
  setUserStatus
} from "./ui.js";

import {
  initProfile,
  renderProfile,
  renderMyFoods
} from "./profile.js";

import {
  initAutocomplete,
  renderFoodDatalist
} from "./autocomplete.js";

import {
  initFood,
  openFoodAdd,
  renderFoodList
} from "./food.js";

import {
  initExercise,
  openExerciseAdd,
  renderExerciseList
} from "./exercise.js";

import {
  initCalendar,
  renderCalendar
} from "./calendar.js";

import {
  initStatistics,
  renderStatistics
} from "./statistics.js";

document.addEventListener("DOMContentLoaded", initApp);

function initApp() {
  loadLocalState();

  initTheme();
  bindGlobalEvents();

  initProfile();
  initAutocomplete();
  initFood();
  initExercise();
  initCalendar();
  initStatistics();

  listenAuth(handleAuthChange);

  renderAll();
  showScreen("food");
}

function bindGlobalEvents() {
  bindTabs(() => {
    renderAll();
  });

  bindCommonButtons({
    onTheme: toggleTheme,

    onLogin: () => {
      const user = getCurrentUser();

      if (user) {
        logoutGoogle();
      } else {
        loginGoogle();
      }
    },

    onFab: () => {
      const screen = getCurrentScreen();

      if (screen === "food") {
        openFoodAdd();
        return;
      }

      if (screen === "exercise") {
        openExerciseAdd();
        return;
      }

      if (screen === "info") {
        document.getElementById("openFoodPresetBtn")?.click();
      }
    },

    onClose: () => {
      closeAllModals();
    }
  });
}

async function handleAuthChange(user) {
  setUserStatus(user);

  if (!user) {
    stopCloudSync();
    renderAll();
    return;
  }

  await syncFromCloudIfAvailable();

  startCloudSync(user.uid, cloudState => {
    applyCloudState(cloudState);
    renderAll();
  });

  await forceCloudSave();

  renderAll();
}

function renderAll() {
  renderProfile();
  renderMyFoods();
  renderFoodDatalist();

  renderFoodList();
  renderExerciseList();
  renderCalendar();
  renderStatistics();

  renderTodayHero();
}

function renderTodayHero() {
  const hero = document.getElementById("todaySummary");
  const balanceEl = document.getElementById("todayBalance");

  if (!hero || !balanceEl) return;

  import("./storage.js").then(({ getState }) => {
    import("./data.js").then(({ todayKey, getDayRecord, getDailyTarget }) => {
      const state = getState();
      const day = getDayRecord(state, todayKey());

      const food = day.foods.reduce((sum, item) => {
        return sum + Number(item.kcal || 0);
      }, 0);

      const exercise = day.exercises.reduce((sum, item) => {
        return sum + Number(item.kcal || 0);
      }, 0);

      const target = getDailyTarget(state.profile);
      const balance = food - exercise - target;

      balanceEl.textContent = `${balance > 0 ? "+" : ""}${balance.toLocaleString()} kcal`;
      balanceEl.className = `hero-value ${balance > 0 ? "minus" : "plus"}`;

      hero.textContent =
        `섭취 ${food.toLocaleString()} · 운동 ${exercise.toLocaleString()} · 기준 ${target.toLocaleString()}`;
    });
  });
}