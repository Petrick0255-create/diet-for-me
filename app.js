import {
  auth, db, provider,
  signInWithPopup, signOut, onAuthStateChanged,
  doc, collection, setDoc, deleteDoc, onSnapshot
} from "./firebase.js";

import {
  renderCalendar,
  selectedCalendarDate
} from "./calendar.js";

const categories = {
  expense: ["식비", "카페", "교통", "쇼핑", "데이트", "취미", "주거", "의료", "업무", "기타"],
  income: ["월급", "상여", "부수입", "기타"],
  estate: ["월세 입금", "관리비", "수선비", "세금", "대출이자", "기타"]
};

let currentUser = null;
let records = [];
let unsubscribeRecords = null;
let currentTab = "expense";
let viewDate = new Date();
viewDate.setDate(1);

let currentTheme = localStorage.getItem("moneyLogTheme") || "dark";

let editingRecord = null;
let entryType = "expense";
let entryCategory = "식비";
let selectedActionRecord = null;

function ym() {
  return `${viewDate.getFullYear()}-${String(viewDate.getMonth() + 1).padStart(2, "0")}`;
}

function today() {
  return new Date().toISOString().slice(0, 10);
}

function money(value) {
  return Number(value).toLocaleString("ko-KR") + "원";
}

function recordsCol() {
  return collection(db, "users", currentUser.uid, "records");
}

function recordRef(id) {
  return doc(db, "users", currentUser.uid, "records", String(id));
}

function setSync(text) {
  document.getElementById("syncStatus").textContent = text;
}

function monthRecords(type) {
  return records.filter(r => r.type === type && String(r.date).startsWith(ym()));
}

function total(type) {
  return monthRecords(type).reduce((sum, r) => sum + Number(r.amount), 0);
}

function typeLabel(type) {
  if (type === "expense") return "지출";
  if (type === "income") return "수입";
  return "부동산";
}

function applyTheme() {
  const btn = document.getElementById("themeBtn");

  if (currentTheme === "light") {
    document.body.classList.add("light");
    btn.textContent = "☀️";
  } else {
    document.body.classList.remove("light");
    btn.textContent = "🌙";
  }

  localStorage.setItem("moneyLogTheme", currentTheme);
}

function updateAddButton() {
  const addBtn = document.getElementById("addBtn");

  if (!currentUser || currentTab === "calendar" || currentTab === "stats") {
    addBtn.classList.add("hidden");
  } else {
    addBtn.classList.remove("hidden");
  }
}

document.getElementById("themeBtn").addEventListener("click", () => {
  currentTheme = currentTheme === "dark" ? "light" : "dark";
  applyTheme();
});

document.getElementById("loginBtn").addEventListener("click", async () => {
  try {
    await signInWithPopup(auth, provider);
  } catch (error) {
    alert("로그인 실패: " + error.message);
  }
});

document.getElementById("logoutBtn").addEventListener("click", async () => {
  await signOut(auth);
});

onAuthStateChanged(auth, user => {
  if (!user) {
    currentUser = null;
    records = [];

    if (unsubscribeRecords) {
      unsubscribeRecords();
      unsubscribeRecords = null;
    }

    document.getElementById("loginBox").classList.remove("hidden");
    document.getElementById("app").classList.add("hidden");
    document.getElementById("bottomNav").classList.add("hidden");
    updateAddButton();
    return;
  }

  currentUser = user;

  document.getElementById("userEmail").textContent = user.email;
  document.getElementById("loginBox").classList.add("hidden");
  document.getElementById("app").classList.remove("hidden");
  document.getElementById("bottomNav").classList.remove("hidden");

  updateAddButton();
  listenRecords();
});

function listenRecords() {
  setSync("Firebase 연결 중...");

  if (unsubscribeRecords) unsubscribeRecords();

  unsubscribeRecords = onSnapshot(
    recordsCol(),
    snapshot => {
      records = snapshot.docs.map(d => d.data());

      records.sort((a, b) => {
        const dateDiff = String(b.date).localeCompare(String(a.date));
        if (dateDiff !== 0) return dateDiff;
        return Number(b.id) - Number(a.id);
      });

      setSync("동기화 완료");
      render();
    },
    error => {
      setSync("동기화 오류");
      alert("Firestore 오류: " + error.message);
    }
  );
}

