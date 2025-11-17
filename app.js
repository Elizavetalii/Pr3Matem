const EPS = 1e-9;

const supplierInput = document.getElementById("supplierCount");
const consumerInput = document.getElementById("consumerCount");
const matrixContainer = document.getElementById("matrixContainer");
const generateRandomBtn = document.getElementById("generateRandom");
const applySizeBtn = document.getElementById("applySize");
const solveBtn = document.getElementById("solveBtn");
const noteEl = document.getElementById("note");
const animationGrid = document.getElementById("animationGrid");
const stepInfoEl = document.getElementById("stepInfo");
const totalCostEl = document.getElementById("totalCost");
const progressFill = document.getElementById("progressFill");
const solutionArea = document.getElementById("solutionArea");
const scrollBtn = document.getElementById("scrollToSolver");
const presetBtn = document.getElementById("generatePreset");
const solverSection = document.getElementById("solver");

let currentRows = Number(supplierInput.value) || 3;
let currentCols = Number(consumerInput.value) || 3;
const animationTimers = [];

const clampDimension = (value) => Math.min(6, Math.max(1, value));

const formatNumber = (value) => {
  if (Math.abs(value) <= EPS) return "0";
  return Number.isInteger(value) ? value.toString() : Number(value).toFixed(2).replace(/\.00$/, "");
};

const setNote = (message, variant = "muted") => {
  noteEl.textContent = message;
  noteEl.classList.remove("muted", "note--error", "note--accent");
  if (variant === "error") {
    noteEl.classList.add("note--error");
  } else if (variant === "accent") {
    noteEl.classList.add("note--accent");
  } else {
    noteEl.classList.add("muted");
  }
};

const createNumberInput = () => {
  const input = document.createElement("input");
  input.type = "number";
  input.min = "0";
  input.step = "0.1";
  input.value = "0";
  return input;
};

const buildMatrix = (rows, cols) => {
  currentRows = rows;
  currentCols = cols;
  supplierInput.value = rows;
  consumerInput.value = cols;

  const table = document.createElement("table");
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");

  const corner = document.createElement("th");
  corner.textContent = " ";
  headRow.appendChild(corner);
  for (let j = 0; j < cols; j += 1) {
    const th = document.createElement("th");
    th.textContent = `C${j + 1}`;
    headRow.appendChild(th);
  }
  const stockTh = document.createElement("th");
  stockTh.textContent = "Запас";
  headRow.appendChild(stockTh);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  for (let i = 0; i < rows; i += 1) {
    const tr = document.createElement("tr");
    const label = document.createElement("th");
    label.textContent = `S${i + 1}`;
    tr.appendChild(label);
    for (let j = 0; j < cols; j += 1) {
      const td = document.createElement("td");
      const input = createNumberInput();
      input.dataset.type = "cost";
      input.dataset.row = i;
      input.dataset.col = j;
      td.appendChild(input);
      tr.appendChild(td);
    }
    const supplyCell = document.createElement("td");
    const supplyInput = createNumberInput();
    supplyInput.dataset.type = "supply";
    supplyInput.dataset.index = i;
    supplyCell.appendChild(supplyInput);
    tr.appendChild(supplyCell);
    tbody.appendChild(tr);
  }
  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const demandRow = document.createElement("tr");
  const demandLabel = document.createElement("th");
  demandLabel.textContent = "Спрос";
  demandRow.appendChild(demandLabel);
  for (let j = 0; j < cols; j += 1) {
    const td = document.createElement("td");
    const demandInput = createNumberInput();
    demandInput.dataset.type = "demand";
    demandInput.dataset.index = j;
    td.appendChild(demandInput);
    demandRow.appendChild(td);
  }
  demandRow.appendChild(document.createElement("td"));
  tfoot.appendChild(demandRow);
  table.appendChild(tfoot);

  matrixContainer.innerHTML = "";
  matrixContainer.appendChild(table);
};

const setMatrixValues = (data) => {
  const supplyInputs = document.querySelectorAll('input[data-type="supply"]');
  supplyInputs.forEach((input, idx) => {
    input.value = data.supply?.[idx] ?? 0;
  });

  const demandInputs = document.querySelectorAll('input[data-type="demand"]');
  demandInputs.forEach((input, idx) => {
    input.value = data.demand?.[idx] ?? 0;
  });

  const costInputs = document.querySelectorAll('input[data-type="cost"]');
  costInputs.forEach((input) => {
    const row = Number(input.dataset.row);
    const col = Number(input.dataset.col);
    input.value = data.costs?.[row]?.[col] ?? 0;
  });
};

