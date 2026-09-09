#!/usr/bin/env node
// Phase 1 acceptance: dead links, stale routes, orphaned tabs, permission
// leakage, duplicate navigation, and hidden features still appearing in search.

const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const FLOOR = fs.readFileSync(path.join(ROOT, "floor-tools.js"), "utf8");
const CHAT = fs.readFileSync(path.join(ROOT, "chat-knowledge.js"), "utf8");
const UI = fs.readFileSync(path.join(ROOT, "ui.js"), "utf8");
const FEATURES = fs.readFileSync(path.join(ROOT, "site-features.js"), "utf8");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`PASS  ${msg}`);

function extract(source, pattern, label) {
  const match = source.match(pattern);
  if (!match) {
    fail(`could not parse ${label}`);
    return null;
  }
  return match[1] != null ? match[1] : match[0];
}

function evalObject(snippet, label) {
  try {
    return vm.runInNewContext(`(${snippet})`);
  } catch (err) {
    fail(`could not eval ${label}: ${err.message}`);
    return null;
  }
}

function evalArray(snippet, label) {
  try {
    return vm.runInNewContext(`(${snippet})`);
  } catch (err) {
    fail(`could not eval ${label}: ${err.message}`);
    return null;
  }
}

const navHtml = extract(INDEX, /(<nav class="sidebar-nav tabs" id="mainTabs"[\s\S]*?<\/nav>)/, "mainTabs");
if (!navHtml) process.exit(1);

const navTypes = [...navHtml.matchAll(/data-type="([^"]+)"/g)].map((m) => m[1]);
const counts = navTypes.reduce((acc, type) => {
  acc[type] = (acc[type] || 0) + 1;
  return acc;
}, {});

const phaseSnippet = extract(INDEX, /const PHASE1_NAV = (\{[\s\S]*?\n\});/, "PHASE1_NAV");
const PHASE1_NAV = phaseSnippet ? evalObject(phaseSnippet, "PHASE1_NAV") : null;

const shiftIdsSnippet = extract(FLOOR, /const SHIFT_TOOL_TAB_IDS = (\[[\s\S]*?\]);/, "SHIFT_TOOL_TAB_IDS");
const SHIFT_TOOL_TAB_IDS = shiftIdsSnippet ? evalArray(shiftIdsSnippet, "SHIFT_TOOL_TAB_IDS") : [];

const removedSnippet = extract(FLOOR, /const REMOVED_FLOOR_SECTION_IDS = (\[[\s\S]*?\]);/, "REMOVED_FLOOR_SECTION_IDS");
const REMOVED_FLOOR_SECTION_IDS = removedSnippet ? evalArray(removedSnippet, "REMOVED_FLOOR_SECTION_IDS") : [];

const expectedEmployee = PHASE1_NAV?.employeeTabs || [];
const manageTabs = PHASE1_NAV?.manageTabs || [];
const forbidden = PHASE1_NAV?.forbiddenNavTypes || [];

for (const [type, count] of Object.entries(counts)) {
  if (count > 1) fail(`duplicate sidebar destination "${type}" (${count} tabs)`);
}
if (!Object.values(counts).some((n) => n > 1)) pass("no duplicate sidebar data-type tabs");

for (const type of expectedEmployee) {
  if (!navTypes.includes(type)) fail(`missing employee tab data-type="${type}"`);
}
if (expectedEmployee.every((type) => navTypes.includes(type))) {
  pass("employee destinations are present in the sidebar");
}

for (const type of manageTabs) {
  if (!navTypes.includes(type)) fail(`missing manage tab data-type="${type}"`);
}
if (manageTabs.every((type) => navTypes.includes(type))) pass("manage destinations remain reachable");

for (const type of forbidden) {
  if (navTypes.includes(type)) fail(`forbidden top-level tab still in sidebar: ${type}`);
}
if (!forbidden.some((type) => navTypes.includes(type))) {
  pass("All Beers / Coffee / Bar / Emergency are not top-level nav items");
}

