#!/usr/bin/env node
// Phase 7: visual / a11y / consistency polish — no new product features.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const UI = fs.readFileSync(path.join(ROOT, "ui.js"), "utf8");
const TRAINING = fs.readFileSync(path.join(ROOT, "training.js"), "utf8");
const FLOOR = fs.readFileSync(path.join(ROOT, "floor-tools.js"), "utf8");
const FEATURES = fs.readFileSync(path.join(ROOT, "site-features.js"), "utf8");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`PASS  ${msg}`);

if (UI.includes("requiresHomeAck") && UI.includes("filter((item) => !requiresHomeAck") && UI.includes("markViewed: !mustAck")) {
  pass("I’m caught up and opening a card cannot satisfy required acknowledgments");
} else {
  fail("required acknowledgments can still be bulk-cleared");
}

if (UI.includes("toggleQuickAccessEditing") && UI.includes("moveQuickAccessPin") && UI.includes("Edit shortcuts")) {
  pass("Home has a device-local Edit shortcuts control");
} else {
  fail("Quick Access cannot be edited on Home");
}

if (INDEX.includes("skip-link") && INDEX.includes('href="#appMain"') && INDEX.includes(":focus-visible") && INDEX.includes("visually-hidden")) {
  pass("skip-to-content, focus rings, and visually-hidden labels exist");
} else {
  fail("keyboard/a11y chrome is incomplete");
}

if (INDEX.includes('<button type="button" class="game-tile"') && INDEX.includes('role="button"') && INDEX.includes("onkeydown")) {
  pass("War Games tiles and On Tap rows are keyboard-reachable");
} else {
  fail("War Games / On Tap still rely on mouse-only click targets");
}

if (
  INDEX.includes('title: "War Games"')
  && INDEX.includes('title: "My Progress"')
  && INDEX.includes('title: "Checklists"')
  && INDEX.includes("Today’s Floor")
  && INDEX.includes('"Brunch Menu" : "Food"')
  && INDEX.includes('title: "Ops Inventory"')
  && INDEX.includes('title: "Guest Reviews"')
  && TRAINING.includes('title: "Trainer mode"')
  && FLOOR.includes('"Photo Standards" : "Shift Tools"')
) {
  pass("major pages share the page-header pattern");
} else {
  fail("page headers are still ad-hoc on a major destination");
}

if (INDEX.includes("min-height: 44px") && INDEX.includes("overflow-wrap: anywhere")) {
  pass("mobile touch targets and long-name wrapping are in CSS");
} else {
  fail("touch / overflow polish is missing");
}

if (FEATURES.includes("Phase 7") && FEATURES.includes("focus rings")) {
  pass("App guide records the polish pass");
} else {
  fail("App guide does not mention Phase 7 polish");
}

if (failures) {
  console.error(`\n${failures} Phase 7 polish check(s) failed.`);
  process.exit(1);
}
console.log("\nPhase 7 polish checks passed.");