const generateRandomData = () => {
  const supply = [];
  const demand = [];
  const costs = [];

  let supplySum = 0;
  let demandSum = 0;

  for (let i = 0; i < currentRows; i += 1) {
    const value = Math.floor(Math.random() * 40) + 10;
    supply.push(value);
    supplySum += value;
  }
  for (let j = 0; j < currentCols; j += 1) {
    const value = Math.floor(Math.random() * 40) + 10;
    demand.push(value);
    demandSum += value;
  }
  const diff = supplySum - demandSum;
  if (diff > 0) {
    demand[currentCols - 1] += diff;
  } else if (diff < 0) {
    supply[currentRows - 1] += Math.abs(diff);
  }

  for (let i = 0; i < currentRows; i += 1) {
    const row = [];
    for (let j = 0; j < currentCols; j += 1) {
      row.push(Math.floor(Math.random() * 13) + 2);
    }
    costs.push(row);
  }

  setMatrixValues({ supply, demand, costs });
  setNote("Сгенерированы сбалансированные данные. Можно запускать расчёт.", "accent");
};

const readValue = (input) => {
  const value = Number(input.value);
  if (Number.isNaN(value)) {
    throw new Error("Некоторые поля пусты или содержат неверные числа.");
  }
  if (value < 0) {
    throw new Error("Значения не могут быть отрицательными.");
  }
  return value;
};

const collectProblem = () => {
  const supplyInputs = document.querySelectorAll('input[data-type="supply"]');
  const demandInputs = document.querySelectorAll('input[data-type="demand"]');
  const costInputs = document.querySelectorAll('input[data-type="cost"]');

  if (!supplyInputs.length || !demandInputs.length || !costInputs.length) {
    throw new Error("Заполните таблицу данных.");
  }

  const supply = Array.from(supplyInputs, readValue);
  const demand = Array.from(demandInputs, readValue);

  const costs = Array.from({ length: currentRows }, () => Array(currentCols).fill(0));
  costInputs.forEach((input) => {
    const row = Number(input.dataset.row);
    const col = Number(input.dataset.col);
    costs[row][col] = readValue(input);
  });

  return {
    supply,
    demand,
    costs,
    supplyLabels: supply.map((_, idx) => `S${idx + 1}`),
    demandLabels: demand.map((_, idx) => `C${idx + 1}`),
  };
};

const balanceProblem = (problem) => {
  const supplyTotal = problem.supply.reduce((acc, val) => acc + val, 0);
  const demandTotal = problem.demand.reduce((acc, val) => acc + val, 0);
  if (Math.abs(supplyTotal - demandTotal) <= EPS) {
    return { problem, note: "Система сбалансирована. Можно искать решение." };
  }

  const newSupply = [...problem.supply];
  const newDemand = [...problem.demand];
  const newCosts = problem.costs.map((row) => [...row]);
  const supplyLabels = [...problem.supplyLabels];
  const demandLabels = [...problem.demandLabels];

  if (supplyTotal > demandTotal) {
    const diff = supplyTotal - demandTotal;
    newDemand.push(diff);
    demandLabels.push("ПсевдоC");
    newCosts.forEach((row) => row.push(0));
    return {
      problem: { supply: newSupply, demand: newDemand, costs: newCosts, supplyLabels, demandLabels },
      note: "Добавлен фиктивный потребитель для балансировки системы.",
    };
  }

  const diff = demandTotal - supplyTotal;
  newSupply.push(diff);
  supplyLabels.push("ПсевдоS");
  const zeroRow = newDemand.map(() => 0);
  newCosts.push(zeroRow);
  return {
    problem: { supply: newSupply, demand: newDemand, costs: newCosts, supplyLabels, demandLabels },
    note: "Добавлен фиктивный поставщик для балансировки системы.",
  };
};

const northwestCorner = (problem) => {
  const supply = [...problem.supply];
  const demand = [...problem.demand];
  const rows = supply.length;
  const cols = demand.length;
  const allocations = Array.from({ length: rows }, () => Array(cols).fill(0));
  const steps = [];
  let i = 0;
  let j = 0;

  while (i < rows && j < cols) {
    const qty = Math.min(supply[i], demand[j]);
    allocations[i][j] = qty;
    steps.push({ row: i, col: j, qty });
    supply[i] -= qty;
    demand[j] -= qty;
    if (Math.abs(supply[i]) <= EPS && Math.abs(demand[j]) <= EPS) {
      i += 1;
      j += 1;
    } else if (Math.abs(supply[i]) <= EPS) {
      i += 1;
    } else {
      j += 1;
    }
  }

  return { allocations, steps };
};

const computeTotalCost = (problem, allocations) =>
  allocations.reduce(
    (total, row, i) =>
      total +
      row.reduce((rowTotal, qty, j) => {
        return rowTotal + qty * problem.costs[i][j];
      }, 0),
    0,
  );

