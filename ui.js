/**
 * Shared UI helpers — design system + Employee Home (Phase 2).
 * Expects from the page: escapeHTML, escapeForAttribute, activateAppTab,
 * currentUser, apiFetch, collectNewAnnouncements, getTodayWeeklySpecial,
 * openBriefingItem, contentType, StaffRoles, canSubmitShiftSurvey, isManager,
 * canViewShiftReports (via helpers on the page).
 */

function firstNameFromUser(user) {
  const name = String(user?.name || "there").trim();
  return name.split(/\s+/)[0] || "there";
}

function greetingForNow(date = new Date()) {
  const hour = date.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

/**
 * Standard page header.
 * actionsHtml: optional right-side buttons (Print, Edit, etc.)
 */
function renderPageHeader({ title, subtitle = "", eyebrow = "", actionsHtml = "", back = null } = {}) {
  const backHtml = back ? renderLogicalBackHtml(back) : "";
  return `
    <div class="page-header">
      <div class="page-header-text">
        ${backHtml}
        ${eyebrow ? `<p class="page-header-eyebrow">${escapeHTML(eyebrow)}</p>` : ""}
        <h2 class="page-header-title">${escapeHTML(title || "")}</h2>
        ${subtitle ? `<p class="page-header-sub">${escapeHTML(subtitle)}</p>` : ""}
      </div>
      ${actionsHtml ? `<div class="page-header-actions">${actionsHtml}</div>` : ""}
    </div>
  `;
}

function renderLogicalBackHtml(back) {
  if (!back) return "";
  const label = back.label || "Back";
  let action = "";
  if (back.tab) action = `activateAppTab('${String(back.tab).replace(/['"]/g, "")}')`;
  else if (back.onclick) action = back.onclick;
  if (!action) return "";
  return `<button type="button" class="page-back" onclick="${action}">← ${escapeHTML(label)}</button>`;
}

/** Per-view inline edit mode (Phase 3). Same page for staff + admins; Edit reveals controls. */
const pageEditModes = Object.create(null);

function isPageEditMode(view) {
  const key = view || (typeof contentType === "function" ? contentType() : "");
  return Boolean(pageEditModes[key]);
}

function clearOtherPageEditModes(keepView) {
  Object.keys(pageEditModes).forEach((key) => {
    if (key === keepView) return;
    if (!pageEditModes[key]) return;
    pageEditModes[key] = false;
    if (key === "merch" && typeof merchEditId !== "undefined") merchEditId = null;
    if (key === "sops" && typeof sopEditId !== "undefined") sopEditId = null;
  });
  syncPageEditBodyClass();
}

function syncPageEditBodyClass() {
  if (typeof document === "undefined") return;
  const view = typeof contentType === "function" ? contentType() : "";
  document.body.classList.toggle("is-page-editing", Boolean(view && pageEditModes[view]));
}

function setPageEditMode(view, on, { skipRender = false } = {}) {
  const key = view || (typeof contentType === "function" ? contentType() : "");
  if (!key) return;
  const next = Boolean(on);
  pageEditModes[key] = next;

  if (!next) {
    if (key === "merch" && typeof merchEditId !== "undefined") merchEditId = null;
    if (key === "sops") {
      if (typeof sopEditId !== "undefined") sopEditId = null;
      if (typeof resetSopForm === "function") {
        try { resetSopForm(); } catch (_) {}
      }
    }
  }

  syncPageEditBodyClass();
  if (!skipRender && typeof render === "function") render();
}

function togglePageEditMode(view) {
  const key = view || (typeof contentType === "function" ? contentType() : "");
  setPageEditMode(key, !isPageEditMode(key));
}

function renderEditToggleButton({ canEdit, view, editingLabel = "Done", idleLabel = "Edit" } = {}) {
  if (!canEdit) return "";
  const key = view || (typeof contentType === "function" ? contentType() : "");
  const on = isPageEditMode(key);
  return `
    <button type="button"
      class="btn btn-edit${on ? " is-active" : ""}"
      onclick="togglePageEditMode('${escapeForAttribute(key)}')"
      aria-pressed="${on ? "true" : "false"}">
      ${on ? escapeHTML(editingLabel) : `✎ ${escapeHTML(idleLabel)}`}
    </button>
  `;
}

function renderEditablePageHeader({ title, subtitle = "", canEdit = false, view, extraActionsHtml = "" } = {}) {
  const key = view || (typeof contentType === "function" ? contentType() : "");
  return renderPageHeader({
    title,
    subtitle,
    actionsHtml: `${extraActionsHtml || ""}${renderEditToggleButton({ canEdit, view: key })}`
  });
}

function renderPageEditBanner(message) {
  if (!message) return "";
  return `<div class="page-edit-banner" role="status">${escapeHTML(message)}</div>`;
}

function renderAppState({ kind = "empty", title = "", detail = "" } = {}) {
  const extra = detail ? `<p class="app-state-detail">${escapeHTML(detail)}</p>` : "";
  return `<div class="app-state is-${escapeHTML(kind)}" role="status"><p class="app-state-title">${escapeHTML(title)}</p>${extra}</div>`;
}

function renderFormActions({ saveLabel = "Save", saveOnclick = "", cancelOnclick = "", extraHtml = "" } = {}) {
  return `
    <div class="merch-admin-actions edit-form-actions">
      ${saveOnclick ? `<button type="button" class="btn btn-primary" onclick="${saveOnclick}">${escapeHTML(saveLabel)}</button>` : ""}
      ${cancelOnclick ? `<button type="button" class="btn btn-secondary" onclick="${cancelOnclick}">Cancel</button>` : ""}
      ${extraHtml}
    </div>
  `;
}

function resetPageEditModes() {
  Object.keys(pageEditModes).forEach((key) => {
    delete pageEditModes[key];
  });
  syncPageEditBodyClass();
}

/** Cached Home / Today-at-MP payloads for this session. */
const homeBriefingCache = {
  loaded: false,
  loading: false,
  error: "",
  huddle: null,
  digest: null,
  checklists: null,
  viewedKeys: new Set(),
  announcements: [],
  events: []
};

function resetHomeBriefingCache() {
  homeBriefingCache.loaded = false;
  homeBriefingCache.loading = false;
  homeBriefingCache.error = "";
  homeBriefingCache.huddle = null;
  homeBriefingCache.digest = null;
  homeBriefingCache.checklists = null;
  homeBriefingCache.viewedKeys = new Set();
  homeBriefingCache.announcements = [];
  homeBriefingCache.events = [];
  homeBriefingCache.weeklyBoard = null;
  quickAccessEditing = false;
}

function eventIsTodayOnHome(event, now = new Date()) {
  if (!event?.startsAt) return false;
  const start = new Date(event.startsAt);
  if (Number.isNaN(start.getTime())) return false;
  const end = event.endsAt ? new Date(event.endsAt) : new Date(start.getTime() + 4 * 60 * 60 * 1000);
  if (Number.isNaN(end.getTime())) return false;
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return start < dayEnd && end >= dayStart;
}

function isWeeklySpecialPlaceholder(special) {
  if (!special) return false;
  const name = String(special.name || "");
  return /^This Week'?s\b/i.test(name) || /Market price/i.test(String(special.price || ""));
}

function collectHomeAnnouncements() {
  if (typeof collectNewAnnouncements === "function") {
    return collectNewAnnouncements();
  }
  return [];
}

async function ensureHomeBriefingData({ force = false } = {}) {
  if (!currentUser) {
    resetHomeBriefingCache();
    return homeBriefingCache;
  }
  if (homeBriefingCache.loaded && !force) return homeBriefingCache;
  if (homeBriefingCache.loading) return homeBriefingCache;

  homeBriefingCache.loading = true;
  homeBriefingCache.error = "";
  homeBriefingCache.announcements = collectHomeAnnouncements();

  const tasks = [
    apiFetch("/api/huddle").catch((err) => {
      console.warn("Home huddle unavailable:", err.message);
      return null;
    }),
    apiFetch("/api/announcements/state").catch((err) => {
      console.warn("Home announcements unavailable:", err.message);
      return { viewedKeys: [] };
    }),
    apiFetch("/api/events").catch((err) => {
      console.warn("Home events unavailable:", err.message);
      return { events: [] };
    })
  ];

  const wantsLead = Boolean(
    currentUser.permissions?.viewShiftReports || currentUser.on_shift_lead_duty
  );
  const wantsManager = Boolean(currentUser.permissions?.manageTeam);

  if (wantsLead) {
    tasks.push(
      apiFetch("/api/checklists").catch(() => null)
    );
  } else {
    tasks.push(Promise.resolve(null));
  }

  if (wantsManager) {
    tasks.push(
      apiFetch("/api/manager/morning-digest").catch(() => null)
    );
  } else {
    tasks.push(Promise.resolve(null));
  }

  try {
    const [huddle, announceState, eventsPayload, checklists, digest] = await Promise.all(tasks);
    homeBriefingCache.huddle = huddle;
    homeBriefingCache.checklists = checklists;
    homeBriefingCache.digest = digest;
    homeBriefingCache.events = eventsPayload?.events || [];
    homeBriefingCache.viewedKeys = new Set(announceState?.viewedKeys || []);
    if (typeof ensureWeeklySpecials === "function") {
      await ensureWeeklySpecials().catch(() => {});
      homeBriefingCache.weeklyBoard = typeof weeklyBoard !== "undefined" ? { ...weeklyBoard } : null;
      homeBriefingCache.announcements = collectHomeAnnouncements();
    } else {
      homeBriefingCache.weeklyBoard = null;
    }
    homeBriefingCache.loaded = true;
  } catch (err) {
    homeBriefingCache.error = err.message || "Could not load today’s briefing.";
  } finally {
    homeBriefingCache.loading = false;
  }

  return homeBriefingCache;
}

function buildTodayAtMpCards(cache = homeBriefingCache) {
  const cards = [];
  const sections = cache.huddle?.sections || {};
  const weekly = typeof getTodayWeeklySpecial === "function" ? getTodayWeeklySpecial() : null;

  if (weekly && (typeof isLiveSpecial !== "function" || isLiveSpecial(weekly)) && !isWeeklySpecialPlaceholder(weekly)) {
    cards.push({
      id: "special",
      kicker: "Special",
      title: weekly.name,
      detail: [weekly.dayLabel, weekly.meal, weekly.price].filter(Boolean).join(" · "),
      action: () => typeof openWeeklySpecialTraining === "function" && openWeeklySpecialTraining(weekly.id),
      actionAttr: `onclick="typeof openWeeklySpecialTraining==='function'&&openWeeklySpecialTraining('${escapeForAttribute(weekly.id)}')"`
    });
  }

  const todayEvents = (cache.events || []).filter((event) => event.published && eventIsTodayOnHome(event));
  if (todayEvents.length) {
    const first = todayEvents[0];
    cards.push({
      id: "event-today",
      kicker: "Event today",
      title: first.title,
      detail: [
        first.location,
        first.guestCount ? `${first.guestCount} guests` : "",
        first.taproomImpact,
        todayEvents.length > 1 ? `+${todayEvents.length - 1} more` : ""
      ].filter(Boolean).join(" · ") || "On the books today",
      actionAttr: `onclick="activateAppTab('events')"`
    });
  }

  const eightySix = (sections.eightySix || []).filter((row) => row.status === "86" || row.status === "out");
  if (eightySix.length) {
    const names = eightySix.slice(0, 4).map((row) => row.item_name).filter(Boolean);
    cards.push({
      id: "86",
      kicker: "86'd",
      title: names.join(", "),
      detail: eightySix.length > 4 ? `+${eightySix.length - 4} more on the board` : "Check Shift Tools for the full board",
      actionAttr: `onclick="activateAppTab('floor')"`
    });
  }

  const newTaps = (cache.announcements || []).filter((a) => a.type === "beer");
  if (newTaps.length) {
    cards.push({
      id: "taps",
      kicker: "Tap changes",
      title: newTaps.length === 1
        ? `${newTaps[0].title} is new on tap`
        : `${newTaps.length} new taps to know`,
      detail: newTaps.slice(0, 3).map((t) => t.title).join(" · "),
      actionAttr: `onclick="activateAppTab('ontap')"`
    });
  }

  const sell = sections.sellThis;
  if (sell?.item_name) {
    cards.push({
      id: "sell",
      kicker: "Sell this",
      title: sell.item_name,
      detail: sell.talking_points || "Featured push for today’s floor",
      actionAttr: `onclick="floorSection='sell'; activateAppTab('floor')"`
    });
  }

  const handoffs = sections.handoffs || [];
  if (handoffs.length) {
    cards.push({
      id: "note",
      kicker: "Shift note",
      title: handoffs[0].note,
      detail: handoffs.length > 1 ? `${handoffs.length - 1} more active handoff note${handoffs.length > 2 ? "s" : ""}` : "From today’s handoff board",
      actionAttr: `onclick="activateAppTab('floor')"`
    });
  }

  const shout = (sections.shoutouts || [])[0];
  if (shout?.message) {
    cards.push({
      id: "shout",
      kicker: "Shout-out",
      title: shout.to_name ? `${shout.to_name}` : "Team shout-out",
      detail: shout.message,
      actionAttr: `onclick="activateAppTab('floor')"`
    });
  }

  return cards;
}

function buildAwayItems(cache = homeBriefingCache) {
  return (cache.announcements || []).filter((item) => !cache.viewedKeys.has(item.key));
}

function buildRoleAwareCards(cache = homeBriefingCache) {
  const cards = [];
  if (!currentUser) return cards;

  const isLead = Boolean(
    currentUser.permissions?.viewShiftReports || currentUser.on_shift_lead_duty
  );
  const isMgr = Boolean(currentUser.permissions?.manageTeam);

  if (isLead && cache.checklists?.checklists?.length) {
    const lists = cache.checklists.checklists;
    const opening = lists.find((l) => l.id === "opening") || lists[0];
    if (opening) {
      const total = opening.taskCount || (opening.tasks || []).length || 0;
      const done = opening.completedCount || 0;
      if (total > 0 && done < total) {
        cards.push({
          id: "checklist-status",
          kicker: "Checklist",
          title: `${opening.name || opening.title || "Today’s checklist"} — ${done}/${total}`,
          detail: "Opening / shift list still has open tasks",
          actionAttr: `onclick="activateAppTab('checklists')"`
        });
      }
    }
  }

  if (currentUser.permissions?.manageWeeklySpecials || isMgr) {
    if (cache.weeklyBoard?.needsReview) {
      cards.push({
        id: "food-special-review",
        kicker: "Friday update",
        title: "Weekly food specials need an update",
        detail: "Set the weekend and next-week details for staff",
        actionAttr: `onclick="foodCategory='weekly'; activateAppTab('food')"`
      });
      cards.push({
        id: "coffee-special-review",
        kicker: "Friday update",
        title: "Coffee seasonals need an update",
        detail: "Confirm the latte and matcha before the weekend",
        actionAttr: `onclick="coffeeSection='seasonal'; drinksSection='coffee'; activateAppTab('drinks')"`
      });
    } else {
      const weekly = typeof getTodayWeeklySpecial === "function" ? getTodayWeeklySpecial() : null;
      if (weekly && isWeeklySpecialPlaceholder(weekly)) {
        cards.push({
          id: "special-stale",
          kicker: "Needs update",
          title: `${weekly.dayLabel} special still has placeholder copy`,
          detail: "Update this week’s dish before service",
          actionAttr: `onclick="foodCategory='weekly'; activateAppTab('food')"`
        });
      }
    }
  }

  if (isMgr) {
    const digest = cache.digest;
    if (digest) {
      if (digest.openFeedback > 0) {
        cards.push({
          id: "feedback-open",
          kicker: "Feedback",
          title: `${digest.openFeedback} open feedback item${digest.openFeedback === 1 ? "" : "s"}`,
          detail: "Needs review or triage",
          actionAttr: `onclick="activateAppTab('features')"`
        });
      }
      if (digest.openMaintenance > 0) {
        cards.push({
          id: "maint",
          kicker: "Maintenance",
          title: `${digest.openMaintenance} open ticket${digest.openMaintenance === 1 ? "" : "s"}`,
          detail: "Ops follow-up on Shift Tools",
          actionAttr: `onclick="activateAppTab('floor')"`
        });
      }
      const gap = (digest.trainingGaps || [])[0];
      if (gap?.activity_type && gap.weak > 0) {
        cards.push({
          id: "training-gap",
          kicker: "Training follow-up",
          title: `${gap.activity_type} looks weak this week`,
          detail: `${gap.weak} weak attempt${gap.weak === 1 ? "" : "s"} — consider a huddle focus`,
          actionAttr: `onclick="activateAppTab('team')"`
        });
      }
    }
  }

  return cards;
}

function homeCardPriority(card) {
  const text = `${card?.kicker || ""} ${card?.title || ""}`.toLowerCase();
  if (/86|out of stock|emergency|urgent/.test(text)) return 100;
  if (/event|shift note|special|new on tap|tap change/.test(text)) return 70;
  return 30;
}

function renderTodayCardsHtml(cards, { compact = false, roleActions = false } = {}) {
  if (!cards.length) {
    return `<p class="home-empty">You're caught up.</p>`;
  }
  const ordered = compact
    ? cards
    : [...cards].sort((a, b) => homeCardPriority(b) - homeCardPriority(a));
  return `
    <div class="today-cards${compact ? " today-cards-compact" : ""}${roleActions ? " role-action-list" : ""}">
      ${ordered.map((card, index) => `
        <button type="button" class="today-card${!compact && !roleActions && index === 0 ? " is-featured" : ""}" ${card.actionAttr || ""}>
          <span class="today-card-kicker">${escapeHTML(card.kicker)}</span>
          <span class="today-card-title">${escapeHTML(card.title)}</span>
          ${card.detail ? `<span class="today-card-detail">${escapeHTML(card.detail)}</span>` : ""}
          ${roleActions ? `<span class="role-action-arrow" aria-hidden="true">→</span>` : ""}
        </button>
      `).join("")}
    </div>
  `;
}

function formatHomeWhen(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function sinceLastShiftCopy(shift) {
  const last = shift?.lastShift;
  if (last?.endAt) {
    const when = formatHomeWhen(last.endAt);
    const role = [last.roleName, last.stationName].filter(Boolean).join(" · ");
    return {
      title: "Since last shift",
      lead: when
        ? `Since you clocked out ${when}${role ? ` · ${role}` : ""}`
        : "Changes since your last 7shifts block ended."
    };
  }
  return {
    title: "Since last shift",
    lead: "7shifts last clock-out isn’t linked yet — these are unread since you last reviewed."
  };
}

function awayItemTone(item) {
  const blob = `${item?.label || ""} ${item?.title || ""} ${item?.type || ""}`.toLowerCase();
  if (/86|allergen|urgent|emergency|out of stock/.test(blob)) return "important";
  if (/new on tap|new tap|seasonal|special/.test(blob) || item?.type === "beer" || item?.type === "weekly") return "new";
  return "";
}

function requiresHomeAck(item) {
  return awayItemTone(item) === "important";
}

function renderAwaySectionHtml(items) {
  if (!items.length) return "";
  const shift = typeof getShiftContext === "function" ? getShiftContext() : currentUser?.shift;
  const copy = sinceLastShiftCopy(shift);
  const dismissible = items.filter((item) => !requiresHomeAck(item));
  return `
    <section class="home-section">
      <h3 class="home-section-title">${escapeHTML(copy.title)}</h3>
      <p class="home-section-lead">${escapeHTML(copy.lead)}</p>
      <div class="away-list">
        ${items.map((item) => {
          const tone = awayItemTone(item);
          return `
          <div class="away-item${tone ? ` is-${tone}` : ""}" data-key="${escapeForAttribute(item.key)}">
            <button type="button" class="away-item-main" onclick="openHomeAnnouncement('${escapeForAttribute(item.key)}')">
              <span class="away-item-kicker">${escapeHTML(tone === "important" ? "Important" : tone === "new" ? "New" : (item.label || "Update"))}</span>
              <span class="away-item-title">${escapeHTML(item.title)}</span>
              <span class="away-item-summary">${escapeHTML(item.summary || "")}</span>
            </button>
            ${tone === "important" ? `<button type="button" class="btn btn-sm btn-subtle away-item-ack" onclick="markHomeAnnouncementRead('${escapeForAttribute(item.key)}')">Acknowledge</button>` : ""}
          </div>`;
        }).join("")}
      </div>
      ${dismissible.length ? `
        <button type="button" class="btn btn-secondary btn-sm" style="margin-top:12px;" onclick="markAllHomeAnnouncementsRead()">I'm caught up</button>
      ` : `<p class="home-section-lead">Important items stay until you Acknowledge each one.</p>`}
    </section>
  `;
}

const QUICK_ACCESS_CATALOG = [
  { type: "ontap", label: "On Tap", icon: "tap" },
  { type: "food", label: "Food", icon: "food" },
  { type: "drinks", label: "Drinks", icon: "drink" },
  { type: "checklists", label: "Checklists", icon: "check" },
  { type: "floor", label: "Shift Tools", icon: "floor" },
  { type: "askmp", label: "Ask MP", icon: "ask" },
  { type: "search", label: "Search Launch Pad", icon: "search" },
  { type: "games", label: "War Games", icon: "games" },
  { type: "training", label: "Training", icon: "train" },
  { type: "sops", label: "SOPs", icon: "sop" },
  { type: "today-floor", label: "Today’s Floor", icon: "event" },
  { type: "events", label: "Events", icon: "event" },
  { type: "team", label: "Team", icon: "train" },
  { type: "safety", label: "Safety", icon: "safety" },
  { type: "merch", label: "Merch", icon: "merch" },
  { type: "shift-survey", label: "End of Shift", icon: "shift" }
];

const QUICK_ACCESS_DEFAULTS = ["ontap", "food", "checklists", "floor", "askmp", "shift-survey"];
let quickAccessEditing = false;

function quickAccessStorageKey() {
  return `mp-quick-access:${currentUser?.id || "guest"}`;
}

function loadQuickAccessPins() {
  try {
    const raw = JSON.parse(localStorage.getItem(quickAccessStorageKey()) || "null");
    if (Array.isArray(raw) && raw.length) {
      return raw.filter((type) => QUICK_ACCESS_CATALOG.some((item) => item.type === type)).slice(0, 8);
    }
  } catch (_) {}
  return QUICK_ACCESS_DEFAULTS.slice();
}

function isQuickAccessPinned(type) {
  return loadQuickAccessPins().includes(type);
}

function saveQuickAccessPins(pins) {
  try {
    localStorage.setItem(quickAccessStorageKey(), JSON.stringify(pins.slice(0, 8)));
  } catch (_) {}
}

function toggleQuickAccessPin(type) {
  if (!QUICK_ACCESS_CATALOG.some((item) => item.type === type)) return;
  const pins = loadQuickAccessPins();
  const at = pins.indexOf(type);
  if (at >= 0) pins.splice(at, 1);
  else if (pins.length < 8) pins.push(type);
  saveQuickAccessPins(pins);
  if (typeof refreshHomeIfVisible === "function") refreshHomeIfVisible();
  if (typeof contentType === "function" && contentType() === "search" && typeof render === "function") render();
}

function toggleQuickAccessEditing() {
  quickAccessEditing = !quickAccessEditing;
  if (typeof refreshHomeIfVisible === "function") refreshHomeIfVisible();
}

function moveQuickAccessPin(type, delta) {
  const pins = loadQuickAccessPins();
  const at = pins.indexOf(type);
  const next = at + Number(delta);
  if (at < 0 || next < 0 || next >= pins.length) return;
  const [row] = pins.splice(at, 1);
  pins.splice(next, 0, row);
  saveQuickAccessPins(pins);
  if (typeof refreshHomeIfVisible === "function") refreshHomeIfVisible();
}

function quickAccessIcon(name) {
  const icons = {
    tap: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 4h8M12 4v5m-4 0h8v4H8zM6 13h12v7H6z"/></svg>`,
    food: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4v7m3-7v7M5 8h3m-1 3v9m7-16v16m0-16c3 2 4 5 4 8h-4"/></svg>`,
    drink: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10l-1 7H8zM8 11h8v7H8z"/></svg>`,
    check: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v15H5zM8 3h8v4H8zM8 12l2 2 5-5"/></svg>`,
    floor: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 18h16M6 18v-7h12v7M9 11V7h6v4"/></svg>`,
    ask: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 5h14v11H9l-4 4zM9 9h6M9 12h4"/></svg>`,
    search: `<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="11" cy="11" r="6"/><path d="m16 16 4 4"/></svg>`,
    games: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10h16v8H4zM8 14h2m4 0h2M9 6h6"/></svg>`,
    train: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 4h12v14H6zM9 20h6M8 8h8M8 12h6"/></svg>`,
    sop: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4h10v16H7zM10 8h4M10 12h4"/></svg>`,
    event: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 6h14v14H5zM5 10h14M9 4v4M15 4v4"/></svg>`,
    safety: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 3 20 7v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7z"/></svg>`,
    merch: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 8h12l-1 12H7zM9 8V6h6v2"/></svg>`,
    shift: `<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14v16H5zM8 9h8M8 13h8M8 17h5"/></svg>`
  };
  return icons[name] || "";
}

function renderQuickAccessHtml() {
  const pins = loadQuickAccessPins();
  const links = pins
    .map((type) => QUICK_ACCESS_CATALOG.find((item) => item.type === type))
    .filter(Boolean)
    .filter((link) => link.type !== "shift-survey" || (typeof canSubmitShiftSurvey === "function" ? canSubmitShiftSurvey() : Boolean(currentUser)));
  const editing = quickAccessEditing;
  return `
    <section class="home-section">
      <div class="quick-access-head">
        <h3 class="home-section-title">Quick access</h3>
        <button type="button" class="btn btn-subtle btn-sm" onclick="toggleQuickAccessEditing()">${editing ? "Done" : "Edit shortcuts"}</button>
      </div>
      ${editing ? `<p class="home-section-lead">Remove or reorder. Pins stay on this device. Add more from Search Launch Pad.</p>` : ""}
      ${links.length ? `
      <div class="quick-access-grid${editing ? " is-editing" : ""}">
        ${links.map((link, index) => `
          <div class="quick-access-item">
            <button type="button" class="quick-access-card" onclick="${editing ? "return false;" : `activateAppTab('${link.type}')`}">
              <span class="quick-access-icon">${quickAccessIcon(link.icon)}</span>
              <span class="quick-access-label">${escapeHTML(link.label)}</span>
            </button>
            ${editing ? `
              <div class="quick-access-tools">
                <button type="button" class="btn btn-subtle btn-sm" ${index === 0 ? "disabled" : ""} onclick="moveQuickAccessPin('${link.type}', -1)" aria-label="Move ${escapeHTML(link.label)} up">Up</button>
                <button type="button" class="btn btn-subtle btn-sm" ${index === links.length - 1 ? "disabled" : ""} onclick="moveQuickAccessPin('${link.type}', 1)" aria-label="Move ${escapeHTML(link.label)} down">Down</button>
                <button type="button" class="btn btn-subtle btn-sm" onclick="toggleQuickAccessPin('${link.type}')" aria-label="Remove ${escapeHTML(link.label)}">Remove</button>
              </div>` : ""}
          </div>
        `).join("")}
      </div>` : `<p class="home-empty">No shortcuts. Pin destinations from Search Launch Pad.</p>`}
    </section>
  `;
}

/** Compact TODAY AT MP block for Training (and other embeds). */
function renderTodayAtMpStripHtml(cache = homeBriefingCache, { compact = true } = {}) {
  const cards = buildTodayAtMpCards(cache);
  if (!cards.length && !cache.error) {
    return `
      <section class="today-strip">
        <h3 class="home-section-title">Today at MP</h3>
        <p class="home-empty">Board looks quiet — check Shift Tools if anything changes mid-shift.</p>
      </section>
    `;
  }
  return `
    <section class="today-strip">
      <div class="today-strip-head">
        <h3 class="home-section-title">Today at MP</h3>
        <button type="button" class="btn btn-sm btn-subtle" onclick="activateAppTab('home')">Open Home</button>
      </div>
      ${cache.error ? `<p class="auth-error">${escapeHTML(cache.error)}</p>` : ""}
      ${renderTodayCardsHtml(cards, { compact })}
    </section>
  `;
}

async function renderTodayAtMpStrip(mountEl) {
  if (!mountEl) return;
  if (!currentUser) {
    mountEl.innerHTML = "";
    return;
  }
  mountEl.innerHTML = `<section class="today-strip"><p class="desc">Loading today’s floor notes…</p></section>`;
  const cache = await ensureHomeBriefingData();
  if (typeof contentType === "function" && contentType() !== "training" && !mountEl.closest(".home-page")) {
    // Still allow if explicitly mounted
  }
  mountEl.innerHTML = renderTodayAtMpStripHtml(cache, { compact: true });
}

async function openHomeAnnouncement(itemKey) {
  const item = (homeBriefingCache.announcements || []).find((entry) => entry.key === itemKey);
  if (!item) return;
  if (typeof currentBriefingItems !== "undefined") {
    currentBriefingItems = homeBriefingCache.announcements.slice();
  }
  if (typeof briefingViewedKeys !== "undefined") {
    briefingViewedKeys = homeBriefingCache.viewedKeys;
  }
  const mustAck = requiresHomeAck(item);
  if (typeof openBriefingItem === "function") {
    await openBriefingItem(itemKey, { markViewed: !mustAck });
    if (!mustAck) homeBriefingCache.viewedKeys.add(itemKey);
    refreshHomeIfVisible();
  }
}

async function markHomeAnnouncementRead(itemKey) {
  if (!itemKey || !currentUser) return;
  homeBriefingCache.viewedKeys.add(itemKey);
  try {
    await apiFetch("/api/announcements/view", {
      method: "POST",
      body: JSON.stringify({ itemKey })
    });
  } catch (err) {
    console.warn("Could not mark announcement read:", err.message);
  }
  refreshHomeIfVisible();
}

async function markAllHomeAnnouncementsRead() {
  const items = buildAwayItems().filter((item) => !requiresHomeAck(item));
  await Promise.all(items.map((item) => markHomeAnnouncementRead(item.key)));
}

function refreshHomeIfVisible() {
  const content = document.getElementById("content");
  if (!content) return;
  if (typeof contentType === "function" && contentType() === "home") {
    renderHomeShell(content, { skipFetch: true });
    return;
  }
  const strip = document.getElementById("trainingTodayStrip");
  if (strip && typeof contentType === "function" && contentType() === "training") {
    strip.innerHTML = renderTodayAtMpStripHtml(homeBriefingCache, { compact: true });
  }
}

function renderHomeShiftHtml() {
  if (!currentUser) return "";
  const shift = typeof getShiftContext === "function" ? getShiftContext() : currentUser.shift;
  const desc = typeof describeShiftStatus === "function"
    ? describeShiftStatus(shift)
    : null;
  if (!desc?.visible) return "";
  const last = shift?.lastShift;
  const lastLine = !shift?.onShift && last?.endAt
    ? `Last out ${formatHomeWhen(last.endAt)}`
    : "";
  return `
    <button type="button" class="home-shift" data-state="${escapeForAttribute(desc.state)}" onclick="activateAppTab('today-floor')">
      <span class="home-shift-kicker">Your shift</span>
      <span class="home-shift-copy">
        <span class="home-shift-label">${escapeHTML(desc.label)}</span>
        <span class="home-shift-detail">${escapeHTML([desc.detail, lastLine].filter(Boolean).join(" · "))}</span>
      </span>
      <span class="home-shift-action">Today’s Floor</span>
    </button>
  `;
}

/**
 * Employee Home — daily briefing dashboard.
 */
async function renderHomeShell(content, { skipFetch = false } = {}) {
  if (!content) return;

  if (!currentUser) {
    content.innerHTML = `
      <div class="home-page">
        ${renderPageHeader({
          title: "Welcome to Launch Pad",
          subtitle: "Sign in to see what’s on for your shift."
        })}
        <div class="auth-panel">
          <button class="game-next" type="button" onclick="showLoginGate()">Sign in</button>
        </div>
      </div>
    `;
    return;
  }

  const name = firstNameFromUser(currentUser);
  const greet = greetingForNow();

  if (!skipFetch && !homeBriefingCache.loaded) {
    content.innerHTML = `
      <div class="home-page">
        ${renderPageHeader({
          title: `${greet}, ${name}`,
          subtitle: "Loading today’s briefing…"
        })}
        <div class="status"><strong>Gathering specials, 86s, and shift notes…</strong></div>
      </div>
    `;
  }

  if (!skipFetch) {
    await ensureHomeBriefingData({ force: true });
  }

  if (typeof contentType === "function" && contentType() !== "home") return;

  const todayCards = buildTodayAtMpCards();
  const roleCards = buildRoleAwareCards();
  const awayItems = buildAwayItems();
  const dateLabel = new Intl.DateTimeFormat("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric"
  }).format(new Date());
  const hour = new Date().getHours();
  const serviceLabel = hour < 11 ? "Opening" : hour < 16 ? "Lunch service" : hour < 22 ? "Evening service" : "Close";

  if (!skipFetch && typeof refreshShiftContext === "function") {
    try { await refreshShiftContext(); } catch (_) {}
    if (typeof contentType === "function" && contentType() !== "home") return;
  }

  content.innerHTML = `
    <div class="home-page">
      ${renderPageHeader({
        title: `${greet}, ${name}`,
        subtitle: "Here’s what you need to know for your shift today.",
        eyebrow: `${dateLabel} · ${serviceLabel}`
      })}
      ${renderHomeShiftHtml()}

      <section class="home-section home-primary-section">
        <h3 class="home-section-title">Today at MP</h3>
        ${homeBriefingCache.error ? `<p class="auth-error">${escapeHTML(homeBriefingCache.error)}</p>` : ""}
        ${renderTodayCardsHtml(todayCards)}
      </section>

      ${roleCards.length ? `
        <section class="home-section home-role-section">
          <h3 class="home-section-title">For you</h3>
          ${renderTodayCardsHtml(roleCards, { roleActions: true })}
        </section>
      ` : ""}

      ${renderAwaySectionHtml(awayItems)}
      ${renderQuickAccessHtml()}
    </div>
  `;
}

if (typeof window !== "undefined") {
  window.renderPageHeader = renderPageHeader;
  window.renderHomeShell = renderHomeShell;
  window.renderTodayAtMpStrip = renderTodayAtMpStrip;
  window.renderTodayAtMpStripHtml = renderTodayAtMpStripHtml;
  window.ensureHomeBriefingData = ensureHomeBriefingData;
  window.resetHomeBriefingCache = resetHomeBriefingCache;
  window.openHomeAnnouncement = openHomeAnnouncement;
  window.markHomeAnnouncementRead = markHomeAnnouncementRead;
  window.markAllHomeAnnouncementsRead = markAllHomeAnnouncementsRead;
  window.greetingForNow = greetingForNow;
  window.firstNameFromUser = firstNameFromUser;
  window.isPageEditMode = isPageEditMode;
  window.setPageEditMode = setPageEditMode;
  window.togglePageEditMode = togglePageEditMode;
  window.clearOtherPageEditModes = clearOtherPageEditModes;
  window.syncPageEditBodyClass = syncPageEditBodyClass;
  window.renderEditToggleButton = renderEditToggleButton;
  window.renderEditablePageHeader = renderEditablePageHeader;
  window.renderPageEditBanner = renderPageEditBanner;
  window.renderAppState = renderAppState;
  window.renderFormActions = renderFormActions;
  window.resetPageEditModes = resetPageEditModes;
  window.toggleQuickAccessPin = toggleQuickAccessPin;
  window.toggleQuickAccessEditing = toggleQuickAccessEditing;
  window.moveQuickAccessPin = moveQuickAccessPin;
  window.isQuickAccessPinned = isQuickAccessPinned;
  window.loadQuickAccessPins = loadQuickAccessPins;
  window.requiresHomeAck = requiresHomeAck;
  window.sinceLastShiftCopy = sinceLastShiftCopy;
  window.awayItemTone = awayItemTone;
}
