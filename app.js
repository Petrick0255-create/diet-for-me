function saveProfile() {
  const heightInput = document.getElementById("height");
  const weightInput = document.getElementById("weight");
  const ageInput = document.getElementById("age");
  const genderInput = document.getElementById("gender");

  const h = Number(heightInput.value);
  const w = Number(weightInput.value);
  const a = Number(ageInput.value);
  const g = genderInput.value;

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

  localStorage.setItem("foodAccountProfile", JSON.stringify(profile));

  document.getElementById("bmrText").textContent = bmr;
  render();
}