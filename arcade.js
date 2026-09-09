/**
 * Recreational arcade games. Scores stay on this device — not training analytics.
 */
const HIGHWAY_STORAGE_KEY = "mp-arcade-highway-high";
const ATOM_STORAGE_KEY = "mp-arcade-atom-high";
const HIGHWAY_LANES = 4;
const HIGHWAY_LANE_MS = 160;
const HIGHWAY_STEER_LOCK_MS = 180;
const HIGHWAY_HAZARDS = [
  "keg", "can", "pint", "tray", "burger", "taco", "chair",
  "tub", "box", "cone", "spill", "towel", "menus", "merch"
];

let highwayRaf = null;
let highwayState = null;

function highwayHighScore() {
  try {
    return Number(localStorage.getItem(HIGHWAY_STORAGE_KEY) || 0) || 0;
  } catch (_) {
    return 0;
  }
}

function saveHighwayHighScore(score) {
  try {
    const best = Math.max(highwayHighScore(), Math.floor(score));
    localStorage.setItem(HIGHWAY_STORAGE_KEY, String(best));
    return best;
  } catch (_) {
    return Math.floor(score);
  }
}

function atomHighScore() {
  try {
    return Number(localStorage.getItem(ATOM_STORAGE_KEY) || 0) || 0;
  } catch (_) {
    return 0;
  }
}

function saveAtomHighScore(score) {
  try {
    const best = Math.max(atomHighScore(), Math.floor(score));
    localStorage.setItem(ATOM_STORAGE_KEY, String(best));
    return best;
  } catch (_) {
    return Math.floor(score);
  }
}

function stopHighwayLoop() {
  if (highwayRaf) {
    cancelAnimationFrame(highwayRaf);
    highwayRaf = null;
  }
  window.removeEventListener("keydown", onHighwayKeyDown);
}

function onHighwayKeyDown(event) {
  if (!highwayState) return;
  if (event.key === "p" || event.key === "P") {
    event.preventDefault();
    toggleHighwayPause();
    return;
  }
  if (event.key === "Escape") {
    event.preventDefault();
    if (!highwayState.over) toggleHighwayPause();
    return;
  }
  if (highwayState.over || highwayState.paused) return;
  if (event.repeat) return;
  if (event.key === "ArrowLeft" || event.key === "a" || event.key === "A") {
    event.preventDefault();
    nudgeHighwayLane(-1);
    return;
  }
  if (event.key === "ArrowRight" || event.key === "d" || event.key === "D") {
    event.preventDefault();
    nudgeHighwayLane(1);
    return;
  }
  if (event.key === " " || event.key === "Shift") {
    event.preventDefault();
    tryHighwayBoost();
  }
}

function nudgeHighwayLane(dir) {
  if (!highwayState || highwayState.over || highwayState.paused) return;
  const now = performance.now();
  if (now - (highwayState.steerAt || 0) < HIGHWAY_STEER_LOCK_MS) return;
  const next = highwayState.lane + (dir < 0 ? -1 : 1);
  if (next < 0 || next >= HIGHWAY_LANES) return;
  highwayState.lane = next;
  highwayState.steerAt = now;
}

function tryHighwayBoost() {
  if (!highwayState || highwayState.paused || highwayState.over) return;
  if (highwayState.boosts < 1 || highwayState.boostT > 0) return;
  highwayState.boosts -= 1;
  highwayState.boostT = 2.4;
  syncHighwayHud();
}

function toggleHighwayPause() {
  if (!highwayState || highwayState.over) return;
  highwayState.paused = !highwayState.paused;
  syncHighwayOverlay();
}

function restartHighway() {
  stopHighwayLoop();
  startHighwayLoop();
}

function resumeHighway() {
  if (!highwayState || highwayState.over) return;
  highwayState.paused = false;
  syncHighwayOverlay();
}