document.getElementById("prevMonth").addEventListener("click", () => {
  viewDate.setMonth(viewDate.getMonth() - 1);
  render();
});

document.getElementById("nextMonth").addEventListener("click", () => {
  viewDate.setMonth(viewDate.getMonth() + 1);
  render();
});

document.querySelectorAll(".tab-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    currentTab = btn.dataset.tab;

    document.querySelectorAll(".tab-btn").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");

    document.querySelectorAll(".screen").forEach(screen => screen.classList.remove("active"));
    document.getElementById(`${currentTab}Screen`).classList.add("active");

    updateAddButton();
    render();
  });
});

document.getElementById("addBtn").addEventListener("click", () => {
  const type = ["income", "estate"].includes(currentTab) ? currentTab : "expense";
  openEntrySheet(type);
});

function openEntrySheet(type, record = null) {
  editingRecord = record;
  entryType = type;
  entryCategory = record?.category || categories[type][0];

  document.getElementById("entryTitle").textContent =
    record ? "기록 수정" : `${typeLabel(type)} 입력`;

  document.getElementById("entryDate").value =
    record?.date || selectedCalendarDate || today();

  document.getElementById("entryAmount").value =
    record?.amount || "";

  document.getElementById("entryMemo").value =
    record?.memo || "";

  renderEntryCategories();

  document.getElementById("entryOverlay").classList.remove("hidden");
  document.getElementById("entrySheet").classList.remove("hidden");

  setTimeout(() => {
    document.getElementById("entryAmount").focus();
  }, 200);
}

function closeEntrySheet() {
  document.getElementById("entryOverlay").classList.add("hidden");
  document.getElementById("entrySheet").classList.add("hidden");
  editingRecord = null;
}

function renderEntryCategories() {
  document.getElementById("entryCategories").innerHTML =
    categories[entryType].map(c => `
      <button class="category-chip ${c === entryCategory ? "active" : ""}" data-category="${c}">
        ${c}
      </button>
    `).join("");
}

document.getElementById("entryCategories").addEventListener("click", e => {
  const btn = e.target.closest(".category-chip");
  if (!btn) return;

  entryCategory = btn.dataset.category;
  renderEntryCategories();
});

document.getElementById("entryCloseBtn").addEventListener("click", closeEntrySheet);
document.getElementById("entryOverlay").addEventListener("click", closeEntrySheet);

document.getElementById("entrySaveBtn").addEventListener("click", async () => {
  const date = document.getElementById("entryDate").value || today();
  const amount = Number(document.getElementById("entryAmount").value);
  const memo = document.getElementById("entryMemo").value.trim();

  if (!amount) return alert("금액을 입력하세요.");

  const id = editingRecord?.id || Date.now();

  const data = {
    id,
    type: entryType,
    date,
    amount,
    category: entryCategory,
    memo,
    updatedAt: new Date().toISOString()
  };

  try {
    setSync(editingRecord ? "수정 중..." : "저장 중...");
    await setDoc(recordRef(id), data);
    setSync(editingRecord ? "수정 완료" : "저장 완료");
    closeEntrySheet();
  } catch (error) {
    setSync("저장 실패");
    alert("저장 실패: " + error.message);
  }
});

function renderList(targetId, type) {
  const target = document.getElementById(targetId);
  const data = monthRecords(type);

  if (!data.length) {
    target.innerHTML = `<div class="empty">아직 기록이 없습니다.</div>`;
    return;
  }

  target.innerHTML = data.map(r => renderRecordItem(r)).join("");
}

function renderRecordItem(r) {
  const sign = r.type === "expense" ? "-" : "+";
  const cls = r.type === "expense" ? "minus" : "plus";

  return `
    <div class="list-item">
      <div>
        <div class="item-main">${r.memo || r.category}</div>
        <div class="item-sub">${r.date} · ${typeLabel(r.type)} · ${r.category}</div>
      </div>

      <div class="item-money ${cls}">
        ${sign}${money(r.amount)}
      </div>

      <button class="more-btn" data-id="${r.id}">⋯</button>
    </div>
  `;
}

