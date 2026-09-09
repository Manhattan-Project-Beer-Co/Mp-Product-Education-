#!/usr/bin/env node
// Arcade games stay recreational: on the War Games hub, not in training analytics.

const fs = require("fs");
const path = require("path");
const { WAR_GAMES, FEATURED_GAME_IDS, ARCADE_GAMES } = require("../war-games.js");
const arcade = require("../arcade.js");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const UI = fs.readFileSync(path.join(ROOT, "ui.js"), "utf8");
const FEATURES = fs.readFileSync(path.join(ROOT, "site-features.js"), "utf8");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`PASS  ${msg}`);

const hubIds = WAR_GAMES.map((g) => g.id);
if (hubIds.length === 4 && ["rush", "flight", "readguest", "saturday"].every((id) => hubIds.includes(id))) {
  pass("Service Drills hub is the four judgment games");
} else {
  fail(`Service Drills hub is ${hubIds.join(", ")}`);
}

if (!hubIds.includes("favbeer") && !hubIds.includes("rocket") && !hubIds.includes("highway")) {
  pass("Staff Favorites and Arcade games are off the Service Drills hub");
} else {
  fail("a recreational game is still a primary War Games tile");
}

const arcadeIds = (ARCADE_GAMES || []).map((g) => g.id);
if (arcadeIds.includes("rocket") && arcadeIds.includes("highway")) {
  pass("Arcade lists ATOM SHOOTER and HALF-LIFE HIGHWAY");
} else {
  fail(`Arcade ids: ${arcadeIds.join(", ")}`);
}

if (
  INDEX.includes("Service drills")
  && INDEX.includes("Arcade")
  && INDEX.includes("hubArcadeGames")
  && INDEX.includes("id=\"wg-arcade\"")
  && INDEX.includes("id=\"wg-service-drills\"")
) {
  pass("War Games hub renders Service Drills and Arcade");
} else {
  fail("War Games hub is missing Arcade grouping");
}

if (INDEX.includes("renderTeamStuffSection") && INDEX.includes("openStaffFavoritesFromTeam") && INDEX.includes("Staff Favorites")) {
  pass("Staff Favorites lives on Team");
} else {
  fail("Staff Favorites was not moved to Team");
}

if (INDEX.includes("gameSession.arcade = true") && INDEX.includes('gameSession.id !== "rocket"')) {
  pass("ATOM SHOOTER does not write training analytics");
} else {
  fail("rocket still records as training progress");
}

if (
  arcade.HIGHWAY_STORAGE_KEY === "mp-arcade-highway-high"
  && INDEX.includes("renderHighwayGame")
  && INDEX.includes("stopHighwayLoop")
  && !INDEX.includes("recordProgress('highway'")
) {
  pass("Half-Life Highway uses device-local scores");
} else {
  fail("highway scores are not device-local");
}

const ARCADE = fs.readFileSync(path.join(ROOT, "arcade.js"), "utf8");
if (
  ARCADE.includes("function syncHighwayOverlay")
  && ARCADE.includes('overlay.dataset.state = "over"')
  && ARCADE.includes('overlay.dataset.state = "paused"')
  && ARCADE.includes("s.paused = false")
  && INDEX.includes("highway-overlay[hidden]")
  && INDEX.includes("display: none !important")
) {
  pass("Pause and Game Over are mutually exclusive overlays");
} else {
  fail("Highway overlay states can still stack");
}

if (
  ARCADE.includes("function drawHighwayCan")
  && ARCADE.includes("HALF-LIFE")
  && ARCADE.includes("function nudgeHighwayLane")
  && ARCADE.includes("event.repeat")
  && ARCADE.includes("HIGHWAY_STEER_LOCK_MS")
  && ARCADE.includes("onclick=\"nudgeHighwayLane(-1)\"")
  && ARCADE.includes("function drawHighwayHazard")
  && ARCADE.includes("function drawHighwayAtom")
  && ARCADE.includes("Boost active")
  && ["keg", "tray", "cone", "spill", "box"].every((kind) => ARCADE.includes(`"${kind}"`))
) {
  pass("Highway uses a Half-Life can, one-lane nudges, and taproom obstacles");
} else {
  fail("Highway is missing discrete lanes, the beer can, or taproom obstacles");
}

if (INDEX.includes("Meredith McCain + Tanner Ruminer") && INDEX.includes("app-credit") && !INDEX.includes("Created by")) {
  pass("creator credit is App Guide metadata only");
} else {
  fail("creator credit still appears as Created by chrome");
}

if (INDEX.includes("reportLaunchPadIssue") && INDEX.includes("app_issue") && INDEX.includes("Report a Launch Pad issue")) {
  pass("App Guide routes issues into Feedback with App issue preselected");
} else {
  fail("Launch Pad issue report is missing");
}

if (INDEX.includes('src="arcade.js"') && SERVER.includes('"arcade.js"')) {
  pass("arcade.js is on the client script allowlist");
} else {
  fail("arcade.js is not served to the browser");
}

if (FEATURES.includes("ATOM SHOOTER") && FEATURES.includes("Half-Life Highway")) {
  pass("App guide mentions Arcade");
} else {
  fail("App guide does not mention Arcade");
}

if (INDEX.includes("edit-form-heading") && INDEX.includes("tap-entry") && UI.includes("You're caught up.")) {
  pass("form grouping, mobile tap entries, and empty-state copy exist");
} else {
  fail("polish helpers are missing from the shell");
}

if (failures) {
  console.error(`\n${failures} arcade / final polish check(s) failed.`);
  process.exit(1);
}
console.log("\nArcade and final polish checks passed.");
