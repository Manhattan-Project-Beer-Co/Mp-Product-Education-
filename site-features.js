/**
 * FEATURES TAB — single source of truth for what this site can do.
 */

const SITE_FEATURES = {
  tabLabel: "App guide",
  updatedAt: "2026-09-07",
  recentUpdates: [
    { date: "2026-09-07", text: "Specials update — current weekly food features, organized coffee flavorings, editable latte + matcha seasonals, and Friday shift-lead reminders" },
    { date: "2026-09-07", text: "Dark redesign — four-level charcoal system, Taproom Amber priority states, compact Home briefing, and streamlined accordion navigation" },
    { date: "2026-09-07", text: "Ask MP — fast search across the live beer list, food menu, coffee guide, SOPs, recipes, and training" },
    { date: "2026-09-07", text: "Quiz review — completed rounds show missed questions, your answers, and correct answers; redundant card instructions removed" },
    { date: "2026-09-04", text: "UX Phase 7 — mobile nav drawer (same grouped menu as desktop), page title bar, touch targets, modal fit" },
    { date: "2026-09-04", text: "UX Phase 6 — Training dashboard visual redesign (roadmap, status cards, service loop)" },
    { date: "2026-09-04", text: "UX Phase 5 — On Tap table/cards + Print draft menu / bar tap sheet from the live list" },
    { date: "2026-09-04", text: "UX Phase 4 — editable Weekly Specials + This Week at MP board" },
    { date: "2026-09-04", text: "UX Phase 3 — same-page ✎ Edit mode for On Tap, Merch, and SOPs (staff view by default)" },
    { date: "2026-09-04", text: "UX Phase 2 — Employee Home daily briefing (Today at MP, While you were away, role cards) + trainee Today strip" },
    { date: "2026-09-04", text: "UX Phase 1 — grouped sidebar (Home, Service, Ops, Training, Team, Tools) + shared page headers / buttons" },
    { date: "2026-09-04", text: "Training tab — trainee home dashboard with deep-links into Service, Ops, War Games, and Progress" },
    { date: "2026-08-11", text: "Photo standards gallery, checklist before/after photos, shout-outs, team challenges, secret streaks" },
    { date: "2026-08-11", text: "Tap Change + New Menu Package generators; weekly training pack + deeper Team analytics" }
  ],
  roles: [
    { name: "Admin", blurb: "Full access — emails, SOPs, Team, merch, inventory, feedback" },
    { name: "Manager", blurb: "Team, shift scheduling, reports, digest, feedback triage, Sell This Today" },
    { name: "Merch", blurb: "Edit merch stock & ideas; can be scheduled as shift lead" },
    { name: "Inventory admin", blurb: "Update ops inventory counts and orders" },
    { name: "Shift lead", blurb: "Shift reports & digest when scheduled on duty" },
    { name: "Event lead", blurb: "Menus + training for private events" },
    { name: "Bartender", blurb: "Training, briefing, Floor Tools, End of Shift, Feedback" },
    { name: "Trainee", blurb: "Lands on Training after login — five-shift path + same floor tools while learning" }
  ],
  feedbackTabOptions: [
    "Home", "Service · On Tap", "Service · All Beers", "Service · Food", "Service · Coffee", "Service · Wine + Cocktails", "Service · Merch", "Service · Floor Tools",
    "Ops · Checklists", "Ops · SOPs", "Ops · End of Shift",
    "Training", "My Progress", "Team", "Shift Reports", "Feedback",
    "Tools · Ask MP", "Tools · Inventory", "Tools · Reviews", "Tools · War Games", "Tools · App guide",
    "General / not sure"
  ],
  sections: [
    { id: "home", title: "Home", summary: "Daily dashboard: Today at MP (specials, 86s, tap changes, shift notes), While you were away, role cards, and quick access. Mobile uses the same grouped menu drawer as desktop." },
    { id: "askmp", title: "Ask MP", summary: "Fast operational search across current beer, food, coffee, SOP, recipe, and training content (Tools group)." },
    { id: "training", title: "Training", summary: "Trainee dashboard with five-shift roadmap, status-coded skill cards, service loop, Continue Training, and deep-links into Launch Pad (no duplicated menus)." },
    { id: "ontap", title: "On Tap & All Beers", summary: "Live tap list as a scannable table (mobile cards). Print guest draft menu or bar tap sheet from the same data. Editors set pour size + print category; tap changes still go to Nucleus." },
    { id: "food", title: "Food", summary: "Breakfast, brunch, lunch, dinner, weekly specials, allergens (Service group). Shift leads/managers edit Weekly Specials + This Week at MP notes inline, with a Friday reminder." },
    { id: "coffee", title: "Coffee", summary: "Menu, organized flavorings, Viewfinder beans, editable seasonal latte and matcha features, and training manual (Service group)." },
    { id: "bar", title: "Wine + Cocktails", summary: "Wine, house cocktails, and NA drinks (Service group)." },
    { id: "merch", title: "Merch", summary: "In-stock counts, Up & Coming votes, Shopify link (Tools group)." },
    { id: "inventory", title: "Inventory", summary: "Ops counts, weekly order, dashboard (Tools group)." },
    { id: "floortools", title: "Floor Tools", summary: "86 board, handoff, huddle, Sell This, photo standards, shout-outs, team challenges, tap change + menu packages, recommenders, allergy, maintenance, First 5, skills, secrets/streaks (Service group)." },
    { id: "sops", title: "SOPs", summary: "Procedures, Recipes, Emergency, photo standards gallery (Ops group)." },
    { id: "checklists", title: "Checklists", summary: "Opening/closing/cut/events/detail lists with streaks (Ops group)." },
    { id: "launchpad", title: "War Games", summary: "Arcade drills, Staff Favorites, Guest Scenarios, Complaint Recovery, leaderboard, badges, and missed-answer review (Tools group)." },
    { id: "progress", title: "My Progress", summary: "Scores, tasting journal, achievements (Training group)." },
    { id: "shift", title: "End of Shift / Reports", summary: "Anonymous surveys (Ops) + digests for leads (Team · Shift Reports)." },
    { id: "team", title: "Team", summary: "Morning digest, AI weekly training pack, deep analytics, shift lead duty (Team group)." },
    { id: "briefing", title: "Daily briefing", summary: "Lives on Home (and Today at MP on Training). Pulls specials, 86s, handoffs, Sell This, unread announcements; shift leads see Friday food and coffee specials reminders." },
    { id: "feedback", title: "Feedback", summary: "Ideas/bugs with Submitted → Reviewing → Planned → Built pipeline (Team group)." }
  ]
};

function buildSiteOverviewText() {
  const bullets = SITE_FEATURES.sections.map(section => `- ${section.title}: ${section.summary}`);
  const roles = (SITE_FEATURES.roles || []).map(role => `- ${role.name}: ${role.blurb}`);
  return [
    "MP LAUNCH PAD (Manhattan Project staff portal) covers:",
    bullets.join("\n"),
    "",
    "Staff roles:",
    roles.join("\n"),
    "",
    `Open “${SITE_FEATURES.tabLabel}” under Tools in the sidebar (updated ${SITE_FEATURES.updatedAt}).`
  ].join("\n");
}

function formatFeaturesUpdatedLabel(isoDate) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { SITE_FEATURES, buildSiteOverviewText, formatFeaturesUpdatedLabel };
}
if (typeof window !== "undefined") {
  window.SITE_FEATURES = SITE_FEATURES;
  window.buildSiteOverviewText = buildSiteOverviewText;
  window.formatFeaturesUpdatedLabel = formatFeaturesUpdatedLabel;
}
