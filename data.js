/* data.js
   기본 데이터와 앱 상태 기본값
*/

export const DEFAULT_FOODS = [
  {
    id: "banana",
    name: "바나나",
    unit: "개",
    kcal: 105,
    favorite: true
  },
  {
    id: "avocado",
    name: "아보카도",
    unit: "개",
    kcal: 240,
    favorite: true
  },
  {
    id: "rice",
    name: "밥",
    unit: "공기",
    kcal: 300,
    favorite: true
  },
  {
    id: "pork-rib",
    name: "돼지갈비",
    unit: "인분",
    kcal: 480,
    favorite: false
  },
  {
    id: "tonkatsu",
    name: "돈까스",
    unit: "장",
    kcal: 700,
    favorite: false
  },
  {
    id: "chicken-piece",
    name: "치킨",
    unit: "조각",
    kcal: 250,
    favorite: true
  },
  {
    id: "chicken-breast",
    name: "닭가슴살",
    unit: "개",
    kcal: 165,
    favorite: true
  }
];

export const DEFAULT_EXERCISES = [
  {
    id: "walk-30",
    name: "걷기",
    defaultMinutes: 30,
    kcal: 120,
    favorite: true
  },
  {
    id: "run-30",
    name: "달리기",
    defaultMinutes: 30,
    kcal: 300,
    favorite: true
  },
  {
    id: "gym-30",
    name: "헬스",
    defaultMinutes: 30,
    kcal: 180,
    favorite: true
  },
  {
    id: "pilates-60",
    name: "필라테스",
    defaultMinutes: 60,
    kcal: 220,
    favorite: false
  }
];

export const MEALS = ["아침", "점심", "저녁", "간식", "야식"];

export const EMPTY_APP_STATE = {
  profile: {
    height: "",
    weight: "",
    age: "",
    gender: "male",

    // 계산된 기초대사량
    bmr: 0,

    // 인바디 등으로 알고 있는 일일 대사량
    // 이 값이 있으면 통계 기준은 dailyCalorie를 우선 사용
    dailyCalorie: 0,

    // 통계 시작일
    statStartDate: ""
  },

  foods: DEFAULT_FOODS,

  exercises: DEFAULT_EXERCISES,

  records: {
    /*
      "2026-06-29": {
        foods: [
          {
            id: "record-id",
            meal: "아침",
            foodId: "banana",
            name: "바나나",
            unit: "개",
            unitKcal: 105,
            quantity: 2,
            kcal: 210
          }
        ],
        exercises: [
          {
            id: "record-id",
            exerciseId: "walk-30",
            name: "걷기",
            minutes: 30,
            kcal: 120
          }
        ],
        weight: 92.5
      }
    */
  }
};

export function createId(prefix = "id") {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export function cloneDefaultState() {
  return JSON.parse(JSON.stringify(EMPTY_APP_STATE));
}

export function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const d = String(now.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export function toDateKey(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");

  return `${y}-${m}-${d}`;
}

export function getDayRecord(state, dateKey) {
  if (!state.records[dateKey]) {
    state.records[dateKey] = {
      foods: [],
      exercises: [],
      weight: ""
    };
  }

  return state.records[dateKey];
}

export function hasDayRecord(state, dateKey) {
  const day = state.records[dateKey];

  if (!day) return false;

  return (
    day.foods.length > 0 ||
    day.exercises.length > 0 ||
    Boolean(day.weight)
  );
}

export function getDailyTarget(profile) {
  return Number(profile.dailyCalorie || profile.bmr || 0);
}

export function calculateBmr({ height, weight, age, gender }) {
  const h = Number(height);
  const w = Number(weight);
  const a = Number(age);

  if (!h || !w || !a) return 0;

  if (gender === "female") {
    return Math.round(10 * w + 6.25 * h - 5 * a - 161);
  }

  return Math.round(10 * w + 6.25 * h - 5 * a + 5);
}