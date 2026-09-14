const inputs = ["x1", "y1", "x2", "y2"].map((id) => document.getElementById(id));
const distanceResult = document.getElementById("distanceResult");
const deltaX = document.getElementById("deltaX");
const deltaY = document.getElementById("deltaY");
const resultHint = document.getElementById("resultHint");
const calculationSteps = document.getElementById("calculationSteps");
const copyButton = document.getElementById("copyButton");
const clearButton = document.getElementById("clearButton");
const exampleButton = document.getElementById("exampleButton");
const swapButton = document.getElementById("swapButton");

let currentDistance = null;

function formatNumber(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000000) return value.toExponential(2);
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

function calculateDistance() {
  const values = inputs.map((input) => input.value.trim());
  const hasAllValues = values.every((value) => value !== "");

  if (!hasAllValues) {
    currentDistance = null;
    distanceResult.textContent = "—";
    deltaX.textContent = "—";
    deltaY.textContent = "—";
    resultHint.textContent = "Enter all four coordinates to calculate the distance.";
    calculationSteps.textContent = "Your calculation steps will appear here.";
    copyButton.disabled = true;
    return;
  }

  const [x1, y1, x2, y2] = values.map(Number);
  if (![x1, y1, x2, y2].every(Number.isFinite)) {
    currentDistance = null;
    resultHint.textContent = "Please enter valid numeric coordinates.";
    copyButton.disabled = true;
    return;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const coordinateDistance = Math.hypot(dx, dy);
  const distanceMeters = coordinateDistance * 100;
  currentDistance = distanceMeters;

  deltaX.textContent = formatNumber(Math.abs(dx));
  deltaY.textContent = formatNumber(Math.abs(dy));
  distanceResult.textContent = formatNumber(distanceMeters);
  resultHint.textContent = `From (${formatNumber(x1)}, ${formatNumber(y1)}) to (${formatNumber(x2)}, ${formatNumber(y2)}).`;
  calculationSteps.textContent = `√((${formatNumber(x2)} − ${formatNumber(x1)})² + (${formatNumber(y2)} − ${formatNumber(y1)})²) × 100 = ${formatNumber(distanceMeters)} Meter`;
  copyButton.disabled = false;
}

inputs.forEach((input) => input.addEventListener("input", calculateDistance));

clearButton.addEventListener("click", () => {
  inputs.forEach((input) => (input.value = ""));
  inputs[0].focus();
  calculateDistance();
});

exampleButton.addEventListener("click", () => {
  const example = [1200, 800, 1540, 1120];
  inputs.forEach((input, index) => (input.value = example[index]));
  calculateDistance();
});

swapButton.addEventListener("click", () => {
  const [x1, y1, x2, y2] = inputs.map((input) => input.value);
  inputs[0].value = x2;
  inputs[1].value = y2;
  inputs[2].value = x1;
  inputs[3].value = y1;
  calculateDistance();
});

copyButton.addEventListener("click", async () => {
  if (currentDistance === null) return;
  const value = formatNumber(currentDistance);

  try {
    await navigator.clipboard.writeText(value);
    copyButton.textContent = "Copied";
    setTimeout(() => (copyButton.textContent = "Copy distance"), 1200);
  } catch {
    copyButton.textContent = "Copy failed";
    setTimeout(() => (copyButton.textContent = "Copy distance"), 1200);
  }
});

calculateDistance();
