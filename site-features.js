/**
 * FEATURES TAB — single source of truth for what this site can do.
 */

const SITE_FEATURES = {
  tabLabel: "App guide",
  updatedAt: "2026-09-09",
  recentUpdates: [
    { date: "2026-09-09", text: "Ops QA pass — MP floor model (bar service, seat yourself, rotating assignments), Kitchen Ticket SOP + ticket quizzes, recreational Arcade Top Scores only, Events on Home, Bar Tap Sheet match, App Guide issue form. Toast work is paused." },
    { date: "2026-09-08", text: "Final manager polish — reading widths, quieter forms, On Tap scan/mobile, War Games Service Drills vs Arcade (ATOM SHOOTER + Half-Life Highway), Staff Favorites on Team, App Guide credit + issue report." },
    { date: "2026-09-08", text: "Manager-ready cleanup Phase 7 — visual/a11y polish: shared page headers, focus rings, skip-to-content, 44px mobile targets, keyboard War Games/On Tap, Edit shortcuts on Home. I’m caught up no longer clears required acknowledgments." },
    { date: "2026-09-08", text: "Manager-ready cleanup Phase 6 — Home uses Since last shift (7shifts clock-out when linked), sparse New/Important badges, and pin-able Quick Access. Ask MP and Search Launch Pad open the source (beer, dish, SOP, drill) instead of a bare tab." },
    { date: "2026-09-08", text: "Manager-ready cleanup Phase 5 — War Games rebuilt as judgment drills (The Rush, Build the Flight, Read the Guest, Saturday Night) from the live On Tap list. Trivia matching is off the hub. Coaching links back into Training." },
    { date: "2026-09-08", text: "Manager-ready cleanup Phase 4 — Training is LEARN / PRACTICE / PROVE lessons on the five-shift path, with trainer verify, handoff, Day in the Life, and the service loop. Reference pages are supplemental." },
    { date: "2026-09-08", text: "Manager-ready cleanup Phase 3 — Guest Draft Menu and Bar Tap Sheet rebuilt as physical templates from the live On Tap list, with print preview and browser printing" },
    { date: "2026-09-08", text: "Manager-ready cleanup Phase 2 — scheduled weekly specials and seasonal drinks (publish/expire, add/archive), published event records, and edit* capability flags. Staff only see live specials; core food and house drinks stay the printed lists." },
    { date: "2026-09-08", text: "Manager-ready cleanup Phase 1 — Shift Tools, Drinks, Beer Catalog, Events, Search Launch Pad, Safety + Emergency, Team directory, and Manage gating" },
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
    { name: "Admin", blurb: "Full access — emails, SOPs, Team, merch, inventory, App Guide issues" },
    { name: "Manager", blurb: "Team, reports, digest, issue triage, Sell This Today. Account role is not today’s floor assignment." },
    { name: "Head Chef", blurb: "Weekly specials and event food notes — not site admin" },
    { name: "Merch", blurb: "Edit merch stock & ideas" },
    { name: "Inventory", blurb: "Update ops inventory counts and orders" },
    { name: "Shift lead", blurb: "Shift reports & digest when on today’s Shift Lead assignment" },
    { name: "Event lead", blurb: "Publish event records; menus + training for private events" },
    { name: "Trainer", blurb: "Verify five-shift skills and write handoffs — not all manager powers" },
    { name: "Employee / Bartender", blurb: "Training, briefing, Shift Tools, End of Shift, Team directory" },
    { name: "Trainee", blurb: "Lands on Training after login — five-shift path + same floor tools while learning" }
  ],
  feedbackTabOptions: [
    "Home", "Service · On Tap", "Service · Food + Specials", "Service · Drinks", "Service · Today's Floor", "Service · Shift Tools",
    "My Shift · Checklists", "My Shift · Events", "My Shift · End of Shift",
    "Learn · Training", "Learn · SOPs", "Learn · My Progress", "Learn · War Games",
    "Team",
    "Tools · Ask MP", "Tools · Search Launch Pad", "Tools · Merch",
    "Manage · Inventory", "Manage · Reviews", "Manage · App guide", "Manage · Shift Reports",
    "Safety + Emergency",
    "General / not sure"
  ],
  sections: [
    { id: "home", title: "Home", summary: "Daily dashboard: Today at MP, Your Shift, Since last shift, For you, and device-local Quick Access (Edit shortcuts to remove/reorder). Important items stay until individually acknowledged." },
    { id: "askmp", title: "Ask MP", summary: "Ask a question in plain language. Hits cite the source (On Tap, Food, SOP, Drinks, War Games) and open that source, not just the tab (Tools group)." },
    { id: "search", title: "Search Launch Pad", summary: "Browse destinations with a quiet pin to Home Quick Access. Same content index as Ask MP. Hidden manage tools stay out of employee results." },
    { id: "training", title: "Training", summary: "Five-shift path (Foundations → Ownership). Each skill is LEARN / PRACTICE / PROVE. Kitchen Ticket SOP, Know the Space, and ticket quizzes teach MP’s ticket standards — not Toast screens. Trainer verify does not auto-complete from simulations." },
    { id: "ontap", title: "On Tap", summary: "Live tap board plus a Beer Catalog/Library view. Print ▾ reproduces the physical Guest Draft Menu and the laminated Bar Tap Sheet (TAP · BEER · VOL · GR · FLAVOR · STYLE · ABV) from the same list." },
    { id: "food", title: "Food + Specials", summary: "Breakfast, brunch, lunch, dinner stay the printed core menu. Weekly specials are editable in place (name, description, price, ingredients, allergens, talking points) with publish/expire so future dishes can be prepared ahead. Staff only see what’s live." },
    { id: "drinks", title: "Drinks", summary: "Coffee, wine, cocktails, and NA drinks in one Service destination. Seasonal lattes, matchas, and cocktails use the same ✎ editor with schedule, archive, and availability. House wine and cocktail recipes stay on the page." },
    { id: "merch", title: "Merch", summary: "Employee taproom reference with photos, prices, and sizes. Stock editing stays permission-gated (Tools group)." },
    { id: "inventory", title: "Inventory", summary: "Ops counts, weekly order, dashboard (Manage group — inventory admins)." },
    { id: "floortools", title: "Shift Tools", summary: "86 board, handoff, huddle, Sell This, recommenders, allergy, maintenance, and shortcuts to checklists/SOPs (Service group)." },
    { id: "events", title: "Events", summary: "Published records with guest count, taproom impact, patio, production space, food/bar/setup notes, and event lead. Home shows Event today. Head Chef can edit food notes. Staff see a compact floor view." },
    { id: "safety", title: "Safety + Emergency", summary: "Always reachable from the sidebar — incident cards plus Fix It troubleshooting." },
    { id: "sops", title: "SOPs", summary: "Procedures including Kitchen Ticket SOP, Recipes, Emergency, photo standards gallery (Learn group)." },
    { id: "checklists", title: "Checklists", summary: "Opening/closing/cut/events/detail lists with streaks (My Shift group)." },
    { id: "launchpad", title: "War Games", summary: "Service drills: The Rush, Build the Flight (wooden board + live taps), Read the Guest, Saturday Night — MP bar service, not server sections. Beer Academy: Style Match, Flavor Profile, Pairing Lab, How Beer Is Made, Cicerone Challenge, What Would You Pour? — knowledge games with explanations, fun scores only. Arcade: ATOM SHOOTER and Half-Life Highway with device-local Top Scores. Leaderboard sits at the bottom (Beer Brains + Arcade High Scores), not above the games. Staff Favorites lives on Team. Trivia matching is retired from the hub (Learn group)." },
    { id: "progress", title: "My Progress", summary: "Scores, tasting journal, achievements (Learn group)." },
    { id: "shift", title: "End of Shift / Reports", summary: "Anonymous surveys (My Shift) + digests for leads (Manage · Shift Reports)." },
    { id: "team", title: "Team", summary: "Staff directory for everyone signed in. People can hold several account roles (trainer, inventory, merch). Today’s Floor assignment is separate. Team stuff includes Staff Favorites. Morning digest and analytics stay with managers." },
    { id: "briefing", title: "Daily briefing", summary: "Lives on Home (and Today at MP on Training). Pulls specials, Event today, 86s, handoffs, Sell This, unread announcements; shift leads see Friday food and coffee specials reminders." },
    { id: "feedback", title: "App Guide issues", summary: "Report a Launch Pad issue from App Guide (managers triage a compact list there). Not a public staff ranking. End of Shift surveys stay on My Shift." }
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
    `Open “${SITE_FEATURES.tabLabel}” under Manage in the sidebar (updated ${SITE_FEATURES.updatedAt}).`
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
