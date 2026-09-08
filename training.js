/**
 * Training dashboard — visual redesign (UX Phase 6).
 * Behavior still deep-links into Launch Pad; progress from /api/first-five/me.
 *
 * Expects: apiFetch, escapeHTML, escapeForAttribute, currentUser, contentType,
 * activateAppTab, StaffRoles, floorSection, checklistId, renderTodayAtMpStrip,
 * renderPageHeader (optional).
 */

const TRAINING_SKILL_META = {
  login_portal: {
    label: "Find your way around Launch Pad",
    kind: "know",
    open: () => activateAppTab("features")
  },
  find_on_tap: {
    label: "Find beers on tap",
    kind: "observe",
    open: () => activateAppTab("ontap")
  },
  ask_mp: {
    label: "Open the app guide",
    kind: "know",
    open: () => activateAppTab("features")
  },
  allergy_confirm: {
    label: "Allergy check before guessing",
    kind: "observe",
    open: () => {
      floorSection = "allergy";
      activateAppTab("floor");
    }
  },
  taste_one_beer: {
    label: "Taste one beer on tap",
    kind: "demonstrate",
    open: () => activateAppTab("ontap")
  },
  guest_greet: {
    label: "Guest greet practice",
    kind: "observe",
    open: () => activateAppTab("games")
  },
  style_basics: {
    label: "Beer style basics",
    kind: "know",
    open: () => activateAppTab("beer")
  },
  coffee_menu: {
    label: "Review the coffee menu",
    kind: "know",
    open: () => activateAppTab("coffee")
  },
  end_of_shift: {
    label: "End of Shift survey",
    kind: "observe",
    open: () => activateAppTab("shift-survey")
  },
  checklist_run: {
    label: "Run an opening checklist",
    kind: "demonstrate",
    open: () => {
      if (typeof checklistId !== "undefined") checklistId = "opening";
      activateAppTab("checklists");
    }
  },
  sop_lookup: {
    label: "Look up an SOP",
    kind: "know",
    open: () => activateAppTab("sops")
  },
  eighty_six_board: {
    label: "Check the 86 board",
    kind: "observe",
    open: () => {
      floorSection = "board";
      activateAppTab("floor");
    }
  },
  "86_board": {
    label: "Check the 86 board",
    kind: "observe",
    open: () => {
      floorSection = "board";
      activateAppTab("floor");
    }
  },
  sell_this: {
    label: "Sell This Today",
    kind: "observe",
    open: () => {
      floorSection = "sell";
      activateAppTab("floor");
    }
  },
  pairing_talk: {
    label: "Food & beer pairing",
    kind: "know",
    open: () => {
      floorSection = "recommend";
      activateAppTab("floor");
    }
  },
  recovery_scenario: {
    label: "Complaint recovery scenarios",
    kind: "demonstrate",
    open: () => activateAppTab("games")
  },
  independent_service: {
    label: "Independent service focus",
    kind: "demonstrate",
    open: () => activateAppTab("floor")
  },
  events_awareness: {
    label: "Events awareness",
    kind: "know",
    open: () => activateAppTab("sops")
  },
  trainer_signoff: {
    label: "Trainer sign-off",
    kind: "demonstrate",
    open: () => {
      floorSection = "firstfive";
      activateAppTab("floor");
    }
  }
};

const TRAINING_KIND_LABEL = {
  know: "Learn",
  observe: "Practice",
  demonstrate: "Demonstrate"
};

const TRAINING_KIND_STATUS = {
  know: "learning",
  observe: "learning",
  demonstrate: "ready"
};

const TRAINING_STATUS_LABEL = {
  verified: "Verified",
  learning: "Learning",
  ready: "Ready to demonstrate",
  "not-started": "Not started",
  practice: "Needs practice"
};

let trainingState = {
  loaded: false,
  loading: false,
  error: "",
  curriculum: [],
  progress: [],
  unlockedShift: 1,
  doneKeys: new Set()
};