function syncHighwayHud() {
  const dist = document.getElementById("highwayDist");
  const score = document.getElementById("highwayScore");
  const best = document.getElementById("highwayBest");
  const boosts = document.getElementById("highwayBoosts");
  const active = document.getElementById("highwayBoostActive");
  if (!highwayState) return;
  if (dist) dist.textContent = `${Math.floor(highwayState.distance)} m`;
  if (score) score.textContent = String(Math.floor(highwayState.score));
  if (best) best.textContent = String(highwayState.best);
  if (boosts) boosts.textContent = String(highwayState.boosts);
  if (active) active.hidden = highwayState.boostT <= 0;
  const hud = document.getElementById("highwayHud");
  if (hud) hud.classList.toggle("is-boosting", highwayState.boostT > 0);
}

function syncHighwayOverlay() {
  const overlay = document.getElementById("highwayOverlay");
  const panel = document.getElementById("highwayOverlayPanel");
  const pauseBtn = document.getElementById("highwayPause");
  if (!overlay || !panel || !highwayState) return;

  if (highwayState.over) {
    overlay.hidden = false;
    overlay.dataset.state = "over";
    panel.innerHTML = `
      <p class="highway-overlay-kicker">Run over</p>
      <p class="highway-overlay-stat">Distance: <strong>${Math.floor(highwayState.distance)} m</strong></p>
      <p class="highway-overlay-stat">Score: <strong>${Math.floor(highwayState.score)}</strong></p>
      <p class="highway-overlay-stat">Best: <strong>${highwayState.best}</strong></p>
      <button type="button" class="btn btn-primary" onclick="restartHighway()">Restart</button>
    `;
    if (pauseBtn) pauseBtn.textContent = "Pause";
    return;
  }

  if (highwayState.paused) {
    overlay.hidden = false;
    overlay.dataset.state = "paused";
    panel.innerHTML = `
      <p class="highway-overlay-kicker">Paused</p>
      <button type="button" class="btn btn-primary" onclick="resumeHighway()">Resume</button>
    `;
    if (pauseBtn) pauseBtn.textContent = "Resume";
    return;
  }

  overlay.hidden = true;
  overlay.dataset.state = "play";
  panel.innerHTML = "";
  if (pauseBtn) pauseBtn.textContent = "Pause";
}

function roadMetrics(width) {
  const left = width * 0.12;
  const w = width * 0.76;
  return { left, w, laneW: w / HIGHWAY_LANES };
}

function laneX(lane, width) {
  const road = roadMetrics(width);
  return road.left + road.laneW * (lane + 0.5);
}

function startHighwayLoop() {
  const canvas = document.getElementById("highwayCanvas");
  if (!canvas) return;
  stopHighwayLoop();
  const ctx = canvas.getContext("2d");
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  const cssW = canvas.clientWidth || 360;
  const cssH = canvas.clientHeight || 400;
  canvas.width = Math.round(cssW * dpr);
  canvas.height = Math.round(cssH * dpr);
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

  highwayState = {
    w: cssW,
    h: cssH,
    lane: 1,
    laneF: 1,
    steerAt: 0,
    speed: 160,
    distance: 0,
    score: 0,
    best: highwayHighScore(),
    boosts: 0,
    boostT: 0,
    slowT: 0,
    spawn: 0,
    atomSpawn: 0.55,
    items: [],
    pops: [],
    dashed: 0,
    paused: false,
    over: false,
    last: 0
  };

  if (typeof window !== "undefined") window.highwayState = highwayState;
  window.addEventListener("keydown", onHighwayKeyDown);
  syncHighwayHud();
  syncHighwayOverlay();

  const tick = (now) => {
    if (!highwayState) return;
    const t = now / 1000;
    if (!highwayState.last) highwayState.last = t;
    const dt = Math.min(0.04, t - highwayState.last);
    highwayState.last = t;
    if (!highwayState.paused && !highwayState.over) stepHighway(dt);
    drawHighway(ctx);
    highwayRaf = requestAnimationFrame(tick);
  };
  highwayRaf = requestAnimationFrame(tick);
}

function canPlaceHighway(lane, y, kind) {
  const near = highwayState.items.filter((item) => Math.abs(item.y - y) < 90);
  if (near.some((item) => item.lane === lane)) return false;
  if (kind !== "atom") {
    const hazardLanes = new Set(
      near.filter((item) => item.kind !== "atom").map((item) => item.lane)
    );
    hazardLanes.add(lane);
    if (hazardLanes.size >= HIGHWAY_LANES) return false;
  }
  return true;
}

