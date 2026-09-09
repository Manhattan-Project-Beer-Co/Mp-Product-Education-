#!/usr/bin/env node
// Phase 4: training actually trains. Skill keys stay stable.

const fs = require("fs");
const path = require("path");
const { computeTrainingProgress, TRAINING_LESSONS, TRAINING_SKILL_META } = require("../training.js");
const { FIRST_FIVE } = require("../floor-ops-api.js");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`PASS  ${msg}`);

const expectedTitles = [
  "Foundations + Flow",
  "Floor + Bar Readiness",
  "Service Systems",
  "Bar + Order Execution",
  "Ownership + Checkout"
];
expectedTitles.forEach((title, i) => {
  if (!String(FIRST_FIVE[i]?.title || "").includes(title)) fail(`shift ${i + 1} title missing ${title}`);
});
if (expectedTitles.every((title, i) => String(FIRST_FIVE[i]?.title || "").includes(title))) {
  pass("five-shift titles match the head trainer plan");
}

const keys = FIRST_FIVE.flatMap((block) => block.skills);
const unique = new Set(keys);
if (unique.size !== keys.length) fail("duplicate skill keys in FIRST_FIVE");
else pass("skill keys remain unique");

["login_portal", "find_on_tap", "allergy_confirm", "checklist_run", "trainer_signoff"].forEach((key) => {
  if (!keys.includes(key)) fail(`legacy skill key ${key} was removed`);
});
if (["login_portal", "find_on_tap", "allergy_confirm", "checklist_run", "trainer_signoff"].every((key) => keys.includes(key))) {
  pass("existing first-five skill keys are preserved");
}

const gold = TRAINING_LESSONS.find_on_tap;
if (gold?.learn && gold.practice && gold.prove && gold.reference?.beer === "Gold Flash") {
  pass("Gold Flash is a LEARN / PRACTICE / PROVE lesson with a beer deep link");
} else {
  fail("find_on_tap is not a real lesson");
}

const dumpTabs = Object.entries(TRAINING_LESSONS).filter(([, lesson]) => {
  const ref = lesson.reference || {};
  return ref.tab && !ref.beer && !ref.food && !ref.sopTitle && !ref.checklist && !ref.floor && !ref.drinks && !ref.stay
    && ["ontap", "food", "floor"].includes(ref.tab)
    && !lesson.practice;
});
if (dumpTabs.length) fail(`lessons that only dump to a tab: ${dumpTabs.map(([k]) => k).join(", ")}`);
else pass("lessons teach apply-the-information, not just open a tab");

const verified = computeTrainingProgress(FIRST_FIVE, [
  { shift_number: 1, skill_key: "login_portal", demonstrated: 1, status: "verified" }
]);
if (verified.doneKeys.has("1:login_portal") && verified.unlockedShift === 1) {
  pass("verified rows still count toward the path");
} else {
  fail("computeTrainingProgress dropped verified sign-offs");
}

const TRAINING = fs.readFileSync(path.join(__dirname, "..", "training.js"), "utf8");
if (TRAINING.includes("Your shift at MP") && TRAINING.includes("Clock in") && TRAINING.includes("Rush")) {
  pass("Day in the Life timeline exists");
} else {
  fail("Day in the Life is missing");
}
if (TRAINING.includes("Scan") && TRAINING.includes("Prioritize") && TRAINING.includes("Never walk empty-handed")) {
  pass("service loop + why this matters exist");
} else {
  fail("service loop copy is incomplete");
}
if (TRAINING.includes("showTrainerMode") && TRAINING.includes("handoffStrength") && TRAINING.includes("/api/first-five/roster")) {
  pass("trainer mode and handoff are wired");
} else {
  fail("trainer mode / handoff missing");
}

const API = fs.readFileSync(path.join(__dirname, "..", "floor-ops-api.js"), "utf8");
if (API.includes("training_handoffs") && API.includes("Ask your trainer to verify")) {
  pass("verify is trainer-gated; handoff table exists");
} else {
  fail("first-five API is missing trainer gating or handoffs");
}

if (!TRAINING_SKILL_META.find_on_tap) fail("TRAINING_SKILL_META missing find_on_tap");
else pass("skill meta still keyed for the dashboard");

if (failures) {
  console.error(`\n${failures} Phase 4 training check(s) failed.`);
  process.exit(1);
}
console.log("\nPhase 4 training checks passed.");