function isTraineeUser(user = typeof currentUser !== "undefined" ? currentUser : null) {
  if (!user) return false;
  if (typeof StaffRoles !== "undefined" && StaffRoles?.hasRole) {
    return StaffRoles.hasRole(user, "trainee");
  }
  return String(user.role || "").toLowerCase() === "trainee";
}

function trainingFirstName(user = currentUser) {
  const name = String(user?.name || "there").trim();
  return name.split(/\s+/)[0] || "there";
}

function defaultHomeTabForUser(user = currentUser) {
  return isTraineeUser(user) ? "training" : "home";
}

function resetTrainingState() {
  trainingState = {
    loaded: false,
    loading: false,
    error: "",
    curriculum: [],
    progress: [],
    unlockedShift: 1,
    doneKeys: new Set()
  };
}

function computeTrainingProgress(curriculum, progressRows) {
  const doneKeys = new Set(
    (progressRows || [])
      .filter((row) => row.demonstrated)
      .map((row) => `${row.shift_number}:${row.skill_key}`)
  );
  let unlockedShift = 1;
  let completedSkills = 0;
  let totalSkills = 0;

  (curriculum || []).forEach((block) => {
    const skills = block.skills || [];
    totalSkills += skills.length;
    skills.forEach((sk) => {
      if (doneKeys.has(`${block.shift}:${sk}`)) completedSkills += 1;
    });
  });

  for (let shift = 1; shift <= 5; shift += 1) {
    const block = (curriculum || []).find((c) => c.shift === shift);
    if (!block) break;
    const complete = (block.skills || []).every((sk) => doneKeys.has(`${shift}:${sk}`));
    if (complete) unlockedShift = Math.min(5, shift + 1);
    else {
      unlockedShift = shift;
      break;
    }
  }

  const percent = totalSkills ? Math.round((completedSkills / totalSkills) * 100) : 0;
  return { doneKeys, unlockedShift, completedSkills, totalSkills, percent };
}

function nextIncompleteTrainingActivity() {
  const { curriculum, doneKeys, unlockedShift } = trainingState;
  for (let shift = 1; shift <= unlockedShift; shift += 1) {
    const block = (curriculum || []).find((c) => c.shift === shift);
    if (!block) continue;
    for (const skillKey of block.skills || []) {
      if (!doneKeys.has(`${shift}:${skillKey}`)) {
        return { shift, skillKey, block };
      }
    }
  }
  return null;
}

async function ensureTrainingState(force = false) {
  if (!currentUser) {
    resetTrainingState();
    return trainingState;
  }
  if (trainingState.loaded && !force) return trainingState;
  if (trainingState.loading) return trainingState;

  trainingState.loading = true;
  try {
    const data = await apiFetch("/api/first-five/me");
    const curriculum = data.curriculum || [];
    const progress = data.progress || [];
    const computed = computeTrainingProgress(curriculum, progress);
    trainingState = {
      loaded: true,
      loading: false,
      error: "",
      curriculum,
      progress,
      unlockedShift: computed.unlockedShift,
      doneKeys: computed.doneKeys,
      completedSkills: computed.completedSkills,
      totalSkills: computed.totalSkills,
      percent: computed.percent
    };
  } catch (error) {
    trainingState = {
      loaded: true,
      loading: false,
      error: error.message || "Could not load training progress.",
      curriculum: [],
      progress: [],
      unlockedShift: 1,
      doneKeys: new Set(),
      completedSkills: 0,
      totalSkills: 0,
      percent: 0
    };
  }
  return trainingState;
}

function openTrainingSkill(skillKey) {
  const meta = TRAINING_SKILL_META[skillKey];
  if (meta?.open) {
    meta.open();
    return;
  }
  floorSection = "firstfive";
  activateAppTab("floor");
}

