const display = document.getElementById("display");
const expression = document.getElementById("expression");
const historyList = document.getElementById("historyList");
const memoryStatus = document.getElementById("memoryStatus");
const themeToggle = document.getElementById("themeToggle");

let current = "";
let lastExpression = "";
let justCalculated = false;

function updateDisplay(value = current || "0") {
  display.value = value;
}

function appendNumber(number) {
  if (justCalculated) {
    current = "";
    expression.textContent = "";
    justCalculated = false;
  }
  if (current === "0") current = "";
  current += String(number);
  updateDisplay();
}

function appendDecimal() {
  if (justCalculated) {
    current = "";
    expression.textContent = "";
    justCalculated = false;
  }
  const parts = current.split(/[+\-×÷]/);
  const lastPart = parts[parts.length - 1];
  if (lastPart.includes(".")) return;
  current += lastPart === "" ? "0." : ".";
  updateDisplay();
}

function appendOperator(operator) {
  if (!current) return;
  justCalculated = false;
  if (/[+\-×÷]$/.test(current)) {
    current = current.slice(0, -1) + operator;
  } else {
    current += operator;
  }
  updateDisplay();
}

function deleteLast() {
  if (justCalculated) {
    current = "";
    expression.textContent = "";
    justCalculated = false;
  } else {
    current = current.slice(0, -1);
  }
  updateDisplay();
}

function clearDisplay() {
  current = "";
  lastExpression = "";
  expression.textContent = "";
  memoryStatus.textContent = "Ready";
  justCalculated = false;
  updateDisplay();
}

function percent() {
  const match = current.match(/(\d*\.?\d+)$/);
  if (!match) return;
  const number = Number(match[1]) / 100;
  current = current.slice(0, -match[1].length) + number;
  updateDisplay();
}

function calculate() {
  if (!current || /[+\-×÷]$/.test(current)) return;
  try {
    const safe = current.replace(/×/g, "*").replace(/÷/g, "/");
    if (!/^[0-9+\-*/().\s]+$/.test(safe)) throw new Error("Invalid expression");

    const result = Function(`"use strict"; return (${safe})`)();
    if (!Number.isFinite(result)) throw new Error("Invalid result");

    const formatted = Number.isInteger(result)
      ? String(result)
      : String(Number(result.toFixed(10)));

    lastExpression = current;
    expression.textContent = `${current} =`;
    current = formatted;
    updateDisplay();
    justCalculated = true;
    memoryStatus.textContent = "Calculation saved";
    saveHistory(lastExpression, formatted);
  } catch {
    display.value = "Error";
    memoryStatus.textContent = "Invalid calculation";
    current = "";
    justCalculated = true;
  }
}

function getHistory() {
  try { return JSON.parse(localStorage.getItem("smartcalc-history") || "[]"); }
  catch { return []; }
}

function saveHistory(expr, result) {
  const items = getHistory();
  items.unshift({ expr, result });
  localStorage.setItem("smartcalc-history", JSON.stringify(items.slice(0, 12)));
  renderHistory();
}

function renderHistory() {
  const items = getHistory();
  if (!items.length) {
    historyList.innerHTML = `<div class="empty-history">
      <span>🧮</span><p>No calculations yet</p>
      <small>Your recent calculations will appear here.</small>
    </div>`;
    return;
  }

  historyList.innerHTML = items.map((item, index) => `
    <div class="history-item" data-history-index="${index}" title="Click to reuse result">
      <div class="history-expression">${escapeHtml(item.expr)} =</div>
      <div class="history-result">${escapeHtml(item.result)}</div>
    </div>
  `).join("");

  document.querySelectorAll(".history-item").forEach(item => {
    item.addEventListener("click", () => {
      const selected = items[Number(item.dataset.historyIndex)];
      current = selected.result;
      expression.textContent = selected.expr + " =";
      justCalculated = true;
      updateDisplay();
    });
  });
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  }[char]));
}

document.querySelectorAll(".buttons button").forEach(button => {
  button.addEventListener("click", () => {
    const action = button.dataset.action;
    const value = button.dataset.value;
    if (value !== undefined) {
      if (/\d/.test(value)) appendNumber(value);
      else appendOperator(value);
    } else if (action === "decimal") appendDecimal();
    else if (action === "clear") clearDisplay();
    else if (action === "delete") deleteLast();
    else if (action === "percent") percent();
    else if (action === "calculate") calculate();
  });
});

document.addEventListener("keydown", event => {
  const key = event.key;
  if (/\d/.test(key)) appendNumber(key);
  else if (key === ".") appendDecimal();
  else if (["+", "-", "*", "/"].includes(key)) appendOperator(key === "*" ? "×" : key === "/" ? "÷" : key);
  else if (key === "Enter" || key === "=") { event.preventDefault(); calculate(); }
  else if (key === "Backspace") deleteLast();
  else if (key === "Escape") clearDisplay();
  else if (key === "%") percent();
});

document.getElementById("clearHistory").addEventListener("click", () => {
  localStorage.removeItem("smartcalc-history");
  renderHistory();
  memoryStatus.textContent = "History cleared";
});

document.getElementById("copyResult").addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(display.value);
    memoryStatus.textContent = "Result copied";
  } catch {
    memoryStatus.textContent = "Copy unavailable";
  }
});

function applyTheme(dark) {
  document.body.classList.toggle("dark", dark);
  themeToggle.textContent = dark ? "☀️" : "🌙";
  themeToggle.setAttribute("aria-label", dark ? "Switch to light mode" : "Switch to dark mode");
  localStorage.setItem("smartcalc-dark", dark ? "1" : "0");
}

themeToggle.addEventListener("click", () => {
  applyTheme(!document.body.classList.contains("dark"));
});

applyTheme(localStorage.getItem("smartcalc-dark") === "1");
renderHistory();
updateDisplay();