if (!navHtml.includes('data-type="askmp"') || !navHtml.includes('data-type="search"')) {
  fail("Ask MP and Search Launch Pad must stay separate user-facing actions");
} else {
  pass("Ask MP and Search Launch Pad are separate tabs");
}

if (!navHtml.includes("tab-safety") || !navTypes.includes("safety")) {
  fail("Safety + Emergency is missing from always-visible nav");
} else if (/<div class="nav-group"[\s\S]*data-type="safety"[\s\S]*?<\/div>/.test(navHtml) && !navHtml.includes('class="tab tab-safety"')) {
  fail("Safety + Emergency appears to be buried in a nav group");
} else {
  pass("Safety + Emergency is a first-class sidebar action");
}

const teamBtn = navHtml.match(/<button[^>]*data-type="team"[^>]*>/);
if (!teamBtn) fail("Team tab missing");
else if (/tab-team-only/.test(teamBtn[0]) && !/tab-auth-only/.test(teamBtn[0])) {
  fail("Team is still manager-gated in nav; employees need the directory");
} else if (/tab-auth-only/.test(teamBtn[0])) {
  pass("Team directory is available to signed-in staff");
} else {
  pass("Team tab is visible in nav");
}

const merchBtn = navHtml.match(/<button[^>]*data-type="merch"[^>]*>/);
if (!merchBtn) fail("Merch tab missing");
else if (/tab-manage-only|tab-inventory-only|style="display:none;"/.test(merchBtn[0])) {
  fail("Merch should stay visible as an employee reference");
} else {
  pass("Merch remains an employee destination");
}

function classForType(type) {
  const re = new RegExp(`<button[^>]*data-type="${type}"[^>]*>`);
  const match = navHtml.match(re);
  return match ? match[0] : "";
}

if (!/tab-inventory-only/.test(classForType("inventory"))) {
  fail("Inventory is not gated with tab-inventory-only");
} else pass("Inventory is permission-gated in nav");

if (!/tab-manage-only/.test(classForType("reviews"))) fail("Reviews is not manage-gated");
else pass("Reviews is manage-gated in nav");

if (!/tab-manage-only/.test(classForType("features"))) fail("App guide is not manage-gated");
else pass("App guide is manage-gated in nav");

if (!/tab-shift-lead-only/.test(classForType("shift-reports"))) fail("Shift Reports is not lead-gated");
else pass("Shift Reports stays lead-gated");

if (!INDEX.includes("function filterSearchResults") || !INDEX.includes("function canSearchTab")) {
  fail("search leakage filter helpers are missing");
} else pass("search results are filtered by permission");

if (!INDEX.includes("hiddenSearchTabs") || !INDEX.includes('"inventory"')) {
  fail("hidden search tabs contract is missing inventory");
} else pass("hidden manage tools are listed for search filtering");