function continueTraining() {
  const next = nextIncompleteTrainingActivity();
  if (!next) {
    floorSection = "firstfive";
    activateAppTab("floor");
    return;
  }
  openTrainingSkill(next.skillKey);
}

function trainingQuickLink(action) {
  switch (action) {
    case "path":
      floorSection = "firstfive";
      activateAppTab("floor");
      break;
    case "skills":
      floorSection = "skills";
      activateAppTab("floor");
      break;
    case "games":
      activateAppTab("games");
      break;
    case "progress":
      activateAppTab("progress");
      break;
    case "feedback":
      activateAppTab("feedback");
      break;
    case "ontap":
      activateAppTab("ontap");
      break;
    case "checklists":
      if (typeof checklistId !== "undefined") checklistId = "opening";
      activateAppTab("checklists");
      break;
    case "features":
      activateAppTab("features");
      break;
    default:
      break;
  }
}

function shiftShortTitle(block) {
  if (!block) return "Training";
  const raw = String(block.title || "");
  const afterDash = raw.split(/—|–|-/).slice(1).join("-").trim();
  if (afterDash) return afterDash;
  return raw || `Shift ${block.shift}`;
}

function skillStatusFor(state, shift, skillKey, kind) {
  if (state.doneKeys.has(`${shift}:${skillKey}`)) return "verified";
  if (shift < state.unlockedShift) return "practice";
  if (shift > state.unlockedShift) return "not-started";
  return TRAINING_KIND_STATUS[kind] || "learning";
}

function renderTrainingStatusChip(status) {
  const label = TRAINING_STATUS_LABEL[status] || status;
  return `<span class="training-status training-status-${escapeForAttribute(status)}">${escapeHTML(label)}</span>`;
}

function renderTrainingRoadmap(state) {
  const blocks = [];
  for (let shift = 1; shift <= 5; shift += 1) {
    const block = (state.curriculum || []).find((c) => c.shift === shift) || {
      shift,
      title: `Shift ${shift}`,
      focus: "",
      skills: []
    };
    const skills = block.skills || [];
    const doneCount = skills.filter((sk) => state.doneKeys.has(`${shift}:${sk}`)).length;
    const complete = skills.length > 0 && doneCount === skills.length;
    const current = shift === state.unlockedShift && !complete;
    let stateClass = "is-upcoming";
    let marker = "○";
    let caption = "Up next";
    if (complete) {
      stateClass = "is-done";
      marker = "✓";
      caption = "Completed";
    } else if (current || (shift === state.unlockedShift && !skills.length)) {
      stateClass = "is-current";
      marker = "●";
      caption = "You are here";
    } else if (shift < state.unlockedShift) {
      stateClass = "is-open";
      marker = "●";
      caption = "In progress";
    }
    blocks.push(`
      <div class="training-road-step ${stateClass}">
        <span class="training-road-marker" aria-hidden="true">${marker}</span>
        <div class="training-road-copy">
          <span class="training-road-shift">Shift ${shift}</span>
          <strong>${escapeHTML(shiftShortTitle(block))}</strong>
          <small>${escapeHTML(caption)}${skills.length ? ` · ${doneCount}/${skills.length}` : ""}</small>
        </div>
      </div>
    `);
  }
  return `
    <section class="training-section">
      <h3 class="training-section-title">Five-shift path</h3>
      <div class="training-roadmap" role="list">${blocks.join("")}</div>
    </section>
  `;
}

function renderServiceLoop() {
  const steps = ["Scan", "Prioritize", "Act", "Communicate", "Reset"];
  return `
    <section class="training-section training-loop-section">
      <h3 class="training-section-title">Service loop</h3>
      <p class="training-section-lead">The rhythm of the floor — keep it in your head during service.</p>
      <div class="training-loop" aria-label="Service loop">
        ${steps.map((step, i) => `
          <div class="training-loop-step">
            <span class="training-loop-num">${i + 1}</span>
            <strong>${escapeHTML(step)}</strong>
          </div>
          ${i < steps.length - 1 ? `<span class="training-loop-arrow" aria-hidden="true">→</span>` : `<span class="training-loop-arrow training-loop-reset" aria-hidden="true">↺</span>`}
        `).join("")}
      </div>
    </section>
  `;
}