function pickHighwayLane(kind) {
  const open = [];
  for (let i = 0; i < HIGHWAY_LANES; i += 1) {
    if (canPlaceHighway(i, -42, kind)) open.push(i);
  }
  if (!open.length) return -1;
  return open[Math.floor(Math.random() * open.length)];
}

function spawnHighwayItem(kind) {
  const lane = pickHighwayLane(kind);
  if (lane < 0) return;
  const resolved = kind === "hazard"
    ? HIGHWAY_HAZARDS[Math.floor(Math.random() * HIGHWAY_HAZARDS.length)]
    : kind;
  highwayState.items.push({
    kind: resolved,
    lane,
    y: -42
  });
}

function stepHighway(dt) {
  const s = highwayState;
  const laneStep = dt / (HIGHWAY_LANE_MS / 1000);
  if (s.laneF < s.lane) s.laneF = Math.min(s.lane, s.laneF + laneStep);
  else if (s.laneF > s.lane) s.laneF = Math.max(s.lane, s.laneF - laneStep);

  const boosting = s.boostT > 0;
  if (boosting) s.boostT = Math.max(0, s.boostT - dt);
  if (s.slowT > 0) s.slowT = Math.max(0, s.slowT - dt);
  s.speed = Math.min(430, 158 + s.distance * 0.085 + (boosting ? 95 : 0));
  if (s.slowT > 0) s.speed *= 0.55;
  const travel = s.speed * dt;
  s.distance += travel * 0.35;
  s.score += travel * (boosting ? 0.22 : 0.12);
  s.dashed = (s.dashed + travel) % 56;

  s.pops = (s.pops || []).filter((pop) => {
    pop.t -= dt;
    return pop.t > 0;
  });

  s.spawn -= dt;
  s.atomSpawn -= dt;
  const gap = Math.max(0.46, 1.18 - s.distance / 900);
  if (s.spawn <= 0) {
    spawnHighwayItem("hazard");
    if (Math.random() < 0.32) spawnHighwayItem("hazard");
    s.spawn = gap;
  }
  if (s.atomSpawn <= 0) {
    spawnHighwayItem("atom");
    s.atomSpawn = 0.85 + Math.random() * 0.7;
  }

  const py = s.h - 74;
  s.items.forEach((item) => {
    item.y += travel;
  });
  s.items = s.items.filter((item) => {
    if (item.y > s.h + 46) return false;
    const dx = Math.abs(laneX(item.lane, s.w) - laneX(s.laneF, s.w));
    const dy = Math.abs(item.y - py);
    const hit = dx < 26 && dy < 28;
    if (!hit) return true;
    if (item.kind === "atom") {
      s.score += 40;
      s.boosts = Math.min(3, s.boosts + 1);
      s.pops.push({ x: laneX(item.lane, s.w), y: item.y, t: 0.28 });
      syncHighwayHud();
      return false;
    }
    if (item.kind === "spill") {
      s.slowT = 1.15;
      s.pops.push({ x: laneX(item.lane, s.w), y: item.y, t: 0.22, spill: true });
      return false;
    }
    if (!boosting) {
      endHighway();
      return false;
    }
    return false;
  });
  syncHighwayHud();
}

function endHighway() {
  const s = highwayState;
  s.over = true;
  s.paused = false;
  s.best = saveHighwayHighScore(s.score);
  syncHighwayHud();
  syncHighwayOverlay();
}

function highwayRoundRect(ctx, x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + rad, y);
  ctx.arcTo(x + w, y, x + w, y + h, rad);
  ctx.arcTo(x + w, y + h, x, y + h, rad);
  ctx.arcTo(x, y + h, x, y, rad);
  ctx.arcTo(x, y, x + w, y, rad);
  ctx.closePath();
}

