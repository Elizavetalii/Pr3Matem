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
const optimizeBtn = document.getElementById("optimizeBtn");
const balancedMatrixEl = document.getElementById("balancedMatrix");
const planPreviewEl = document.getElementById("planPreview");
const answerSummaryEl = document.getElementById("answerSummary");
const optimizationPanel = document.getElementById("optimizationPanel");
const optimizationIntro = document.getElementById("optimizationIntro");
const optimizationSteps = document.getElementById("optimizationSteps");

let currentRows = Number(supplierInput.value) || 3;
let currentCols = Number(consumerInput.value) || 3;
const animationTimers = [];
let lastSolution = null;

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

const resetOptimizationPanel = () => {
  if (optimizationIntro) {
    optimizationIntro.textContent =
      "После построения опорного плана нажмите «Оптимизировать план», чтобы увидеть вычисление потенциалов, Δ-оценок и цикл перераспределения.";
  }
  if (optimizationSteps) {
    optimizationSteps.innerHTML = "";
  }
};

const resetPreviews = () => {
  if (balancedMatrixEl) {
    balancedMatrixEl.innerHTML = `
      <h3>Матрица стоимости</h3>
      <p class="muted">Появится после расчёта.</p>
    `;
  }
  if (planPreviewEl) {
    planPreviewEl.innerHTML = `
      <h3>Опорный план</h3>
      <p class="muted">Здесь появится план в формате стоимость ↔ перевозка.</p>
    `;
  }
  solutionArea.innerHTML = "";
  if (answerSummaryEl) {
    answerSummaryEl.textContent = "";
  }
  if (optimizeBtn) {
    optimizeBtn.disabled = true;
  }
  resetOptimizationPanel();
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

const cloneMatrix = (matrix) => matrix.map((row) => row.slice());

const formatCellLabel = (problem, cell) =>
  `${problem.supplyLabels[cell.row]} — ${problem.demandLabels[cell.col]}`;

const buildPotentialsBlock = (problem, potentials) => {
  const wrapper = document.createElement("div");
  wrapper.className = "optim-potentials";
  const supplyList = document.createElement("div");
  supplyList.innerHTML = `<strong>u (поставщики)</strong>`;
  const supplyUl = document.createElement("ul");
  problem.supplyLabels.forEach((label, idx) => {
    const li = document.createElement("li");
    li.textContent = `${label}: ${formatNumber(potentials.u[idx] ?? 0)}`;
    supplyUl.appendChild(li);
  });
  supplyList.appendChild(supplyUl);
  const demandList = document.createElement("div");
  demandList.innerHTML = `<strong>v (потребители)</strong>`;
  const demandUl = document.createElement("ul");
  problem.demandLabels.forEach((label, idx) => {
    const li = document.createElement("li");
    li.textContent = `${label}: ${formatNumber(potentials.v[idx] ?? 0)}`;
    demandUl.appendChild(li);
  });
  demandList.appendChild(demandUl);
  wrapper.appendChild(supplyList);
  wrapper.appendChild(demandList);
  return wrapper;
};

const buildDeltaTable = (problem, deltas, entering) => {
  const table = document.createElement("table");
  table.className = "optim-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.appendChild(document.createElement("th"));
  problem.demandLabels.forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  deltas.forEach((rowDeltas, i) => {
    const tr = document.createElement("tr");
    const rowLabel = document.createElement("th");
    rowLabel.textContent = problem.supplyLabels[i];
    tr.appendChild(rowLabel);
    rowDeltas.forEach((delta, j) => {
      const td = document.createElement("td");
      td.textContent = formatNumber(delta);
      if (delta > EPS) {
        td.classList.add("delta-positive");
      } else if (Math.abs(delta) <= EPS) {
        td.classList.add("delta-zero");
      } else {
        td.classList.add("delta-negative");
      }
      if (entering && entering.row === i && entering.col === j) {
        td.classList.add("delta-entering");
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
};

const buildCycleTable = (problem, step) => {
  if (!step.loopPath || !step.allocationSnapshot) return null;
  const table = document.createElement("table");
  table.className = "cycle-table";
  const thead = document.createElement("thead");
  const headRow = document.createElement("tr");
  headRow.appendChild(document.createElement("th"));
  problem.demandLabels.forEach((label) => {
    const th = document.createElement("th");
    th.textContent = label;
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);
  const tbody = document.createElement("tbody");
  const signMap = new Map();
  if (step.loopPath && step.loopSigns) {
    step.loopPath.forEach((cell, idx) => {
      signMap.set(`${cell.row}-${cell.col}`, step.loopSigns[idx]);
    });
  }
  step.allocationSnapshot.forEach((row, i) => {
    const tr = document.createElement("tr");
    const label = document.createElement("th");
    label.textContent = problem.supplyLabels[i];
    tr.appendChild(label);
    row.forEach((qty, j) => {
      const td = document.createElement("td");
      const cost = problem.costs[i][j];
      const sign = signMap.get(`${i}-${j}`);
      const allocationText = qty > EPS ? `[${formatNumber(qty)}]` : "[0]";
      td.innerHTML = `${formatNumber(cost)} ${allocationText}`;
      if (sign === "+") {
        td.classList.add("cycle-plus");
      } else if (sign === "-") {
        td.classList.add("cycle-minus");
      }
      tr.appendChild(td);
    });
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  return table;
};

const renderOptimizationDetails = (history, problem) => {
  if (!optimizationSteps || !optimizationIntro) return;
  if (!history || !history.length) {
    optimizationIntro.textContent =
      "Все Δ-оценки неположительны — план уже оптимален.";
    optimizationSteps.innerHTML = "";
    return;
  }

  optimizationIntro.textContent =
    "Ниже показаны итерации метода потенциалов: потенциалы, Δ-оценки и построение цикла.";
  optimizationSteps.innerHTML = "";
  history.forEach((step) => {
    const card = document.createElement("article");
    card.className = "optim-card";
    const title = document.createElement("h4");
    title.textContent = `Итерация ${step.index}`;
    card.appendChild(title);

    card.appendChild(buildPotentialsBlock(problem, step.potentials));

    const deltaHeading = document.createElement("p");
    deltaHeading.innerHTML =
      "<strong>Δ = uᵢ + vⱼ − cᵢⱼ</strong>. Красные ячейки означают возможность улучшить план.";
    card.appendChild(deltaHeading);
    card.appendChild(buildDeltaTable(problem, step.deltas, step.entering));

    if (step.entering && step.loopPath) {
      const selected = document.createElement("p");
      selected.innerHTML = `Выбираем клетку с максимальной Δ: <strong>${formatCellLabel(
        problem,
        step.entering,
      )}</strong> (Δ = ${formatNumber(step.deltaValue)}).`;
      card.appendChild(selected);
      const cycle = document.createElement("div");
      cycle.className = "cycle-path";
      const parts = step.loopPath.map(
        (cell, idx) =>
          `${formatCellLabel(problem, cell)} ${step.loopSigns[idx] === "+" ? "(+)" : "(−)"}`,
      );
      cycle.textContent = `Цикл перераспределения: ${parts.join(" → ")}`;
      card.appendChild(cycle);
      const cycleNote = document.createElement("p");
      cycleNote.className = "muted";
      cycleNote.textContent =
        "Цикл всегда строится по занятым клеткам с чередованием знаков (+ добавляем груз, − вычитаем). Стартуем в выбранной свободной клетке.";
      card.appendChild(cycleNote);
      const cycleTable = buildCycleTable(problem, step);
      if (cycleTable) {
        card.appendChild(cycleTable);
      }
      if (step.thetaSources) {
        const thetaInfo = document.createElement("p");
        thetaInfo.className = "theta-info";
        const sources = step.thetaSources
          .map(
            (item) =>
              `${formatCellLabel(problem, item.cell)} = ${formatNumber(item.qty)}`,
          )
          .join(", ");
        thetaInfo.textContent = `Минимум среди ячеек со знаком (−): ${formatNumber(
          step.theta,
        )}. Участвуют: ${sources}.`;
        card.appendChild(thetaInfo);
      }
    } else if (step.note) {
      const warn = document.createElement("p");
      warn.className = "theta-info";
      warn.textContent = step.note;
      card.appendChild(warn);
    } else if (step.optimalSnapshot) {
      const note = document.createElement("p");
      note.className = "theta-info";
      note.textContent =
        "Все Δ-оценки ≤ 0, поэтому дальнейшая оптимизация не требуется.";
      card.appendChild(note);
    }
    optimizationSteps.appendChild(card);
  });
};

const renderBalancedMatrix = (problem) => {
  if (!balancedMatrixEl) return;
  const { table, cellRefs } = createTableStructure(problem);
  Object.entries(cellRefs).forEach(([key, cell]) => {
    const [row, col] = key.split("-").map(Number);
    cell.textContent = formatNumber(problem.costs[row][col]);
  });
  table.classList.add("plan-table");
  balancedMatrixEl.innerHTML = `
    <h3>Матрица стоимости</h3>
    <p class="muted">С учётом фиктивных узлов (если добавлены).</p>
  `;
  balancedMatrixEl.appendChild(table);
};

const renderPlanPreview = (problem, allocations) => {
  if (!planPreviewEl) return;
  const { table, cellRefs } = createTableStructure(problem);
  Object.entries(cellRefs).forEach(([key, cell]) => {
    const [row, col] = key.split("-").map(Number);
    const qty = allocations[row]?.[col] ?? 0;
    const wrapper = document.createElement("div");
    wrapper.className = "plan-cell";
    const costSpan = document.createElement("span");
    costSpan.className = "plan-cell__cost";
    costSpan.textContent = formatNumber(problem.costs[row][col]);
    wrapper.appendChild(costSpan);
    const allocSpan = document.createElement("span");
    allocSpan.className = "plan-cell__alloc";
    if (qty > EPS) {
      wrapper.classList.add("plan-cell--active");
      allocSpan.textContent = `[${formatNumber(qty)}]`;
    } else {
      allocSpan.textContent = "—";
    }
    wrapper.appendChild(allocSpan);
    cell.innerHTML = "";
    cell.appendChild(wrapper);
  });
  table.classList.add("plan-table");
  planPreviewEl.innerHTML = `
    <h3>Опорный план</h3>
    <p class="muted">В скобках показан объём перевозки для тарифа.</p>
  `;
  planPreviewEl.appendChild(table);
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

const updateAnswerSummary = (message) => {
  if (!answerSummaryEl) {
    return;
  }
  answerSummaryEl.textContent = message || "";
};

const renderSolution = (problem, allocations, totalCost, summaryMessage = "") => {
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
  updateAnswerSummary(summaryMessage);
};

const getBasisCells = (allocations) => {
  const basis = [];
  allocations.forEach((row, i) => {
    row.forEach((value, j) => {
      if (value > EPS) {
        basis.push({ row: i, col: j });
      }
    });
  });
  return basis;
};

const computePotentials = (problem, basis, rows, cols) => {
  const u = Array(rows).fill(null);
  const v = Array(cols).fill(null);
  if (!basis.length) {
    return { u: u.fill(0), v: v.fill(0) };
  }
  u[basis[0].row] = 0;
  let updated = true;
  while (updated) {
    updated = false;
    basis.forEach(({ row, col }) => {
      if (u[row] !== null && v[col] === null) {
        v[col] = problem.costs[row][col] - u[row];
        updated = true;
      } else if (v[col] !== null && u[row] === null) {
        u[row] = problem.costs[row][col] - v[col];
        updated = true;
      }
    });
  }
  for (let i = 0; i < rows; i += 1) {
    if (u[i] === null) u[i] = 0;
  }
  for (let j = 0; j < cols; j += 1) {
    if (v[j] === null) v[j] = 0;
  }
  return { u, v };
};

const findEnteringCell = (deltas, basis, rows, cols) => {
  const basisSet = new Set(basis.map((cell) => `${cell.row}-${cell.col}`));
  let candidate = null;
  for (let i = 0; i < rows; i += 1) {
    for (let j = 0; j < cols; j += 1) {
      const key = `${i}-${j}`;
      if (basisSet.has(key)) continue;
      const delta = deltas[i][j];
      if (!candidate || delta > candidate.delta) {
        candidate = { row: i, col: j, delta };
      }
    }
  }
  if (!candidate || candidate.delta <= EPS) {
    return null;
  }
  return candidate;
};

const findAdjustmentLoop = (entering, basis, rows, cols) => {
  const key = (cell) => `${cell.row}-${cell.col}`;
  const basisKeys = new Set(basis.map(key));
  basisKeys.add(key(entering));

  const rowMap = new Map();
  const colMap = new Map();
  const addToMaps = ({ row, col }) => {
    if (!rowMap.has(row)) rowMap.set(row, new Set());
    if (!colMap.has(col)) colMap.set(col, new Set());
    rowMap.get(row).add(col);
    colMap.get(col).add(row);
  };

  [...basis, entering].forEach(addToMaps);

  const path = [entering];
  const sameCell = (a, b) => a.row === b.row && a.col === b.col;

  const dfs = (current, moveRow) => {
    const neighborsSet = moveRow ? rowMap.get(current.row) : colMap.get(current.col);
    if (!neighborsSet) return false;
    const neighbors = [...neighborsSet];
    for (const value of neighbors) {
      const next = moveRow ? { row: current.row, col: value } : { row: value, col: current.col };
      if (sameCell(next, current)) continue;
      if (!basisKeys.has(key(next))) continue;
      const backToStart = sameCell(next, entering);
      if (backToStart && path.length >= 4) {
        path.push(entering);
        return true;
      }
      if (path.some((cell) => sameCell(cell, next))) continue;
      path.push(next);
      if (dfs(next, !moveRow)) return true;
      path.pop();
    }
    return false;
  };

  if (dfs(entering, true)) {
    return [...path];
  }
  path.length = 1;
  if (dfs(entering, false)) {
    return [...path];
  }
  return null;
};

const optimizeAllocations = (problem, allocations) => {
  const rows = allocations.length;
  const cols = allocations[0].length;
  const maxIterations = 30;
  let improved = false;
  const history = [];
  for (let iter = 0; iter < maxIterations; iter += 1) {
    const basis = getBasisCells(allocations);
    const { u, v } = computePotentials(problem, basis, rows, cols);
    const deltas = Array.from({ length: rows }, (_, i) =>
      Array.from({ length: cols }, (_, j) => u[i] + v[j] - problem.costs[i][j]),
    );
    const entering = findEnteringCell(deltas, basis, rows, cols);
    if (!entering) {
      history.push({
        index: history.length + 1,
        potentials: { u, v },
        deltas,
        optimalSnapshot: true,
      });
      return { allocations, iterations: iter, optimal: true, improved, history };
    }
    const loop = findAdjustmentLoop(entering, basis, rows, cols);
    if (!loop) {
      history.push({
        index: history.length + 1,
        potentials: { u, v },
        deltas,
        entering,
        deltaValue: entering.delta,
        note: "Не удалось построить цикл перераспределения для выбранной клетки.",
      });
      return {
        allocations,
        iterations: iter,
        optimal: false,
        message: "Не удалось построить цикл для оптимизации.",
        improved,
        history,
      };
    }
    const loopPath = loop.slice(0, -1);
    const loopSigns = loopPath.map((_, idx) => (idx % 2 === 0 ? "+" : "-"));
    const thetaCandidates = [];
    for (let idx = 1; idx < loopPath.length; idx += 2) {
      const cell = loopPath[idx];
      thetaCandidates.push({ cell, qty: allocations[cell.row][cell.col] });
    }
    let theta = Math.min(...thetaCandidates.map((item) => item.qty));
    if (!Number.isFinite(theta)) {
      history.push({
        index: history.length + 1,
        potentials: { u, v },
        deltas,
        entering,
        deltaValue: entering.delta,
        note: "Не удалось определить минимальный груз для перераспределения.",
      });
      return {
        allocations,
        iterations: iter,
        optimal: false,
        message: "Не удалось вычислить корректирующий шаг.",
        improved,
        history,
      };
    }
    history.push({
      index: history.length + 1,
      potentials: { u, v },
      deltas,
      entering,
      deltaValue: entering.delta,
      loopPath,
      loopSigns,
      theta,
      thetaSources: thetaCandidates,
      allocationSnapshot: cloneMatrix(allocations),
    });
    loopPath.forEach((cell, idx) => {
      if (idx % 2 === 0) {
        allocations[cell.row][cell.col] += theta;
      } else {
        allocations[cell.row][cell.col] -= theta;
      }
      if (allocations[cell.row][cell.col] < EPS) {
        allocations[cell.row][cell.col] = 0;
      }
    });
    improved = true;
  }
  return {
    allocations,
    iterations: maxIterations,
    optimal: false,
    message: "Превышен лимит итераций оптимизации.",
    improved,
    history,
  };
};

const handleSolve = () => {
  lastSolution = null;
  resetPreviews();
  try {
    setNote("Запускаем расчёт и проверяем балансировку...", "accent");
    const baseProblem = collectProblem();
    const { problem, note } = balanceProblem(baseProblem);
    setNote(note, "accent");
    renderBalancedMatrix(problem);
    const { allocations, steps } = northwestCorner(problem);
    const totalCost = computeTotalCost(problem, allocations);
    animateSolution(problem, steps, allocations, totalCost);
    renderPlanPreview(problem, allocations);
    renderSolution(problem, allocations, totalCost);
    lastSolution = {
      problem,
      allocations: cloneMatrix(allocations),
      totalCost,
    };
    if (optimizeBtn) {
      optimizeBtn.disabled = false;
    }
  } catch (error) {
    setNote(error.message, "error");
    clearAnimation();
    resetPreviews();
  }
};

const handleOptimize = () => {
  if (!lastSolution) {
    setNote("Сначала постройте опорный план.", "error");
    return;
  }
  const working = cloneMatrix(lastSolution.allocations);
  const result = optimizeAllocations(lastSolution.problem, working);
  const totalCost = computeTotalCost(lastSolution.problem, result.allocations);
  lastSolution.allocations = cloneMatrix(result.allocations);
  lastSolution.totalCost = totalCost;
  renderPlanPreview(lastSolution.problem, result.allocations);
  renderSolution(lastSolution.problem, result.allocations, totalCost);
  renderOptimizationDetails(result.history, lastSolution.problem);
  if (result.optimal) {
    const text = result.improved
      ? `План оптимизирован. Итоговая стоимость: ${formatNumber(totalCost)}.`
      : `План уже оптимален. Стоимость: ${formatNumber(totalCost)}.`;
    setNote(text, "accent");
    updateAnswerSummary(
      `Ответ: при найденном оптимальном решении стоимость перевозок составляет ${formatNumber(
        totalCost,
      )} у.е.`,
    );
  } else if (result.message) {
    setNote(result.message, "error");
    updateAnswerSummary("");
  } else {
    setNote(
      `План улучшен за ${result.iterations} итераций. Стоимость: ${formatNumber(totalCost)}.`,
      "accent",
    );
    updateAnswerSummary("");
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
if (optimizeBtn) {
  optimizeBtn.addEventListener("click", handleOptimize);
}

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
resetPreviews();
