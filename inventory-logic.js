/** Wayward / Manhattan inventory formulas (from MP_Inventory). */
const SERVICE_LEVEL = 0.95;
const MIN_PAR = 2;
const MARKUP = 2;
const USAGE_WINDOW_WEEKS = 4;

function safeDivisor(n, fallback = 1) {
  return n > 0 ? n : fallback;
}

function calcNewWeekly(sales4wk, caseSize, servingSize, containerSize) {
  if (!sales4wk || sales4wk <= 0) return MIN_PAR;
  const cs = safeDivisor(caseSize);
  const ss = servingSize > 0 ? servingSize : 1;
  const cont = safeDivisor(containerSize);
  const raw = ((((sales4wk / 30) * ss) / cont) / cs) * 7 / SERVICE_LEVEL;
  return Math.ceil(raw);
}

function calcNewWeeklyFromUsage(avgWeeklyUsage) {
  if (!Number.isFinite(avgWeeklyUsage) || avgWeeklyUsage <= 0) return MIN_PAR;
  return Math.max(MIN_PAR, Math.ceil(avgWeeklyUsage / SERVICE_LEVEL));
}

function calcWeekUsage(previousStock, received, currentStock) {
  const prev = Number.isFinite(previousStock) ? previousStock : 0;
  const recv = Number.isFinite(received) ? Math.max(0, received) : 0;
  const curr = Number.isFinite(currentStock) ? currentStock : 0;
  return prev + recv - curr;
}

function averageUsage(usages) {
  const clean = usages.filter((u) => Number.isFinite(u));
  if (clean.length === 0) return null;
  return clean.reduce((a, b) => a + b, 0) / clean.length;
}

function calcPar(newWeekly, manualPar) {
  if (manualPar != null && Number.isFinite(manualPar) && manualPar >= 0) {
    return manualPar;
  }
  return Math.max(newWeekly, MIN_PAR);
}

function calcNeeded(par, leadTimeDays, inStock) {
  const lead = Math.max(0, leadTimeDays);
  const stock = Number.isFinite(inStock) ? inStock : 0;
  return Math.round((par / 7) * lead + par - stock);
}

function calcCostPerServing(costPerUnit, caseSize, servingSize, containerSize) {
  const unitsPerCase =
    (safeDivisor(caseSize) * safeDivisor(containerSize)) / safeDivisor(servingSize, 1);
  if (unitsPerCase <= 0) return 0;
  return costPerUnit / unitsPerCase;
}

function calcAll(input) {
  let newWeekly;
  let parSource;

  if (input.manualPar != null && Number.isFinite(input.manualPar)) {
    newWeekly = input.manualPar;
    parSource = "manual";
  } else if (input.avgWeeklyUsage != null && Number.isFinite(input.avgWeeklyUsage)) {
    newWeekly = calcNewWeeklyFromUsage(input.avgWeeklyUsage);
    parSource = "usage";
  } else if (input.baselinePar != null && Number.isFinite(input.baselinePar)) {
    newWeekly = Math.max(MIN_PAR, input.baselinePar);
    parSource = "sheet";
  } else {
    newWeekly = calcNewWeekly(
      input.sales4wk,
      input.caseSize,
      input.servingSize,
      input.containerSize
    );
    parSource = "sales";
  }

  const par = parSource === "manual" ? input.manualPar : calcPar(newWeekly, null);
  const needed =
    parSource === "sheet"
      ? Math.round(par - (Number.isFinite(input.inStock) ? input.inStock : 0))
      : calcNeeded(par, input.leadTimeDays, input.inStock);
  const neededForOrder = Math.max(needed, 0);
  const costPerUnit = input.costPerUnit ?? 0;
  const weeklyCost = costPerUnit * neededForOrder;
  const costPerServing = calcCostPerServing(
    costPerUnit,
    input.caseSize,
    input.servingSize,
    input.containerSize
  );
  const resellPrice = costPerServing * MARKUP;

  return {
    newWeekly,
    par,
    needed,
    neededForOrder,
    weeklyCost,
    costPerServing,
    resellPrice,
    parSource,
  };
}

function formatMoney(n) {
  if (!Number.isFinite(n)) return "$0.00";
  return `$${n.toFixed(2)}`;
}

module.exports = {
  SERVICE_LEVEL,
  MIN_PAR,
  MARKUP,
  USAGE_WINDOW_WEEKS,
  calcNewWeekly,
  calcNewWeeklyFromUsage,
  calcWeekUsage,
  averageUsage,
  calcPar,
  calcNeeded,
  calcCostPerServing,
  calcAll,
  formatMoney,
};