function renderTrainingSkillCard(state, block, skillKey) {
  const meta = TRAINING_SKILL_META[skillKey] || {
    label: skillKey.replace(/_/g, " "),
    kind: "know"
  };
  const status = skillStatusFor(state, block.shift, skillKey, meta.kind);
  const kind = TRAINING_KIND_LABEL[meta.kind] || "Learn";
  return `
    <button type="button" class="training-skill-card status-${escapeForAttribute(status)}" onclick="openTrainingSkill('${escapeForAttribute(skillKey)}')">
      <span class="training-skill-kind">${escapeHTML(kind)}</span>
      <strong class="training-skill-label">${escapeHTML(meta.label)}</strong>
      ${renderTrainingStatusChip(status)}
    </button>
  `;
}

function renderTodayFocus(state) {
  const block = (state.curriculum || []).find((c) => c.shift === state.unlockedShift)
    || (state.curriculum || [])[0];
  if (!block) {
    return `
      <section class="training-section">
        <h3 class="training-section-title">Today’s focus</h3>
        <p class="training-empty">Your five-shift path will show here once training data loads.</p>
      </section>
    `;
  }

  const skills = block.skills || [];
  const byKind = { know: [], observe: [], demonstrate: [] };
  skills.forEach((sk) => {
    const kind = TRAINING_SKILL_META[sk]?.kind || "know";
    if (byKind[kind]) byKind[kind].push(sk);
    else byKind.know.push(sk);
  });

  const groups = [
    { key: "know", title: "Learn" },
    { key: "observe", title: "Watch + practice" },
    { key: "demonstrate", title: "Show your trainer" }
  ].filter((g) => byKind[g.key].length);

  return `
    <section class="training-section">
      <div class="training-focus-head">
        <h3 class="training-section-title">Today’s mission</h3>
        <p class="training-focus-blurb">${escapeHTML(block.focus || shiftShortTitle(block))}</p>
      </div>
      ${groups.map((g) => `
        <div class="training-skill-group">
          <h4 class="training-skill-group-title">${escapeHTML(g.title)}</h4>
          <div class="training-skill-grid">
            ${byKind[g.key].map((sk) => renderTrainingSkillCard(state, block, sk)).join("")}
          </div>
        </div>
      `).join("")}
      <h4 class="training-skill-group-title training-tools-title">Tools for this shift</h4>
      <div class="training-tools-row">
        <button type="button" class="training-tool-chip" onclick="trainingQuickLink('ontap')">On Tap</button>
        <button type="button" class="training-tool-chip" onclick="trainingQuickLink('checklists')">Checklists</button>
        <button type="button" class="training-tool-chip" onclick="trainingQuickLink('path')">Full path</button>
        <button type="button" class="training-tool-chip" onclick="trainingQuickLink('games')">War Games</button>
      </div>
    </section>
  `;
}

function renderTrainingQuickLinks() {
  const links = [
    { action: "path", label: "Training path" },
    { action: "skills", label: "Skill matrix" },
    { action: "progress", label: "My Progress" },
    { action: "feedback", label: "Feedback" },
    { action: "features", label: "App guide" }
  ];
  return `
    <section class="training-section">
      <h3 class="training-section-title">More tools</h3>
      <div class="training-quick-grid">
        ${links.map((link) => `
          <button type="button" class="training-quick" onclick="trainingQuickLink('${link.action}')">${escapeHTML(link.label)}</button>
        `).join("")}
      </div>
    </section>
  `;
}

