export function createCalendarModule(ctx) {
  let currentMonth = new Date();

  function dateKey(date) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    return `${y}-${m}-${d}`;
  }

  function todayKey() {
    return dateKey(new Date());
  }

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
      const recorded = ctx.hasRecord(key);

      const food = recorded ? ctx.sumFoods(key) : 0;
      const balance = recorded ? ctx.getBalance(key) : 0;

      const sign = balance > 0 ? "+" : "";
      const cls = balance > 0 ? "day-plus" : "day-minus";

      html += `
        <button class="calendar-day" data-date="${key}">
          <div class="day-num">${d}</div>
          ${
            recorded
              ? `
                <div class="day-money ${cls}">${sign}${ctx.format(balance)}</div>
                <div class="day-money">${ctx.format(food)}kcal</div>
              `
              : `<div class="day-money">-</div>`
          }
        </button>
      `;
    }

    const grid = document.getElementById("calendarGrid");
    grid.innerHTML = html;

    grid.querySelectorAll("[data-date]").forEach(btn => {
      btn.addEventListener("click", () => {
        showDayDetail(btn.dataset.date);
      });
    });
  }

  function showDayDetail(key) {
    const detail = document.getElementById("dayDetail");

    if (!ctx.hasRecord(key)) {
      detail.innerHTML = `<div class="empty">${key} 기록이 없습니다.</div>`;
      return;
    }

    const day = ctx.getDay(key);
    const food = ctx.sumFoods(key);
    const exercise = ctx.sumExercises(key);
    const target = ctx.getTargetCalorie();
    const balance = ctx.getBalance(key);

    detail.innerHTML = `
      <div class="stat-row">
        <span>${key}</span>
        <strong class="${balance > 0 ? "minus" : "plus"}">
          ${balance > 0 ? "+" : ""}${ctx.format(balance)} kcal
        </strong>
      </div>

      <div class="stat-row">
        <span>먹은 칼로리</span>
        <strong>${ctx.format(food)} kcal</strong>
      </div>

      <div class="stat-row">
        <span>운동 칼로리</span>
        <strong>${ctx.format(exercise)} kcal</strong>
      </div>

      <div class="stat-row">
        <span>기준 대사량</span>
        <strong>${ctx.format(target)} kcal</strong>
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
              <div class="item-money plus">${ctx.format(item.kcal)} kcal</div>
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
              <div class="item-money minus">-${ctx.format(item.kcal)} kcal</div>
              <div></div>
            </div>
          `).join("")
          : `<div class="empty">운동 기록 없음</div>`
      }
    `;
  }

  function getFirstRecordDate() {
    const keys = Object.keys(ctx.state.records)
      .filter(key => ctx.hasRecord(key))
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
    const start = ctx.state.profile.statStartDate || getFirstRecordDate();
    const end = todayKey();

    document.getElementById("statStartDate").value = start;

    const dates = getDateRange(start, end);

    let food = 0;
    let exercise = 0;
    let target = 0;
    let recordDays = 0;

    dates.forEach(key => {
      food += ctx.sumFoods(key);
      exercise += ctx.sumExercises(key);
      target += ctx.getTargetCalorie();

      if (ctx.hasRecord(key)) recordDays++;
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
        <strong>${ctx.format(food)} kcal</strong>
      </div>

      <div class="stat-row">
        <span>총 운동</span>
        <strong>${ctx.format(exercise)} kcal</strong>
      </div>

      <div class="stat-row">
        <span>기준 대사량 합계</span>
        <strong>${ctx.format(target)} kcal</strong>
      </div>

      <div class="stat-row">
        <span>최종 결과</span>
        <strong class="${balance > 0 ? "minus" : "plus"}">
          ${balance > 0 ? "+" : ""}${ctx.format(balance)} kcal
        </strong>
      </div>
    `;
  }

  function prevMonth() {
    currentMonth.setMonth(currentMonth.getMonth() - 1);
    renderCalendar();
  }

  function nextMonth() {
    currentMonth.setMonth(currentMonth.getMonth() + 1);
    renderCalendar();
  }

  return {
    renderCalendar,
    renderStats,
    showDayDetail,
    prevMonth,
    nextMonth
  };
}