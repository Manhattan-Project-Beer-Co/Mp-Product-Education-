/**
 * FEATURES TAB — single source of truth for what this site can do.
 *
 * When you add a new sidebar tab or major capability:
 * 1. Add a section below (id, title, summary).
 * 2. Add the tab name to feedbackTabOptions if staff can report issues there.
 * 3. Add a line to recentUpdates with today's date.
 * 4. Bump updatedAt.
 *
 * Used by: index.html (Features tab), chat-knowledge.js (Training Assistant context).
 */

const SITE_FEATURES = {
  tabLabel: "Features",
  updatedAt: "2026-08-11",
  recentUpdates: [
    { date: "2026-08-11", text: "Launch Pad → Staff Favorites — guess teammates’ favorite beers for bonus points; unlocks them on the leaderboard" },
    { date: "2026-08-11", text: "Coffee → Viewfinder Roaster — fuller bean descriptions from viewfindercoffee.com (Worka, Landline, Nostalgia, Static Shock, Dial-Up)" },
    { date: "2026-08-11", text: "Launch Pad leaderboard shows each employee’s favorite beer (staff set their own)" },
    { date: "2026-08-11", text: "Checklists tab — Opening, Closing, Cut, Events, weekly detail, Clean Don't Lean" },
    { date: "2026-08-11", text: "Banana Foster Latte recipe on Coffee → Seasonal Lattes; SOPs → Recipes for Mich Mix + batch recipes" }
  ],
  roles: [
    { name: "Admin", blurb: "Full access — emails, SOPs, Team, merch, inventory, feedback triage" },
    { name: "Manager", blurb: "See everything — Team, shift scheduling, reports, feedback triage" },
    { name: "Merch", blurb: "Edit merch stock & ideas; can be scheduled as shift lead" },
    { name: "Inventory admin", blurb: "Update ops inventory counts and orders" },
    { name: "Shift lead", blurb: "Shift reports & digest when scheduled on duty" },
    { name: "Event lead", blurb: "All menus + training for private events; no Team/admin tools" },
    { name: "Bartender", blurb: "Training, briefing, End of Shift, Feedback" },
    { name: "Trainee", blurb: "Same floor access as bartender while learning" }
  ],
  feedbackTabOptions: [
    "On Tap",
    "All Beers",
    "Food",
    "Coffee",
    "Wine + Cocktails",
    "Merch",
    "Inventory",
    "SOPs",
    "Checklists",
    "Reviews",
    "Launch Pad",
    "My Progress",
    "End of Shift",
    "Shift Reports",
    "Team",
    "Training Assistant",
    "Features",
    "Feedback",
    "General / not sure"
  ],
  sections: [
    {
      id: "ontap",
      title: "On Tap & All Beers",
      summary: "Live tap list, beer details, filters, and tasting check-ins."
    },
    {
      id: "food",
      title: "Food",
      summary: "Breakfast, brunch (Sun 10–3), lunch, dinner, weekly specials, allergens."
    },
    {
      id: "coffee",
      title: "Coffee",
      summary: "Menu, Viewfinder beans, training manual, Seasonal Lattes (Banana Foster recipe + builds)."
    },
    {
      id: "bar",
      title: "Wine + Cocktails",
      summary: "Wine, Shirley Temples, and NA drinks."
    },
    {
      id: "merch",
      title: "Merch",
      summary: "In-stock counts, Up & Coming votes, Shopify link. Merch role can edit."
    },
    {
      id: "inventory",
      title: "Inventory",
      summary: "Ops counts, weekly order, dashboard. Inventory admin can edit."
    },
    {
      id: "sops",
      title: "SOPs",
      summary: "Procedures + a Recipes category for Mich Mix and other batch recipes you’ll add later."
    },
    {
      id: "checklists",
      title: "Checklists",
      summary: "Interactive Opening, Closing, Cut, Event Setup, weekly detail, and Clean Don't Lean lists."
    },
    {
      id: "reviews",
      title: "Reviews",
      summary: "Guest Google/Yelp feedback when sync is configured."
    },
    {
      id: "launchpad",
      title: "Launch Pad",
      summary: "Training games, Staff Favorites beer guesses (+bonus pts), leaderboard, and badges."
    },
    {
      id: "progress",
      title: "My Progress",
      summary: "Your scores, tasting journal, menu coverage, achievements."
    },
    {
      id: "shift",
      title: "End of Shift / Reports",
      summary: "Anonymous surveys for floor staff; digests for managers & on-duty leads."
    },
    {
      id: "team",
      title: "Team",
      summary: "Managers/admins: schedule shift leads, monitor training. Admins approve emails."
    },
    {
      id: "assistant",
      title: "Training Assistant",
      summary: "Corner chat for taps, coffee, SOPs, and training help."
    },
    {
      id: "briefing",
      title: "Daily briefing",
      summary: "First-login popup for new taps, specials, and seasonal drinks."
    },
    {
      id: "feedback",
      title: "Feedback",
      summary: "Report bugs, wrong info, or ideas. Managers triage status."
    }
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
    `See the ${SITE_FEATURES.tabLabel} tab for a quick reference (last updated ${SITE_FEATURES.updatedAt}).`
  ].join("\n");
}

function formatFeaturesUpdatedLabel(isoDate) {
  if (!isoDate) return "";
  const date = new Date(`${isoDate}T12:00:00`);
  if (Number.isNaN(date.getTime())) return isoDate;
  return date.toLocaleDateString([], { month: "long", day: "numeric", year: "numeric" });
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    SITE_FEATURES,
    buildSiteOverviewText,
    formatFeaturesUpdatedLabel
  };
}

if (typeof window !== "undefined") {
  window.SITE_FEATURES = SITE_FEATURES;
  window.buildSiteOverviewText = buildSiteOverviewText;
  window.formatFeaturesUpdatedLabel = formatFeaturesUpdatedLabel;
}
