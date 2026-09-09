#!/usr/bin/env node
// Phase 2: publish/expire status, staff-only live specials, capability flags.
// Does not start a server — contentStatus must stay correct without SQLite.

const fs = require("fs");
const path = require("path");
const {
  contentStatus,
  isContentLive,
  parseStamp,
  stampToStorage
} = require("../weekly-specials-api");
const { mapEventRow } = require("../published-events-api");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const ROLES = fs.readFileSync(path.join(ROOT, "roles.js"), "utf8");
const SPECIALS_API = fs.readFileSync(path.join(ROOT, "weekly-specials-api.js"), "utf8");
const EVENTS_API = fs.readFileSync(path.join(ROOT, "published-events-api.js"), "utf8");
const FEATURES = fs.readFileSync(path.join(ROOT, "site-features.js"), "utf8");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`PASS  ${msg}`);

const now = new Date("2026-09-08T16:00:00");

function expectStatus(row, expected, label) {
  const got = contentStatus(row, { now });
  if (got !== expected) fail(`${label}: expected ${expected}, got ${got}`);
  else pass(label);
}

expectStatus({ active: 1 }, "live", "active special with no window is live");
expectStatus({ active: 1, publish_at: "", expire_at: "" }, "live", "empty publish/expire stamps stay live");
expectStatus(
  { active: 1, publish_at: "2026-09-09T00:00" },
  "scheduled",
  "future publish_at is scheduled"
);
expectStatus(
  { active: 1, expire_at: "2026-09-08T12:00" },
  "expired",
  "past expire_at is expired"
);
expectStatus(
  { active: 1, publish_at: "2026-09-08T00:00", expire_at: "2026-09-09T00:00" },
  "live",
  "inside publish/expire window is live"
);
expectStatus(
  { active: 0, publish_at: "2026-09-01T00:00" },
  "archived",
  "inactive special is archived even inside a window"
);
expectStatus({ archived: 1, available: 1 }, "archived", "archived seasonal is archived");
expectStatus(
  { active: 1, publish_at: "2026-09-09" },
  "scheduled",
  "date-only future publish_at is scheduled"
);

if (isContentLive({ active: 1 }, { now }) && !isContentLive({ active: 1, publish_at: "2026-09-09T00:00" }, { now })) {
  pass("isContentLive matches live vs scheduled");
} else {
  fail("isContentLive does not match contentStatus");
}

const stored = stampToStorage("2026-09-08T16:05");
if (stored === "2026-09-08T16:05" && parseStamp(stored) instanceof Date) {
  pass("stampToStorage / parseStamp round-trip");
} else {
  fail(`stamp helpers produced ${JSON.stringify(stored)}`);
}

const liveEvent = mapEventRow({
  id: 1,
  title: "Beer club",
  summary: "",
  location: "",
  starts_at: "2026-09-08T12:00",
  ends_at: "2026-09-08T20:00",
  notes: "",
  published: 1
}, { now });
const upcomingEvent = mapEventRow({
  id: 2,
  title: "Private dining",
  summary: "",
  location: "",
  starts_at: "2026-09-10T18:00",
  ends_at: "2026-09-10T21:00",
  notes: "",
  published: 1
}, { now });
const draftEvent = mapEventRow({
  id: 3,
  title: "Draft",
  summary: "",
  location: "",
  starts_at: "2026-09-08T17:00",
  ends_at: "",
  notes: "",
  published: 0
}, { now });
const endedEvent = mapEventRow({
  id: 4,
  title: "Yesterday",
  summary: "",
  location: "",
  starts_at: "2026-09-07T17:00",
  ends_at: "2026-09-07T20:00",
  notes: "",
  published: 1
}, { now });

function staffCanSeeEvent(event) {
  return Boolean(event.published && event.status !== "expired");
}

if (liveEvent.status === "live" && staffCanSeeEvent(liveEvent)) pass("staff see a live published event");
else fail(`live event visibility wrong: ${JSON.stringify(liveEvent)}`);