async function renderTrainingDashboard(content) {
  if (!currentUser) {
    content.innerHTML = `
      <div class="training-page">
        <div class="auth-panel">
          <h3>Sign in to open Training</h3>
          <button class="game-next" type="button" onclick="showLoginGate()">Sign in</button>
        </div>
      </div>
    `;
    return;
  }

  content.innerHTML = `
    <div class="training-page">
      <div class="status"><strong>Loading your training…</strong></div>
    </div>
  `;

  const state = await ensureTrainingState();
  if (contentType() !== "training") return;

  const block = (state.curriculum || []).find((c) => c.shift === state.unlockedShift)
    || (state.curriculum || [])[0];
  const focusTitle = shiftShortTitle(block).toUpperCase();
  const shiftNum = block?.shift || state.unlockedShift || 1;
  const next = nextIncompleteTrainingActivity();
  const continueLabel = next
    ? (TRAINING_SKILL_META[next.skillKey]?.label || "Continue training")
    : "Review First 5 path";
  const pct = Math.max(0, Math.min(100, state.percent || 0));

  content.innerHTML = `
    <div class="training-page">
      <header class="training-hero">
        <p class="training-kicker">Shift ${shiftNum} of 5</p>
        <h2 class="training-welcome">${escapeHTML(focusTitle)}</h2>
        <p class="training-hero-intro">${escapeHTML(block?.focus || `Your shift ${shiftNum} training mission.`)}</p>
        <div class="training-method" aria-label="Training progression">
          <span>Learn</span><i>→</i><span>See</span><i>→</i><span>Try</span><i>→</i><span>Do</span><i>→</i><span>Prove</span>
        </div>
        <div class="training-progress" aria-label="Overall training progress">
          <div class="training-progress-meta">
            <strong>Progress</strong>
            <span>${pct}%</span>
          </div>
          <div class="training-progress-track">
            <div class="training-progress-fill" style="width:${pct}%"></div>
          </div>
          <p class="training-progress-note">${state.completedSkills || 0} of ${state.totalSkills || 0} path items signed off</p>
        </div>
        <div class="training-meta-grid">
          <div>
            <span class="training-meta-label">Trainer</span>
            <strong>Not assigned yet</strong>
          </div>
          <div>
            <span class="training-meta-label">Next training shift</span>
            <strong>Set with your lead</strong>
          </div>
        </div>
        ${state.error ? `<div class="auth-error" style="margin-top:12px;">${escapeHTML(state.error)}</div>` : ""}
        <button type="button" class="btn btn-primary training-continue" onclick="continueTraining()">
          Continue training
          <small>${escapeHTML(continueLabel)}</small>
        </button>
      </header>

      <div id="trainingTodayStrip"></div>
      ${renderTrainingRoadmap(state)}
      ${renderTodayFocus(state)}
      ${renderServiceLoop()}
      <section class="training-section training-before-leave">
        <h3 class="training-section-title">Before you leave</h3>
        <p>Finish today’s practice items, then ask your trainer to sign off what you can do confidently.</p>
      </section>
      ${renderTrainingQuickLinks()}
    </div>
  `;

  if (typeof renderTodayAtMpStrip === "function") {
    renderTodayAtMpStrip(document.getElementById("trainingTodayStrip"));
  }
}

if (typeof window !== "undefined") {
  window.TRAINING_SKILL_META = TRAINING_SKILL_META;
  window.isTraineeUser = isTraineeUser;
  window.defaultHomeTabForUser = defaultHomeTabForUser;
  window.resetTrainingState = resetTrainingState;
  window.ensureTrainingState = ensureTrainingState;
  window.renderTrainingDashboard = renderTrainingDashboard;
  window.continueTraining = continueTraining;
  window.openTrainingSkill = openTrainingSkill;
  window.trainingQuickLink = trainingQuickLink;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    TRAINING_SKILL_META,
    isTraineeUser,
    defaultHomeTabForUser,
    computeTrainingProgress
  };
}