function drawHighway(ctx) {
  const s = highwayState;
  const w = s.w;
  const h = s.h;
  const boosting = s.boostT > 0;
  const road = roadMetrics(w);

  ctx.fillStyle = "#070809";
  ctx.fillRect(0, 0, w, h);
  ctx.fillStyle = "#0c0e10";
  ctx.fillRect(0, 0, road.left, h);
  ctx.fillRect(road.left + road.w, 0, w - road.left - road.w, h);

  ctx.fillStyle = "#2a2f33";
  ctx.fillRect(road.left, 0, road.w, h);
  ctx.fillStyle = "rgba(255,255,255,0.035)";
  ctx.fillRect(road.left + 5, 0, road.w - 10, h);

  ctx.strokeStyle = "#d7c4a3";
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.moveTo(road.left + 3, 0);
  ctx.lineTo(road.left + 3, h);
  ctx.moveTo(road.left + road.w - 3, 0);
  ctx.lineTo(road.left + road.w - 3, h);
  ctx.stroke();

  ctx.strokeStyle = boosting ? "#e4c39a" : "#c9b089";
  ctx.lineWidth = 2.4;
  ctx.setLineDash([16, 14]);
  ctx.lineDashOffset = -s.dashed * (boosting ? 1.35 : 1);
  for (let i = 1; i < HIGHWAY_LANES; i += 1) {
    const x = road.left + road.laneW * i;
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, h);
    ctx.stroke();
  }
  ctx.setLineDash([]);

  if (boosting) {
    ctx.strokeStyle = "rgba(201, 149, 112, 0.3)";
    ctx.lineWidth = 1.4;
    for (let i = 0; i < 10; i += 1) {
      const x = road.left + 10 + ((i * 37 + s.dashed * 2) % (road.w - 20));
      const y = ((i * 53 + s.dashed * 3) % (h + 40)) - 20;
      ctx.beginPath();
      ctx.moveTo(x, y);
      ctx.lineTo(x, y + 18);
      ctx.stroke();
    }
  }

  s.items.forEach((item) => {
    const x = laneX(item.lane, w);
    if (item.kind === "atom") drawHighwayAtom(ctx, x, item.y);
    else drawHighwayHazard(ctx, item.kind, x, item.y);
  });

  (s.pops || []).forEach((pop) => {
    const life = pop.t / 0.28;
    ctx.strokeStyle = pop.spill ? "rgba(201,149,112,0.45)" : "rgba(255,244,214,0.9)";
    ctx.lineWidth = pop.spill ? 1.5 : 2.2;
    ctx.beginPath();
    ctx.arc(pop.x, pop.y, 10 + (1 - life) * 18, 0, Math.PI * 2);
    ctx.stroke();
  });

  drawHighwayCan(ctx, laneX(s.laneF, w), h - 74, boosting);
}

