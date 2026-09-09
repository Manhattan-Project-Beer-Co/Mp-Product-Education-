#!/usr/bin/env node
// Phase 6: Home + discovery — last shift, sources, Search Launch Pad, optional pins.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const UI = fs.readFileSync(path.join(ROOT, "ui.js"), "utf8");
const CHAT = fs.readFileSync(path.join(ROOT, "chat-knowledge.js"), "utf8");
const SYNC = fs.readFileSync(path.join(ROOT, "seven-shifts-sync.js"), "utf8");
const FEATURES = fs.readFileSync(path.join(ROOT, "site-features.js"), "utf8");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`PASS  ${msg}`);

if (SYNC.includes("lastShift:") && /end_at < \?/.test(SYNC) && SYNC.includes("ORDER BY end_at DESC")) {
  pass("shift context includes last completed 7shifts block");
} else {
  fail("getUserShiftContext does not expose lastShift");
}

if (UI.includes("Since last shift") && UI.includes("sinceLastShiftCopy") && !UI.includes("While you were away")) {
  pass("Home away section is Since last shift");
} else {
  fail("Home still uses While you were away / login briefing copy");
}

if (UI.includes("I'm caught up") && UI.includes("requiresHomeAck") && UI.includes("filter((item) => !requiresHomeAck") && !/away-item-ack[\s\S]*Got it/.test(UI)) {
  pass("Away items use sparse New/Important; I’m caught up skips required acks");
} else {
  fail("I’m caught up can still clear items that require Acknowledge");
}

if (UI.includes("Your shift") && UI.includes("Last out") && UI.includes("Quick access")) {
  pass("Home still has Your Shift and Quick Access");
} else {
  fail("Your Shift or Quick Access is missing from Home");
}

if (UI.includes("toggleQuickAccessPin") && UI.includes("mp-quick-access:") && UI.includes("QUICK_ACCESS_DEFAULTS")) {
  pass("optional Home pins persist on this device");
} else {
  fail("Quick Access pins are not wired");
}

if (INDEX.includes("function openSearchResult") && INDEX.includes("openSearchResultAt") && INDEX.includes("searchResultSource")) {
  pass("Ask MP / Search open a real source, not only a tab");
} else {
  fail("openSearchResult is missing");
}

if (
  INDEX.includes("function renderAskMp")
  && INDEX.includes("function renderSearchLaunchPad")
  && INDEX.includes('renderSearchResultButton(result, "askmp"')
  && INDEX.includes('renderSearchResultButton(result, "search"')
) {
  pass("Ask MP and Search Launch Pad stay separate and both cite sources");
} else {
  fail("Ask MP and Search Launch Pad are no longer separate sourced searchers");
}

if (CHAT.includes('source: "On Tap"') && CHAT.includes('source: "Food + Specials"') && CHAT.includes("sopTitle:") && CHAT.includes('source: "War Games"')) {
  pass("search index stamps a source on beer, food, SOP, and War Games hits");
} else {
  fail("universalSearch results are missing source citations");
}

if (INDEX.includes("search-pin") && INDEX.includes("Pin to Home")) {
  pass("Search Launch Pad can pin destinations to Home");
} else {
  fail("Search directory has no pin-to-Home control");
}

if (FEATURES.includes("Since last shift") && FEATURES.includes("open the source")) {
  pass("App guide describes last-shift Home and sourced Ask MP");
} else {
  fail("App guide still describes the old Home / dump-to-tab search");
}

if (failures) {
  console.error(`\n${failures} Phase 6 Home/discovery check(s) failed.`);
  process.exit(1);
}
console.log("\nPhase 6 Home + discovery checks passed.");
