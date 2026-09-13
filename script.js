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

const mapStage = document.getElementById("mapStage");
const canvas = document.getElementById("coordinateMap");
const ctx = canvas.getContext("2d");
const mapEmpty = document.getElementById("mapEmpty");
const zoomInButton = document.getElementById("zoomInButton");
const zoomOutButton = document.getElementById("zoomOutButton");
const fitMapButton = document.getElementById("fitMapButton");

let currentDistance = null;
let currentPoints = null;
let mapCenter = { x: 0, y: 0 };
let mapScale = 1;
let isDragging = false;
let lastPointer = { x: 0, y: 0 };

function formatNumber(value) {
  if (!Number.isFinite(value)) return "—";
  if (Math.abs(value) >= 1000000) return value.toExponential(2);
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.00$/, "");
}

function getMapSize() {
  const rect = mapStage.getBoundingClientRect();
  const dpr = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.round(rect.width));
  const height = Math.max(1, Math.round(rect.height));
  if (canvas.width !== Math.round(width * dpr) || canvas.height !== Math.round(height * dpr)) {
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
  }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { width, height };
}

function worldToScreen(x, y, width, height) {
  return {
    x: width / 2 + (x - mapCenter.x) * mapScale,
    y: height / 2 - (y - mapCenter.y) * mapScale,
  };
}

function screenToWorld(x, y, width, height) {
  return {
    x: mapCenter.x + (x - width / 2) / mapScale,
    y: mapCenter.y - (y - height / 2) / mapScale,
  };
}

function niceGridStep() {
  const targetPixels = 80;
  const raw = targetPixels / mapScale;
  const power = Math.pow(10, Math.floor(Math.log10(Math.max(raw, 1e-9))));
  const normalized = raw / power;
  const multiplier = normalized < 2 ? 2 : normalized < 5 ? 5 : 10;
  return multiplier * power;
}

function drawGrid(width, height) {
  const step = niceGridStep();
  const left = mapCenter.x - width / (2 * mapScale);
  const right = mapCenter.x + width / (2 * mapScale);
  const bottom = mapCenter.y - height / (2 * mapScale);
  const top = mapCenter.y + height / (2 * mapScale);

  ctx.lineWidth = 1;
  ctx.font = "11px Inter, system-ui, sans-serif";
  ctx.textBaseline = "top";

  const firstX = Math.floor(left / step) * step;
  for (let x = firstX; x <= right + step; x += step) {
    const screen = worldToScreen(x, 0, width, height);
    const isAxis = Math.abs(x) < step * 0.001;
    ctx.strokeStyle = isAxis ? "rgba(151,243,95,.26)" : "rgba(255,255,255,.055)";
    ctx.beginPath();
    ctx.moveTo(screen.x, 0);
    ctx.lineTo(screen.x, height);
    ctx.stroke();

    if (screen.x > 6 && screen.x < width - 50) {
      ctx.fillStyle = "rgba(148,160,151,.58)";
      ctx.fillText(formatNumber(x), screen.x + 5, 8);
    }
  }

  const firstY = Math.floor(bottom / step) * step;
  for (let y = firstY; y <= top + step; y += step) {
    const screen = worldToScreen(0, y, width, height);
    const isAxis = Math.abs(y) < step * 0.001;
    ctx.strokeStyle = isAxis ? "rgba(151,243,95,.26)" : "rgba(255,255,255,.055)";
    ctx.beginPath();
    ctx.moveTo(0, screen.y);
    ctx.lineTo(width, screen.y);
    ctx.stroke();

    if (screen.y > 22 && screen.y < height - 18) {
      ctx.fillStyle = "rgba(148,160,151,.58)";
      ctx.fillText(formatNumber(y), 8, screen.y + 5);
    }
  }
}

function drawPoint(point, label, primary, width, height) {
  const screen = worldToScreen(point.x, point.y, width, height);
  const color = primary ? "#97f35f" : "#f1f5f2";
  const glow = primary ? "rgba(151,243,95,.35)" : "rgba(241,245,242,.2)";

  ctx.fillStyle = glow;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(screen.x, screen.y, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.lineWidth = 2;
  ctx.strokeStyle = "#08100b";
  ctx.stroke();

  const coordText = `${label}  (${formatNumber(point.x)}, ${formatNumber(point.y)})`;
  ctx.font = "700 12px Inter, system-ui, sans-serif";
  const textWidth = ctx.measureText(coordText).width;
  const boxX = Math.min(Math.max(screen.x + 14, 8), width - textWidth - 24);
  const boxY = Math.min(Math.max(screen.y - 30, 8), height - 32);

  ctx.fillStyle = "rgba(8,13,10,.9)";
  ctx.strokeStyle = primary ? "rgba(151,243,95,.28)" : "rgba(255,255,255,.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.roundRect(boxX, boxY, textWidth + 16, 26, 7);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = color;
  ctx.textBaseline = "middle";
  ctx.fillText(coordText, boxX + 8, boxY + 13);
}

function drawMap() {
  const { width, height } = getMapSize();
  ctx.clearRect(0, 0, width, height);
  drawGrid(width, height);

  if (!currentPoints) {
    mapEmpty.classList.remove("hidden");
    return;
  }

  mapEmpty.classList.add("hidden");
  const a = worldToScreen(currentPoints.a.x, currentPoints.a.y, width, height);
  const b = worldToScreen(currentPoints.b.x, currentPoints.b.y, width, height);

  ctx.strokeStyle = "rgba(151,243,95,.72)";
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 7]);
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const midX = (a.x + b.x) / 2;
  const midY = (a.y + b.y) / 2;
  if (currentDistance !== null) {
    const label = `${formatNumber(currentDistance)} units`;
    ctx.font = "700 11px Inter, system-ui, sans-serif";
    const labelWidth = ctx.measureText(label).width;
    ctx.fillStyle = "rgba(8,13,10,.9)";
    ctx.fillRect(midX - labelWidth / 2 - 7, midY - 12, labelWidth + 14, 24);
    ctx.fillStyle = "#97f35f";
    ctx.textBaseline = "middle";
    ctx.fillText(label, midX - labelWidth / 2, midY);
  }

  drawPoint(currentPoints.a, "A", true, width, height);
  drawPoint(currentPoints.b, "B", false, width, height);
}