document.addEventListener("click", e => {
  const btn = e.target.closest(".more-btn");
  if (!btn) return;

  const id = Number(btn.dataset.id);
  const record = records.find(r => Number(r.id) === id);
  if (!record) return;

  selectedActionRecord = record;

  document.getElementById("actionTitle").textContent =
    `${record.memo || record.category} · ${money(record.amount)}`;

  document.getElementById("actionOverlay").classList.remove("hidden");
  document.getElementById("actionSheet").classList.remove("hidden");
});

function closeActionSheet() {
  selectedActionRecord = null;
  document.getElementById("actionOverlay").classList.add("hidden");
  document.getElementById("actionSheet").classList.add("hidden");
}

document.getElementById("actionCancelBtn").addEventListener("click", closeActionSheet);
document.getElementById("actionOverlay").addEventListener("click", closeActionSheet);

document.getElementById("actionEditBtn").addEventListener("click", () => {
  if (!selectedActionRecord) return;

  const record = selectedActionRecord;
  closeActionSheet();
  openEntrySheet(record.type, record);
});

document.getElementById("actionDeleteBtn").addEventListener("click", async () => {
  if (!selectedActionRecord) return;

  const record = selectedActionRecord;

  if (!confirm(`"${record.memo || record.category}" 기록을 삭제할까요?`)) return;

  try {
    setSync("삭제 중...");
    await deleteDoc(recordRef(record.id));
    setSync("삭제 완료");
    closeActionSheet();
  } catch (error) {
    setSync("삭제 실패");
    alert("삭제 실패: " + error.message);
  }
});

document.getElementById("rentBtn").addEventListener("click", async () => {
  const date = `${ym()}-06`;

  const exists = records.some(r =>
    r.type === "estate" &&
    r.category === "월세 입금" &&
    r.date === date &&
    Number(r.amount) === 350000
  );

  if (exists) {
    alert("이미 이번 달 월세 기록이 있습니다.");
    return;
  }

  if (!confirm(`${date}에 월세 350,000원을 생성할까요?`)) return;

  const id = Date.now();

  const data = {
    id,
    type: "estate",
    date,
    amount: 350000,
    category: "월세 입금",
    memo: "월세 입금",
    updatedAt: new Date().toISOString()
  };

  try {
    setSync("월세 생성 중...");
    await setDoc(recordRef(id), data);
    setSync("월세 생성 완료");
  } catch (error) {
    setSync("월세 생성 실패");
    alert("월세 생성 실패: " + error.message);
  }
});

function renderCategoryStats() {
  const target = document.getElementById("categoryStats");
  const map = {};

  monthRecords("expense").forEach(r => {
    map[r.category] = (map[r.category] || 0) + Number(r.amount);
  });

  const arr = Object.entries(map).sort((a, b) => b[1] - a[1]);

  if (!arr.length) {
    target.innerHTML = `<div class="empty">아직 통계가 없습니다.</div>`;
    return;
  }

  target.innerHTML = arr.map(([category, value]) => `
    <div class="stat-row">
      <span>${category}</span>
      <strong>${money(value)}</strong>
    </div>
  `).join("");
}

function render() {
  const e = total("expense");
  const i = total("income");
  const estate = total("estate");

  document.getElementById("monthLabel").textContent =
    `${viewDate.getFullYear()}년 ${viewDate.getMonth() + 1}월`;

  document.getElementById("expenseTotal").textContent = money(e);
  document.getElementById("incomeTotal").textContent = money(i);
  document.getElementById("estateTotal").textContent = money(estate);

  document.getElementById("statExpense").textContent = money(e);
  document.getElementById("statIncome").textContent = money(i);
  document.getElementById("statEstate").textContent = money(estate);
  document.getElementById("statRemain").textContent = money(i + estate - e);

  renderList("expenseList", "expense");
  renderList("incomeList", "income");
  renderList("estateList", "estate");
  renderCategoryStats();
  renderCalendar(records, viewDate);
  updateAddButton();
}

applyTheme();
render();