/**
 * FEATURES TAB — single source of truth for what this site can do.
 */

const SITE_FEATURES = {
  tabLabel: "Features",
  updatedAt: "2026-08-11",
  recentUpdates: [
    { date: "2026-08-11", text: "Photo standards gallery, checklist before/after photos, shout-outs, team challenges, secret streaks" },
    { date: "2026-08-11", text: "Tap Change + New Menu Package generators; weekly training pack + deeper Team analytics" },
    { date: "2026-08-11", text: "Ask MP universal search + Floor Tools pack (86s, handoff, huddle, recommenders, allergy, maintenance, First 5, skills)" },
    { date: "2026-08-11", text: "Guest Scenarios + Complaint Recovery games; Sell This Today; manager morning digest" }
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
    "On Tap", "All Beers", "Food", "Coffee", "Wine + Cocktails", "Merch", "Inventory",
    "SOPs", "Checklists", "Floor Tools", "Reviews", "Launch Pad", "My Progress",
    "End of Shift", "Shift Reports", "Team", "Ask MP", "Features", "Feedback", "General / not sure"
  ],
  sections: [
    { id: "askmp", title: "Ask MP", summary: "Universal search chatbot for beers, food, coffee, SOPs/recipes, events, and training." },
    { id: "ontap", title: "On Tap & All Beers", summary: "Live tap list, details, filters, tasting check-ins." },
    { id: "food", title: "Food", summary: "Breakfast, brunch, lunch, dinner, weekly specials, allergens." },
    { id: "coffee", title: "Coffee", summary: "Menu, Viewfinder beans, seasonal latte recipes, training manual." },
    { id: "bar", title: "Wine + Cocktails", summary: "Wine, Shirley Temples, and NA drinks." },
    { id: "floor", title: "Floor Tools", summary: "86 board, handoff, huddle, Sell This, photo standards, shout-outs, team challenges, tap change + menu packages, recommenders, allergy, maintenance, First 5, skills, secrets/streaks." },
    { id: "merch", title: "Merch", summary: "In-stock counts, Up & Coming votes, Shopify link." },
    { id: "inventory", title: "Inventory", summary: "Ops counts, weekly order, dashboard." },
    { id: "sops", title: "SOPs", summary: "Procedures, Recipes, Emergency, photo standards gallery." },
    { id: "checklists", title: "Checklists", summary: "Opening/closing/cut/events/detail lists with before/after task photos and streaks." },
    { id: "launchpad", title: "Launch Pad", summary: "Games, Staff Favorites, Guest Scenarios, Complaint Recovery, leaderboard, badges." },
    { id: "progress", title: "My Progress", summary: "Scores, tasting journal, achievements." },
    { id: "shift", title: "End of Shift / Reports", summary: "Anonymous surveys + digests for leads." },
    { id: "team", title: "Team", summary: "Morning digest, AI weekly training pack, deep analytics, shift lead duty." },
    { id: "briefing", title: "Daily briefing", summary: "New taps, specials, seasonal drinks." },
    { id: "feedback", title: "Feedback", summary: "Ideas/bugs with Submitted → Reviewing → Planned → Built pipeline for managers." }
  ]
};

function buildSiteOverviewText() {
  const bullets = SITE_FEATURES.sections.map(section => `- ${section.title}: ${section.summary}`);
  const roles = (SITE_FEATURES.roles || []).map(role => `- ${role.name}: ${role.blurb}`);
  return [
    "Manhattan Project staff training portal covers:",
    bullets.join("\n"),
    "",
    "Staff roles:",
    roles.join("\n"),
    "",
    `See the ${SITE_FEATURES.tabLabel} tab (updated ${SITE_FEATURES.updatedAt}). Ask MP searches across these areas.`
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