if (upcomingEvent.status === "scheduled" && staffCanSeeEvent(upcomingEvent)) {
  pass("staff see upcoming published events (scheduled is OK)");
} else {
  fail(`upcoming event should be visible to staff: ${JSON.stringify(upcomingEvent)}`);
}

if (!staffCanSeeEvent(draftEvent)) pass("staff do not see unpublished event drafts");
else fail("unpublished events leaked to staff");

if (endedEvent.status === "expired" && !staffCanSeeEvent(endedEvent)) {
  pass("staff do not see expired events");
} else {
  fail(`expired event visibility wrong: ${JSON.stringify(endedEvent)}`);
}

const flags = [
  "canEditSpecials",
  "canEditDrinks",
  "canEditMerch",
  "canEditInventory",
  "canEditSOP",
  "canEditBeer",
  "canEditEvents"
];
const missingFlags = flags.filter((name) => !ROLES.includes(`function ${name}`));
if (missingFlags.length) fail(`roles.js missing ${missingFlags.join(", ")}`);
else pass("capability flags exist on StaffRoles");

const payloadFlags = ["editSpecials", "editDrinks", "editMerch", "editInventory", "editSop", "editBeer", "editEvents"];
if (payloadFlags.every((key) => ROLES.includes(`${key}:`))) pass("buildPermissions exposes edit* keys");
else fail("buildPermissions is missing edit* keys");

if (SPECIALS_API.includes("canEdit || row.status === \"live\"")) {
  pass("weekly/coffee GET hides non-live rows from staff");
} else {
  fail("weekly-specials GET is not filtering staff to live content");
}

if (EVENTS_API.includes("row.published && row.status !== \"expired\"")) {
  pass("events GET shows published non-expired rows to staff");
} else {
  fail("events GET staff filter is missing");
}

if (SPECIALS_API.includes('app.post("/api/weekly-specials"') && SPECIALS_API.includes('app.post("/api/coffee-specials"')) {
  pass("add endpoints exist for weekly and seasonal drinks");
} else {
  fail("POST create endpoints for specials/seasonals are missing");
}

if (INDEX.includes("Prepare a future special") && INDEX.includes("weeklyPublish-") && INDEX.includes("function createWeeklySpecial")) {
  pass("weekly specials have schedule fields and a prepare-ahead form");
} else {
  fail("weekly specials UI is missing publish/expire or create");
}

if (INDEX.includes("function renderBarSeasonalBlock") && INDEX.includes("function createCoffeeSpecial")) {
  pass("seasonal drinks can be added on coffee and bar menus");
} else {
  fail("seasonal drink add/edit UI is missing");
}

if (INDEX.includes('contentType() !== "drinks" && contentType() !== "coffee"')) {
  pass("seasonal drinks still load after the Drinks merge");
} else {
  fail("renderCoffeeSeasonal still bails when contentType is drinks");
}

if (INDEX.includes("function renderPublishedEventEditCard") && INDEX.includes("function createPublishedEvent")) {
  pass("Events has inline publish/edit for authorized roles");
} else {
  fail("published event editor is missing");
}

if (/const FOOD_MENU = \[/.test(INDEX) && !INDEX.includes("/api/food-menu")) {
  pass("core FOOD_MENU stays hardcoded (not a CMS)");
} else {
  fail("core food menu looks migrated off the hardcoded list");
}

if (/const BAR_MENU_DRINKS = \[/.test(INDEX)) pass("house BAR_MENU_DRINKS stays hardcoded");
else fail("house bar list is missing");

if (FEATURES.includes("publish") && FEATURES.includes("expire") && /title: "Events"/.test(FEATURES)) {
  pass("App guide mentions scheduled specials/events");
} else {
  fail("site-features.js is missing Phase 2 content-management copy");
}

if (failures) {
  console.error(`\n${failures} Phase 2 schedule check(s) failed.`);
  process.exit(1);
}
console.log("\nPhase 2 specials/events schedule checks passed.");