function fitMapToPoints() {
  if (!currentPoints) {
    mapCenter = { x: 0, y: 0 };
    mapScale = 1;
    drawMap();
    return;
  }

  const { width, height } = getMapSize();
  const dx = Math.abs(currentPoints.b.x - currentPoints.a.x);
  const dy = Math.abs(currentPoints.b.y - currentPoints.a.y);
  mapCenter = {
    x: (currentPoints.a.x + currentPoints.b.x) / 2,
    y: (currentPoints.a.y + currentPoints.b.y) / 2,
  };

  const paddedWidth = Math.max(width - 160, 120);
  const paddedHeight = Math.max(height - 150, 120);
  const xScale = dx > 0 ? paddedWidth / dx : Infinity;
  const yScale = dy > 0 ? paddedHeight / dy : Infinity;
  const fallbackSpan = Math.max(Math.abs(currentPoints.a.x), Math.abs(currentPoints.a.y), 100);
  const fitted = Math.min(xScale, yScale);
  mapScale = Number.isFinite(fitted) ? fitted : Math.min(width, height) / Math.max(fallbackSpan * .6, 100);
  mapScale = Math.min(Math.max(mapScale, 0.0001), 10000);
  drawMap();
}

function setZoom(multiplier, anchorX = null, anchorY = null) {
  const { width, height } = getMapSize();
  const sx = anchorX ?? width / 2;
  const sy = anchorY ?? height / 2;
  const before = screenToWorld(sx, sy, width, height);
  mapScale = Math.min(Math.max(mapScale * multiplier, 0.0001), 10000);
  const after = screenToWorld(sx, sy, width, height);
  mapCenter.x += before.x - after.x;
  mapCenter.y += before.y - after.y;
  drawMap();
}

function calculateDistance() {
  const values = inputs.map((input) => input.value.trim());
  const hasAllValues = values.every((value) => value !== "");

  if (!hasAllValues) {
    currentDistance = null;
    currentPoints = null;
    distanceResult.textContent = "—";
    deltaX.textContent = "—";
    deltaY.textContent = "—";
    resultHint.textContent = "Enter all four coordinates to calculate the distance.";
    calculationSteps.textContent = "Your calculation steps will appear here.";
    copyButton.disabled = true;
    drawMap();
    return;
  }

  const [x1, y1, x2, y2] = values.map(Number);
  if (![x1, y1, x2, y2].every(Number.isFinite)) {
    currentDistance = null;
    currentPoints = null;
    resultHint.textContent = "Please enter valid numeric coordinates.";
    copyButton.disabled = true;
    drawMap();
    return;
  }

  const dx = x2 - x1;
  const dy = y2 - y1;
  const distance = Math.hypot(dx, dy);
  const previousPoints = currentPoints;
  currentDistance = distance;
  currentPoints = {
    a: { x: x1, y: y1 },
    b: { x: x2, y: y2 },
  };

  deltaX.textContent = formatNumber(Math.abs(dx));
  deltaY.textContent = formatNumber(Math.abs(dy));
  distanceResult.textContent = formatNumber(distance);
  resultHint.textContent = `From (${formatNumber(x1)}, ${formatNumber(y1)}) to (${formatNumber(x2)}, ${formatNumber(y2)}).`;
  calculationSteps.textContent = `√((${formatNumber(x2)} − ${formatNumber(x1)})² + (${formatNumber(y2)} − ${formatNumber(y1)})²) = ${formatNumber(distance)}`;
  copyButton.disabled = false;

  if (!previousPoints) fitMapToPoints();
  else drawMap();
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
  currentPoints = null;
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

zoomInButton.addEventListener("click", () => setZoom(1.35));
zoomOutButton.addEventListener("click", () => setZoom(1 / 1.35));
fitMapButton.addEventListener("click", fitMapToPoints);

mapStage.addEventListener("wheel", (event) => {
  event.preventDefault();
  const rect = mapStage.getBoundingClientRect();
  const factor = event.deltaY < 0 ? 1.14 : 1 / 1.14;
  setZoom(factor, event.clientX - rect.left, event.clientY - rect.top);
}, { passive: false });

mapStage.addEventListener("pointerdown", (event) => {
  isDragging = true;
  lastPointer = { x: event.clientX, y: event.clientY };
  mapStage.classList.add("dragging");
  mapStage.setPointerCapture(event.pointerId);
});

mapStage.addEventListener("pointermove", (event) => {
  if (!isDragging) return;
  const dx = event.clientX - lastPointer.x;
  const dy = event.clientY - lastPointer.y;
  mapCenter.x -= dx / mapScale;
  mapCenter.y += dy / mapScale;
  lastPointer = { x: event.clientX, y: event.clientY };
  drawMap();
});

function stopDragging(event) {
  if (!isDragging) return;
  isDragging = false;
  mapStage.classList.remove("dragging");
  if (event?.pointerId !== undefined && mapStage.hasPointerCapture(event.pointerId)) {
    mapStage.releasePointerCapture(event.pointerId);
  }
}

mapStage.addEventListener("pointerup", stopDragging);
mapStage.addEventListener("pointercancel", stopDragging);

window.addEventListener("resize", drawMap);

calculateDistance();
drawMap();