const createTableStructure = (problem) => {
  const table = document.createElement("table");
  table.className = "sol-table";
  const cellRefs = {};

  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  const corner = document.createElement("th");
  headRow.appendChild(corner);
  problem.demandLabels.forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });
  const stockTh = document.createElement("th");
  stockTh.textContent = "Запас";
  headRow.appendChild(stockTh);
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");
  problem.supplyLabels.forEach((label, rowIdx) => {
    const tr = document.createElement("tr");
    const th = document.createElement("th");
    th.textContent = label;
    tr.appendChild(th);
    problem.demandLabels.forEach((_, colIdx) => {
      const td = document.createElement("td");
      td.textContent = "—";
      cellRefs[`${rowIdx}-${colIdx}`] = td;
      tr.appendChild(td);
    });
    const supplyCell = document.createElement("td");
    supplyCell.textContent = formatNumber(problem.supply[rowIdx]);
    tr.appendChild(supplyCell);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);

  const tfoot = document.createElement("tfoot");
  const demandRow = document.createElement("tr");
  const footLabel = document.createElement("th");
  footLabel.textContent = "Спрос";
  demandRow.appendChild(footLabel);
  problem.demand.forEach((value) => {
    const td = document.createElement("td");
    td.textContent = formatNumber(value);
    demandRow.appendChild(td);
  });
  demandRow.appendChild(document.createElement("td"));
  tfoot.appendChild(demandRow);
  table.appendChild(tfoot);

  return { table, cellRefs };
};

const clearAnimation = () => {
  animationTimers.forEach((timer) => clearTimeout(timer));
  animationTimers.length = 0;
  animationGrid.innerHTML = "";
  progressFill.style.width = "0%";
  stepInfoEl.textContent = "—";
  totalCostEl.textContent = "—";
};

const animateSolution = (problem, steps, allocations, totalCost) => {
  clearAnimation();
  if (!steps.length) {
    setNote("Не удалось построить решение.", "error");
    return;
  }

  const { table, cellRefs } = createTableStructure(problem);
  animationGrid.appendChild(table);

  const delay = 900;
  steps.forEach((step, index) => {
    const timer = setTimeout(() => {
      const key = `${step.row}-${step.col}`;
      const cell = cellRefs[key];
      if (!cell) return;
      cell.innerHTML = `<strong>${formatNumber(step.qty)}</strong><span class="cell-cost">@${formatNumber(
        problem.costs[step.row][step.col],
      )}</span>`;
      cell.classList.add("active", "pulse");
      setTimeout(() => cell.classList.remove("pulse"), 600);
      stepInfoEl.textContent = `${problem.supplyLabels[step.row]} → ${problem.demandLabels[step.col]} = ${formatNumber(
        step.qty,
      )}`;
      const progress = Math.round(((index + 1) / steps.length) * 100);
      progressFill.style.width = `${progress}%`;
      if (index + 1 === steps.length) {
        totalCostEl.textContent = `${formatNumber(totalCost)}`;
      }
    }, index * delay);
    animationTimers.push(timer);
  });
};

const renderSolution = (problem, allocations, totalCost) => {
  const { table, cellRefs } = createTableStructure(problem);
  Object.entries(cellRefs).forEach(([key, cell]) => {
    const [row, col] = key.split("-").map(Number);
    const value = allocations[row][col];
    if (value > EPS) {
      cell.innerHTML = `<strong>${formatNumber(value)}</strong><span class="cell-cost">@${formatNumber(
        problem.costs[row][col],
      )}</span>`;
    } else {
      cell.textContent = "—";
    }
  });

  solutionArea.innerHTML = "";
  const title = document.createElement("h3");
  title.textContent = "Итоговое опорное решение";
  const summary = document.createElement("p");
  summary.className = "muted";
  summary.textContent = `Полная стоимость перевозок: ${formatNumber(totalCost)}`;
  solutionArea.appendChild(title);
  solutionArea.appendChild(summary);
  solutionArea.appendChild(table);
};

const handleSolve = () => {
  try {
    setNote("Запускаем расчёт и проверяем балансировку...", "accent");
    const baseProblem = collectProblem();
    const { problem, note } = balanceProblem(baseProblem);
    setNote(note, "accent");
    const { allocations, steps } = northwestCorner(problem);
    const totalCost = computeTotalCost(problem, allocations);
    animateSolution(problem, steps, allocations, totalCost);
    renderSolution(problem, allocations, totalCost);
  } catch (error) {
    setNote(error.message, "error");
    clearAnimation();
  }
};

const presetData = () => ({
  supply: [30, 40],
  demand: [20, 30, 20],
  costs: [
    [8, 6, 9],
    [5, 3, 7],
  ],
});

applySizeBtn.addEventListener("click", () => {
  const rows = clampDimension(Number(supplierInput.value) || currentRows);
  const cols = clampDimension(Number(consumerInput.value) || currentCols);
  buildMatrix(rows, cols);
});

generateRandomBtn.addEventListener("click", generateRandomData);
solveBtn.addEventListener("click", handleSolve);

scrollBtn.addEventListener("click", () => {
  solverSection.scrollIntoView({ behavior: "smooth" });
});

presetBtn.addEventListener("click", () => {
  buildMatrix(2, 3);
  setMatrixValues(presetData());
  solverSection.scrollIntoView({ behavior: "smooth" });
  setNote("Загружен демонстрационный пример. Нажмите «Рассчитать план».", "accent");
});


buildMatrix(currentRows, currentCols);
generateRandomData();