const activateFn = extract(INDEX, /function activateAppTab\(type\) \{([\s\S]*?)\nfunction /, "activateAppTab");
if (activateFn) {
  const aliases = [
    ["beer", "catalog"],
    ["coffee", "drinks"],
    ["bar", "drinks"],
    ["emergency", "safety"],
    ["today-floor", "today-floor"]
  ];
  for (const [from, to] of aliases) {
    if (!activateFn.includes(`type === "${from}"`) && !activateFn.includes(`"${from}"`)) {
      fail(`activateAppTab is missing alias handling for "${from}" → ${to}`);
    }
  }
  if (activateFn.includes('ontapView = "catalog"') && activateFn.includes('nextActive = "drinks"') && activateFn.includes('nextActive = "safety"')) {
    pass("stale routes alias into current destinations");
  }
}

if (!INDEX.includes("function renderSearchLaunchPad") || !INDEX.includes("function renderAskMp")) {
  fail("Ask MP / Search Launch Pad renderers missing");
} else pass("Ask MP and Search Launch Pad both have renderers");

if (!INDEX.includes("function renderEvents") || !INDEX.includes("No published events this week")) {
  fail("Events destination is missing or has no room for event records");
} else pass("Events is a real My Shift destination with a records placeholder");

if (!INDEX.includes("function renderSafety")) fail("Safety + Emergency renderer missing");
else pass("Safety + Emergency has a dedicated view");

if (!INDEX.includes("function renderDrinks") || !INDEX.includes("function renderOnTapViewTabs")) {
  fail("Drinks merge or On Tap catalog tabs missing");
} else pass("Drinks merge and On Tap catalog view exist");

if (!INDEX.includes("/api/team/directory") || !INDEX.includes("Staff directory")) {
  fail("read-only Team directory path is missing");
} else pass("employees get a read-only Team directory");

const expectedShift = ["board", "handoff", "huddle", "sell", "recommend", "allergy", "maintenance", "shortcuts"];
for (const id of expectedShift) {
  if (!SHIFT_TOOL_TAB_IDS.includes(id)) fail(`Shift Tools is missing tab "${id}"`);
}
if (expectedShift.every((id) => SHIFT_TOOL_TAB_IDS.includes(id))) pass("Shift Tools keeps the live service boards");

for (const id of REMOVED_FLOOR_SECTION_IDS) {
  if (SHIFT_TOOL_TAB_IDS.includes(id)) fail(`removed floor section "${id}" is still a Shift Tools tab`);
}
if (REMOVED_FLOOR_SECTION_IDS.every((id) => !SHIFT_TOOL_TAB_IDS.includes(id))) {
  pass("low-value floor utilities are not employee Shift Tools tabs");
}

if (FLOOR.includes('label: "Clearance"') && /SHIFT_TOOL_TAB_IDS[\s\S]*Clearance/.test(FLOOR)) {
  fail("Clearance is still a Shift Tools tab label");
}

const renderCalls = [...INDEX.matchAll(/activateAppTab\(['"]([a-z0-9-]+)['"]\)/g)].map((m) => m[1]);
const known = new Set([
  ...navTypes,
  ...(PHASE1_NAV ? Object.keys(PHASE1_NAV.aliases) : []),
  "home", "ontap", "food", "drinks", "floor", "today-floor", "checklists", "sops",
  "training", "games", "askmp", "search", "merch", "safety", "events",
  "inventory", "reviews", "features", "shift-reports", "team", "feedback",
  "progress", "shift-survey", "beer", "coffee", "bar", "catalog", "emergency",
  "troubleshoot", "today", "menu"
]);
const unknown = [...new Set(renderCalls)].filter((type) => !known.has(type));
if (unknown.length) fail(`activateAppTab targets with no route: ${unknown.join(", ")}`);
else pass("inline activateAppTab targets resolve to known routes");

if (/tab: "coffee"/.test(CHAT)) fail("chat-knowledge still routes coffee hits to the coffee tab");
else pass("search index sends coffee hits to Drinks");

if (/\*\*All Beers\*\*/.test(CHAT) || /All Beers tab/.test(CHAT)) {
  fail("Ask MP copy still advertises All Beers as a tab");
} else pass("Ask MP copy no longer advertises All Beers as a top-level tab");

if (/Floor Tools/.test(CHAT) || /Floor Tools/.test(UI)) {
  fail("Floor Tools label still appears in search/home copy");
} else pass("user-facing copy uses Shift Tools");

if (/Service · All Beers/.test(FEATURES) || /title: "Floor Tools"/.test(FEATURES)) {
  fail("App guide still advertises removed destinations");
} else pass("App guide matches Phase 1 navigation");

if (!INDEX.includes("function getLogicalBack") || !INDEX.includes("id=\"stageBack\"")) {
  fail("logical back control is missing");
} else pass("logical back navigation exists");

if (failures) {
  console.error(`\n${failures} Phase 1 nav check(s) failed.`);
  process.exit(1);
}
console.log("\nPhase 1 nav acceptance checks passed.");