function drawHighwayAtom(ctx, x, y) {
  ctx.save();
  ctx.translate(x, y);
  ctx.strokeStyle = "#f3d7a8";
  ctx.lineWidth = 2.2;
  ctx.shadowColor = "rgba(255, 214, 150, 0.95)";
  ctx.shadowBlur = 14;
  for (let i = 0; i < 3; i += 1) {
    ctx.beginPath();
    ctx.ellipse(0, 0, 13, 5.5, (i * Math.PI) / 3, 0, Math.PI * 2);
    ctx.stroke();
  }
  ctx.fillStyle = "#fff8ee";
  ctx.beginPath();
  ctx.arc(0, 0, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawHighwayHazard(ctx, kind, x, y) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === "keg") {
    ctx.fillStyle = "#3a3f44";
    ctx.beginPath();
    highwayRoundRect(ctx, -11, -16, 22, 30, 6);
    ctx.fill();
    ctx.fillStyle = "#6d7378";
    ctx.fillRect(-12, -8, 24, 3);
    ctx.fillRect(-12, 4, 24, 3);
    ctx.fillStyle = "#c9b089";
    ctx.fillRect(-4, -3, 8, 8);
  } else if (kind === "can") {
    ctx.fillStyle = "#8a9096";
    ctx.beginPath();
    highwayRoundRect(ctx, -7, -4, 18, 10, 3);
    ctx.fill();
    ctx.fillStyle = "#c45c48";
    ctx.fillRect(-5, -2, 14, 6);
  } else if (kind === "pint") {
    ctx.fillStyle = "rgba(232, 214, 176, 0.88)";
    ctx.beginPath();
    ctx.moveTo(-7, -14);
    ctx.lineTo(7, -14);
    ctx.lineTo(5, 12);
    ctx.lineTo(-5, 12);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#d7c4a3";
    ctx.stroke();
    ctx.fillStyle = "#c9954a";
    ctx.fillRect(-6, -8, 12, 10);
  } else if (kind === "tray") {
    ctx.fillStyle = "#6b5340";
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 7, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#d8c4a2";
    ctx.beginPath();
    ctx.arc(-5, 1, 4, 0, Math.PI * 2);
    ctx.arc(5, 2, 3.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "burger") {
    ctx.fillStyle = "#c9853a";
    ctx.beginPath();
    ctx.ellipse(0, -6, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#6b3a22";
    ctx.fillRect(-11, -3, 22, 5);
    ctx.fillStyle = "#d7a36f";
    ctx.beginPath();
    ctx.ellipse(0, 6, 12, 5, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "taco") {
    ctx.fillStyle = "#e0b15a";
    ctx.beginPath();
    ctx.arc(0, 4, 13, Math.PI, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#4f7a3a";
    ctx.fillRect(-8, -2, 16, 3);
  } else if (kind === "chair") {
    ctx.fillStyle = "#5b4030";
    ctx.fillRect(-10, -14, 20, 6);
    ctx.fillRect(-12, -8, 24, 10);
    ctx.fillRect(-12, 2, 3, 12);
    ctx.fillRect(9, 2, 3, 12);
  } else if (kind === "tub") {
    ctx.fillStyle = "#5d666e";
    ctx.beginPath();
    highwayRoundRect(ctx, -15, -8, 30, 18, 4);
    ctx.fill();
    ctx.fillStyle = "#8b949c";
    ctx.fillRect(-13, -6, 26, 5);
  } else if (kind === "box") {
    ctx.fillStyle = "#b8884c";
    ctx.fillRect(-13, -12, 26, 24);
    ctx.fillStyle = "#8f6230";
    ctx.fillRect(-13, -2, 26, 4);
    ctx.fillStyle = "#f1eee7";
    ctx.font = "700 6px Josefin Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BEER", 0, 8);
  } else if (kind === "cone") {
    ctx.fillStyle = "#e07a2f";
    ctx.beginPath();
    ctx.moveTo(0, -16);
    ctx.lineTo(11, 12);
    ctx.lineTo(-11, 12);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4efe6";
    ctx.fillRect(-8, -1, 16, 5);
  } else if (kind === "spill") {
    ctx.fillStyle = "rgba(156, 107, 74, 0.55)";
    ctx.beginPath();
    ctx.ellipse(0, 4, 16, 8, -0.2, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "rgba(201, 149, 112, 0.45)";
    ctx.beginPath();
    ctx.ellipse(-4, 2, 7, 4, 0.4, 0, Math.PI * 2);
    ctx.fill();
  } else if (kind === "towel") {
    ctx.fillStyle = "#8aa0a8";
    ctx.beginPath();
    highwayRoundRect(ctx, -14, -6, 28, 14, 3);
    ctx.fill();
    ctx.fillStyle = "#c5d2d6";
    ctx.fillRect(-12, -3, 24, 4);
  } else if (kind === "menus") {
    ctx.fillStyle = "#efe6d4";
    ctx.fillRect(-10, -12, 18, 24);
    ctx.fillStyle = "#d7c4a3";
    ctx.fillRect(-7, -14, 18, 24);
    ctx.fillStyle = "#9c6b4a";
    ctx.fillRect(-4, -8, 12, 2);
    ctx.fillRect(-4, -3, 10, 2);
  } else {
    ctx.fillStyle = "#2c3338";
    ctx.fillRect(-13, -12, 26, 24);
    ctx.fillStyle = "#c99570";
    ctx.fillRect(-13, -12, 26, 6);
    ctx.fillStyle = "#f1eee7";
    ctx.font = "700 7px Josefin Sans, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("MP", 0, 6);
  }
  ctx.restore();
}

function drawHighwayCan(ctx, x, y, boosting) {
  ctx.save();
  ctx.translate(x, y);
  if (boosting) {
    ctx.shadowColor = "rgba(201,149,112,0.9)";
    ctx.shadowBlur = 18;
    ctx.strokeStyle = "rgba(232,195,153,0.5)";
    ctx.lineWidth = 1.6;
    for (let i = -2; i <= 2; i += 1) {
      ctx.beginPath();
      ctx.moveTo(i * 5, 20);
      ctx.lineTo(i * 5, 36 + Math.abs(i) * 3);
      ctx.stroke();
    }
  }
  ctx.fillStyle = "#9aa0a6";
  ctx.beginPath();
  ctx.ellipse(0, -16, 9, 3.4, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = boosting ? "#d7a36f" : "#cfc6b6";
  ctx.beginPath();
  highwayRoundRect(ctx, -10, -16, 20, 34, 7);
  ctx.fill();
  ctx.fillStyle = "#2a1c14";
  ctx.fillRect(-10, -8, 20, 18);
  ctx.fillStyle = "#c99570";
  ctx.font = "700 5.5px Josefin Sans, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("HALF-LIFE", 0, 3);
  ctx.strokeStyle = "#e8c399";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(0, -2, 4.5, 2, 0.5, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = "#f4efe6";
  ctx.beginPath();
  ctx.arc(0, -2, 1.3, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#8d949a";
  ctx.beginPath();
  ctx.ellipse(0, 17, 8, 2.6, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function renderHighwayGame(content) {
  const best = highwayHighScore();
  const html = `
    <div class="highway-shell">
      <div class="highway-hud" id="highwayHud" aria-live="polite">
        <span>Distance <strong id="highwayDist">0 m</strong></span>
        <span>Score <strong id="highwayScore">0</strong></span>
        <span>Best <strong id="highwayBest">${best}</strong></span>
        <span>Boost <strong id="highwayBoosts">0</strong></span>
        <span class="highway-boost-chip" id="highwayBoostActive" hidden>Boost active</span>
      </div>
      <div class="highway-stage">
        <canvas id="highwayCanvas" width="360" height="400" aria-label="Half-Life Highway"></canvas>
        <div class="highway-overlay" id="highwayOverlay" hidden data-state="play">
          <div class="highway-overlay-panel" id="highwayOverlayPanel"></div>
        </div>
      </div>
      <div class="highway-drive" aria-label="Steering">
        <button type="button" class="highway-pad" onclick="nudgeHighwayLane(-1)" aria-label="Move left">←</button>
        <button type="button" class="highway-pad highway-pad-boost" onclick="tryHighwayBoost()" aria-label="Atom Boost">Boost</button>
        <button type="button" class="highway-pad" onclick="nudgeHighwayLane(1)" aria-label="Move right">→</button>
      </div>
      <div class="highway-controls">
        <button type="button" class="btn btn-secondary" id="highwayPause" onclick="toggleHighwayPause()">Pause</button>
        <button type="button" class="btn btn-secondary" onclick="restartHighway()">Restart</button>
      </div>
      <p class="highway-help">Left/Right or A/D move one lane · space for Atom Boost · P to pause. Scores stay on this device.</p>
    </div>
  `;
  content.innerHTML = typeof wrapGame === "function" ? wrapGame(html) : html;
  queueMicrotask(startHighwayLoop);
}

if (typeof window !== "undefined") {
  window.renderHighwayGame = renderHighwayGame;
  window.stopHighwayLoop = stopHighwayLoop;
  window.restartHighway = restartHighway;
  window.resumeHighway = resumeHighway;
  window.toggleHighwayPause = toggleHighwayPause;
  window.tryHighwayBoost = tryHighwayBoost;
  window.nudgeHighwayLane = nudgeHighwayLane;
  window.syncHighwayOverlay = syncHighwayOverlay;
  window.HIGHWAY_STORAGE_KEY = HIGHWAY_STORAGE_KEY;
  window.ATOM_STORAGE_KEY = ATOM_STORAGE_KEY;
  window.highwayHighScore = highwayHighScore;
  window.atomHighScore = atomHighScore;
  window.saveAtomHighScore = saveAtomHighScore;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    HIGHWAY_STORAGE_KEY,
    HIGHWAY_LANES,
    HIGHWAY_LANE_MS,
    HIGHWAY_STEER_LOCK_MS,
    highwayHighScore,
    saveHighwayHighScore,
    ATOM_STORAGE_KEY,
    atomHighScore,
    saveAtomHighScore
  };
}
