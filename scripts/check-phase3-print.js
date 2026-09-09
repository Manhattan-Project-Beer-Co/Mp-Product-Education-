#!/usr/bin/env node
// Phase 3: physical print templates from the live On Tap list.

const fs = require("fs");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const FEATURES = fs.readFileSync(path.join(ROOT, "site-features.js"), "utf8");
const TAP_API = fs.readFileSync(path.join(ROOT, "tap-display-api.js"), "utf8");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`PASS  ${msg}`);

if (INDEX.includes("function getOnTapBeersSorted") && TAP_API.includes("tap_display_meta")) {
  pass("print still uses On Tap + tap display meta (no second beer database)");
} else {
  fail("print is not wired to the live On Tap list");
}

if (INDEX.includes("Draft Beer") && INDEX.includes("print-draft-heading") && INDEX.includes("/images/mpbc-logo.png")) {
  pass("guest menu uses DRAFT BEER heading and MP wordmark");
} else {
  fail("guest draft template is missing DRAFT BEER / wordmark");
}

if (
  INDEX.includes('GUEST_PRINT_CATEGORIES = ["CORE", "LIMITED", "HOPPY", "BOLDER"]')
  && INDEX.includes("function guestPrintCategory")
) {
  pass("guest menu categories are CORE / LIMITED / HOPPY / BOLDER");
} else {
  fail("guest print categories do not match the physical menu");
}

if (INDEX.includes("function formatPrintBeerLine") && INDEX.includes("formatPrintStyle") && INDEX.includes("formatPrintAbv")) {
  pass("guest beer line is style · abv · pour");
} else {
  fail("guest beer line helpers are missing");
}

if (/Manhattan Project · Draft/.test(INDEX) || INDEX.includes("print-draft-brand")) {
  fail("generic website draft branding is still in the print template");
} else {
  pass("generic website draft branding was removed");
}

const barHead = INDEX.match(/print-bar-table[\s\S]{0,900}<\/thead>/);
if (
  barHead
  && [">Tap<", ">Beer<", ">Vol<", ">GR<", ">Flavor<", ">Style<", ">ABV<", ">Notes<"].every((col) => barHead[0].includes(col))
) {
  pass("bar tap sheet columns match TAP · BEER · VOL · GR · FLAVOR · STYLE · ABV · NOTES");
} else {
  fail("bar tap sheet columns do not match the physical sheet");
}

if (INDEX.includes("Print ▾") && INDEX.includes("Guest Draft Menu") && INDEX.includes("Bar Tap Sheet") && INDEX.includes("Print Both")) {
  pass("PRINT ▾ offers Guest Draft Menu, Bar Tap Sheet, and Print Both");
} else {
  fail("print chooser flow is missing");
}

if (INDEX.includes("print-preview-stage") && INDEX.includes("function printOnTapSheets") && INDEX.includes("window.print()")) {
  pass("preview then native browser print (no required PDF)");
} else {
  fail("print preview / window.print flow is missing");
}

if (INDEX.includes("print-draft-updated") && INDEX.includes("function getOnTapPrintUpdatedLabel")) {
  pass("LAST UPDATED stamp exists on print templates");
} else {
  fail("print templates are missing LAST UPDATED");
}

if (
  INDEX.includes("body.printing-ontap .app-shell")
  && INDEX.includes("size: 4.25in 11in")
  && INDEX.includes("letter landscape")
) {
  pass("print CSS hides chrome and sizes guest vs bar pages separately");
} else {
  fail("print page sizing / chrome hiding is incomplete");
}

if (FEATURES.toLowerCase().includes("physical") || FEATURES.includes("Guest Draft Menu")) {
  pass("App guide mentions physical print templates");
} else {
  fail("site-features.js is missing Phase 3 print copy");
}

if (failures) {
  console.error(`\n${failures} Phase 3 print check(s) failed.`);
  process.exit(1);
}
console.log("\nPhase 3 print template checks passed.");
