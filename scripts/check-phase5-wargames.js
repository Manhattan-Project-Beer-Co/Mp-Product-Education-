#!/usr/bin/env node
// Phase 5: War Games teach judgment, not trivia matching.

const fs = require("fs");
const path = require("path");
const vm = require("vm");
const {
  WAR_GAMES,
  FEATURED_GAME_IDS,
  TRIVIA_GAME_IDS,
  FLIGHT_PROMPT,
  RUSH_NODES,
  SATURDAY_PROBLEMS,
  tagBeer,
  scoreFlight,
  scoreReadGuestBeer
} = require("../war-games.js");
const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const FEATURES = fs.readFileSync(path.join(ROOT, "site-features.js"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const TRAINING = fs.readFileSync(path.join(ROOT, "training.js"), "utf8");
const CHAT = fs.readFileSync(path.join(ROOT, "chat-knowledge.js"), "utf8");
const WG = fs.readFileSync(path.join(ROOT, "war-games.js"), "utf8");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`PASS  ${msg}`);

try {
  new vm.Script(WG, { filename: "war-games.js" });
  pass("war-games.js parses");
} catch (err) {
  fail(`war-games.js parse: ${err.message}`);
}

const hubIds = WAR_GAMES.map((g) => g.id);
if (FEATURED_GAME_IDS.every((id) => hubIds.includes(id)) && hubIds.length >= 4 && hubIds.length <= 5) {
  pass("hub is 4–5 featured games");
} else {
  fail(`hub ids are ${hubIds.join(", ")}`);
}

["rush", "flight", "readguest", "saturday"].forEach((id) => {
  if (!hubIds.includes(id)) fail(`featured game "${id}" is missing from the hub`);
});
if (["rush", "flight", "readguest", "saturday"].every((id) => hubIds.includes(id))) {
  pass("The Rush, Build the Flight, Read the Guest, and Saturday Night are on the hub");
}

const triviaOnHub = hubIds.filter((id) => TRIVIA_GAME_IDS.includes(id));
if (triviaOnHub.length) fail(`trivia still on the hub: ${triviaOnHub.join(", ")}`);
else pass("matching trivia is off the hub");

if (INDEX.includes("function hubServiceDrills") && INDEX.includes("function hubArcadeGames") && INDEX.includes("startJudgmentGame") && INDEX.includes("renderJudgmentGame")) {
  pass("index.html wires the judgment engine at render time");
} else {
  fail("index.html is not wired to war-games.js");
}

["Tap Match", "Flavor Quiz", "ABV Challenge", "Style Match", "Pick the Profile", "Speed Round"].forEach((title) => {
  if (WAR_GAMES.some((g) => g.title === title)) fail(`trivia title "${title}" is still a hub tile`);
});
if (!WAR_GAMES.some((g) => /Quiz|Match|Challenge|Flashcards|Launch Pad/.test(g.title) && g.id !== "favbeer")) {
  pass("hub titles are judgment drills, not matching trivia");
} else {
  fail("a trivia-shaped title is still on the hub");
}

const gold = { Name: "Gold Flash", Style: "Honey Lager", "Flavor Profile": "light honey malt" };
const sour = { Name: "Berry Sour", Style: "Fruited Sour", "Flavor Profile": "tart raspberry" };
const ipa = { Name: "West Bound", Style: "West Coast IPA", "Flavor Profile": "bitter pine hops" };
const stout = { Name: "Night Watch", Style: "Nitro Stout", "Flavor Profile": "coffee roast" };
const hazy = { Name: "Juice Box", Style: "Hazy IPA", "Flavor Profile": "juicy citrus hops" };
const taps = [gold, sour, ipa, stout, hazy];

if (tagBeer(gold).light && tagBeer(gold).modelo && tagBeer(sour).sour && tagBeer(ipa).bitter) {
  pass("beer tags know lager / sour / bitter");
} else {
  fail("tagBeer missed Gold Flash, sour, or West Coast");
}

const goodFlight = scoreFlight([gold, sour, hazy, stout], taps);
if (goodFlight.quality === "strong" && goodFlight.workOn.length === 0 && /light/i.test(goodFlight.strong.join(" "))) {
  pass("a mixed light+sour flight is a strong answer");
} else {
  fail(`mixed flight scored ${goodFlight.quality}: ${JSON.stringify(goodFlight)}`);
}

const hoppyFlight = scoreFlight([ipa, ipa, hazy, { Name: "Another IPA", Style: "IPA", "Flavor Profile": "hoppy" }], taps);
if (hoppyFlight.quality === "weak" && hoppyFlight.workOn.some((line) => /hoppy|light|sour/i.test(line))) {
  pass("four hoppy beers is not a reasonable flight for this couple");
} else {
  fail(`hoppy flight scored ${hoppyFlight.quality}: ${JSON.stringify(hoppyFlight)}`);
}

if (/light beer/i.test(FLIGHT_PROMPT.scene) && /sour/i.test(FLIGHT_PROMPT.scene) && /getOnTapBeersSorted/.test(WG)) {
  pass("Build the Flight uses the guest prompt and the live On Tap list");
} else {
  fail("Build the Flight is not wired to current taps / the guest brief");
}

const modeloPick = scoreReadGuestBeer(gold, "modelo");
const bitterIpa = scoreReadGuestBeer(ipa, "bitter");
if (modeloPick.quality === "strong" && bitterIpa.quality === "weak") {
  pass("Read the Guest rewards a Modelo bridge and punishes bitter after they said no");
} else {
  fail(`Read the Guest scoring: modelo=${modeloPick.quality} bitter-ipa=${bitterIpa.quality}`);
}

const startStrong = (RUSH_NODES.start?.options || []).filter((opt) => opt.quality === "strong");
if (startStrong.length >= 2 && /7:30/.test(RUSH_NODES.start.setup) && RUSH_NODES["after-window"] && RUSH_NODES["close-lap"]) {
  pass("The Rush is an evolving 7:30 scenario with more than one strong first move");
} else {
  fail("The Rush is still a single rigid answer or does not evolve");
}

const saturdayIds = SATURDAY_PROBLEMS.map((p) => p.id);
if (["window", "allergen", "slow-ticket", "checkout"].every((id) => saturdayIds.includes(id))) {
  pass("Saturday Night covers window, allergen, slow ticket, and checkout");
} else {
  fail(`Saturday Night problems: ${saturdayIds.join(", ")}`);
}

if (WG.includes("renderCoachingCard") && WG.includes("Work on") && WG.includes("openWarGameTraining") && !/7\/10/.test(WG)) {
  pass("debriefs are Strong / Work on + training links, not a 7/10 scoreboard");
} else {
  fail("Saturday Night / Rush debrief is still scoreboard-shaped");
}

if (TRAINING.includes('game: "saturday"') && TRAINING.includes("openTrainingSkill") && TRAINING.includes("Play The Rush")) {
  pass("Training deep-links into Saturday Night and mentions The Rush");
} else {
  fail("Training does not connect to the new War Games");
}

if (
  ["The Rush", "Build the Flight", "Read the Guest", "Saturday Night"].every((name) => CHAT.includes(`name: "${name}"`))
  && !CHAT.includes('name: "Tap Match"')
) {
  pass("Ask MP lists the judgment drills, not Tap Match trivia");
} else {
  fail("Ask MP training-games list still looks like the trivia hub");
}

if (FEATURES.includes("The Rush") && FEATURES.includes("Trivia matching is retired")) {
  pass("App guide describes the rebuilt War Games hub");
} else {
  fail("App guide still describes arcade trivia as War Games");
}

if (SERVER.includes('"war-games.js"') && INDEX.includes('src="war-games.js"')) {
  pass("war-games.js is on the client script allowlist");
} else {
  fail("war-games.js is not served to the browser");
}

if (INDEX.includes("startGame('recovery')") && INDEX.includes("case \"recovery\"")) {
  pass("Complaint Recovery remains playable for trainers");
} else {
  fail("Complaint Recovery was deleted instead of moved off the hub");
}

if (failures) {
  console.error(`\n${failures} Phase 5 War Games check(s) failed.`);
  process.exit(1);
}
console.log("\nPhase 5 War Games checks passed.");
