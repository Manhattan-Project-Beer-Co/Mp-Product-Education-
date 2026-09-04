/**
 * FEATURES TAB — single source of truth for what this site can do.
 */

const SITE_FEATURES = {
  tabLabel: "How this app works",
  updatedAt: "2026-08-31",
  recentUpdates: [
    { date: "2026-08-31", text: "Sidebar consolidated — Menu + Floor hubs; Ask MP chat removed" },
    { date: "2026-08-11", text: "Photo standards gallery, checklist before/after photos, shout-outs, team challenges, secret streaks" },
    { date: "2026-08-11", text: "Tap Change + New Menu Package generators; weekly training pack + deeper Team analytics" },
    { date: "2026-08-11", text: "Floor Tools pack (86s, handoff, huddle, recommenders, allergy, maintenance, First 5, skills)" }
  ],
  roles: [
    { name: "Admin", blurb: "Full access — emails, SOPs, Team, merch, inventory, feedback" },
    { name: "Manager", blurb: "Team, shift scheduling, reports, digest, feedback triage, Sell This Today" },
    { name: "Merch", blurb: "Edit merch stock & ideas; can be scheduled as shift lead" },
    { name: "Inventory admin", blurb: "Update ops inventory counts and orders" },
    { name: "Shift lead", blurb: "Shift reports & digest when scheduled on duty" },
    { name: "Event lead", blurb: "Menus + training for private events" },
    { name: "Bartender", blurb: "Training, briefing, Floor Tools, End of Shift, Feedback" },
    { name: "Trainee", blurb: "First 5 Shifts path + same floor tools while learning" }
  ],
  feedbackTabOptions: [
    "Menu · On Tap", "Menu · All Beers", "Menu · Food", "Menu · Coffee", "Menu · Wine + Cocktails", "Menu · Merch",
    "Inventory", "Floor · Floor Tools", "Floor · SOPs", "Floor · Checklists", "Reviews", "War Games",
    "My Progress", "End of Shift", "Shift Reports", "Team", "How this app works", "Feedback", "General / not sure"
  ],
  sections: [
    { id: "menu", title: "Menu", summary: "Hub for On Tap, All Beers, Food, Coffee, Wine + Cocktails, and Merch — switch with chips under the title." },
    { id: "ontap", title: "On Tap & All Beers", summary: "Live tap list, details, filters, tasting check-ins (under Menu). Admins, managers, and shift leads can change what’s pouring from each On Tap card." },
    { id: "food", title: "Food", summary: "Breakfast, brunch, lunch, dinner, weekly specials, allergens (under Menu)." },
    { id: "coffee", title: "Coffee", summary: "Menu, Viewfinder beans, seasonal latte recipes, training manual (under Menu)." },
    { id: "bar", title: "Wine + Cocktails", summary: "Wine, house cocktails, and NA drinks (under Menu)." },
    { id: "merch", title: "Merch", summary: "In-stock counts, Up & Coming votes, Shopify link (under Menu)." },
    { id: "inventory", title: "Inventory", summary: "Ops counts, weekly order, dashboard." },
    { id: "floor", title: "Floor", summary: "Hub for Floor Tools, SOPs, and Checklists — switch with chips under the title." },
    { id: "floortools", title: "Floor Tools", summary: "86 board, handoff, huddle, Sell This, photo standards, shout-outs, team challenges, tap change + menu packages, recommenders, allergy, maintenance, First 5, skills, secrets/streaks." },
    { id: "sops", title: "SOPs", summary: "Procedures, Recipes, Emergency, photo standards gallery (under Floor)." },
    { id: "checklists", title: "Checklists", summary: "Opening/closing/cut/events/detail lists with before/after task photos and streaks (under Floor)." },
    { id: "launchpad", title: "War Games", summary: "Arcade drills, Staff Favorites, Guest Scenarios, Complaint Recovery, leaderboard, badges." },
    { id: "progress", title: "My Progress", summary: "Scores, tasting journal, achievements — under your name in the sidebar." },
    { id: "shift", title: "End of Shift / Reports", summary: "Anonymous surveys (account links) + digests for leads (Shift Reports tab)." },
    { id: "team", title: "Team", summary: "Morning digest, AI weekly training pack, deep analytics, shift lead duty." },
    { id: "briefing", title: "Daily briefing", summary: "New taps, specials, seasonal drinks." },
    { id: "feedback", title: "Feedback", summary: "Ideas/bugs with Submitted → Reviewing → Planned → Built pipeline — under your name in the sidebar." }
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
    `Open “${SITE_FEATURES.tabLabel}” under your name in the sidebar (updated ${SITE_FEATURES.updatedAt}).`
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
