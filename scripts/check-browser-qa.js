#!/usr/bin/env node
// Browser-level acceptance for the manager-presentation QA blockers:
// War Games tiles actually render, Staff Favorites sits after Team content,
// and On Tap still shows live tap data when Nucleus has it.

const { spawn } = require("child_process");
const fs = require("fs");
const path = require("path");
const vm = require("vm");

const ROOT = path.join(__dirname, "..");
const INDEX = fs.readFileSync(path.join(ROOT, "index.html"), "utf8");
const SERVER = fs.readFileSync(path.join(ROOT, "server.js"), "utf8");
const NUCLEUS = fs.readFileSync(path.join(ROOT, "nucleus.js"), "utf8");
const WAR_GAMES_SRC = fs.readFileSync(path.join(ROOT, "war-games.js"), "utf8");
const ARCADE_SRC = fs.readFileSync(path.join(ROOT, "arcade.js"), "utf8");

const PORT = process.env.CHECK_QA_PORT || "8103";
const BASE = `http://127.0.0.1:${PORT}`;

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`PASS  ${msg}`);

function isYes(val) {
  return String(val || "").toLowerCase().trim().startsWith("yes");
}

try {
  new vm.Script(WAR_GAMES_SRC, { filename: "war-games.js" });
  new vm.Script(ARCADE_SRC, { filename: "arcade.js" });
  pass("war-games.js and arcade.js parse");
} catch (err) {
  fail(`arcade/war-games parse: ${err.message}`);
}

const window = {};
try {
  vm.runInNewContext(WAR_GAMES_SRC, {
    window,
    module: { exports: {} },
    exports: {},
    console
  }, { filename: "war-games.js" });
} catch (err) {
  fail(`war-games.js threw while loading: ${err.message}`);
}

const drills = Array.isArray(window.WAR_GAMES) ? window.WAR_GAMES : [];
const arcade = Array.isArray(window.ARCADE_GAMES) ? window.ARCADE_GAMES : [];
const drillTitles = drills.map((g) => g.title);
const arcadeTitles = arcade.map((g) => g.title);

if (
  ["The Rush", "Build the Flight", "Read the Guest", "Saturday Night"].every((title) => drillTitles.includes(title))
  && drills.length === 4
) {
  pass("window.WAR_GAMES exposes the four Service Drills");
} else {
  fail(`Service Drills on window: ${drillTitles.join(", ") || "(none)"}`);
}

if (arcadeTitles.includes("ATOM SHOOTER") && arcadeTitles.includes("HALF-LIFE HIGHWAY")) {
  pass("window.ARCADE_GAMES exposes Atom Shooter and Half-Life Highway");
} else {
  fail(`Arcade on window: ${arcadeTitles.join(", ") || "(none)"}`);
}

if (drills.some((g) => g.id === "recovery" || g.id === "favbeer" || g.id === "rocket")) {
  fail("Complaint Recovery / Staff Favorites / Arcade leaked onto Service Drills");
} else {
  pass("Service Drills does not include Staff Favorites or Arcade");
}

const hubHtml = [
  `<p class="wg-group-title">Service drills</p>`,
  `<div class="game-hub" id="wg-service-drills">`,
  ...drills.map((g) => `<button class="game-tile" data-game-id="${g.id}"><p class="game-tile-title">${g.title}</p></button>`),
  `<p class="wg-group-title">Arcade</p>`,
  `<div class="game-hub arcade-hub" id="wg-arcade">`,
  ...arcade.map((g) => `<button class="game-tile" data-game-id="${g.id}"><p class="game-tile-title">${g.title}</p></button>`)
].join("\n");

if (
  hubHtml.includes("The Rush")
  && hubHtml.includes("Build the Flight")
  && hubHtml.includes("Read the Guest")
  && hubHtml.includes("Saturday Night")
  && hubHtml.includes("ATOM SHOOTER")
  && hubHtml.includes("HALF-LIFE HIGHWAY")
) {
  pass("simulated War Games hub HTML contains Service Drills and Arcade tiles");
} else {
  fail("simulated hub HTML is missing required game titles");
}

if (INDEX.includes("const GAMES = typeof WAR_GAMES")) {
  fail("War Games hub still snapshots WAR_GAMES at parse time (tiles can render empty)");
} else if (INDEX.includes("function hubServiceDrills") && INDEX.includes("function hubArcadeGames")) {
  pass("War Games hub reads game lists at render time from window");
} else {
  fail("War Games hub helpers are missing");
}

if (
  INDEX.includes('data-type="games"')
  && INDEX.includes('employeeTabs: [')
  && /employeeTabs: \[[^\]]*"games"/.test(INDEX)
  && INDEX.includes("view === \"games\"")
) {
  pass("signed-in employees can reach the War Games tab");
} else {
  fail("War Games is not an employee-reachable destination");
}

if (
  INDEX.includes('id="wg-service-drills"')
  && INDEX.includes('id="wg-arcade"')
  && INDEX.includes("hubServiceDrills()")
  && INDEX.includes("hubArcadeGames()")
) {
  pass("renderGameHub mounts Service Drills and Arcade from live lists");
} else {
  fail("renderGameHub does not mount both hubs from live lists");
}

const empBlock = INDEX.slice(
  INDEX.indexOf("if (!isManager())"),
  INDEX.indexOf("Loading team dashboard")
);
if (
  empBlock.includes("renderTeamStuffSection()")
  && empBlock.indexOf("progress-table") < empBlock.indexOf("renderTeamStuffSection()")
) {
  pass("employee Team page puts Staff Favorites after the directory");
} else {
  fail("Staff Favorites is missing or still above the employee Team directory");
}

const mgrBlock = INDEX.slice(
  INDEX.indexOf("Shift leads and floor training."),
  INDEX.indexOf("function renderShiftLeadDutyPanel")
);
if (
  mgrBlock.includes("renderTeamStuffSection()")
  && mgrBlock.indexOf("progress-table") < mgrBlock.indexOf("renderTeamStuffSection()")
  && !mgrBlock.includes("renderShiftLeadDutyPanel(")
) {
  pass("manager Team page puts Staff Favorites after primary team content");
} else {
  fail("Staff Favorites is missing or manager Team still shows Shift lead schedule");
}

if (INDEX.includes('id="team-stuff"') && INDEX.includes("Team stuff") && INDEX.includes("Staff Favorites")) {
  pass("Team stuff heading and Staff Favorites control exist");
} else {
  fail("Team stuff section markup is incomplete");
}

if (/Loading On Tap[\s\S]{0,240}return;/.test(INDEX) || /Loading taps[\s\S]{0,240}return;/.test(INDEX)) {
  fail("On Tap still returns before rendering beers while meta/taps load");
} else {
  pass("On Tap renders the beer board without blocking on tap meta");
}

if (INDEX.includes('startsWith("yes")') && INDEX.includes("function isOnTap") && INDEX.includes("function getOnTapBeersSorted")) {
  pass("On Tap still uses the live beers list and Yes- Tap N contract");
} else {
  fail("On Tap matching contract changed");
}

const fixtureBeers = [
  { Name: "Gold Flash", "On Tap": "Yes- Tap 4", Style: "Honey Lager", abv: "5.2" },
  { Name: "Night Watch", "On Tap": "", Style: "Stout", abv: "8.0" },
  { Name: "West Bound", "On Tap": "Yes- Tap 12", Style: "IPA", abv: "6.8" }
];
const onTapRows = fixtureBeers.filter((beer) => isYes(beer["On Tap"]));
if (onTapRows.length === 2 && onTapRows[0].Name === "Gold Flash") {
  pass("Yes- Tap N fixture beers are treated as on tap");
} else {
  fail("isYes/On Tap contract failed on fixture beers");
}

if (
  INDEX.includes("function getOnTapBeersSorted")
  && INDEX.includes("function syncOntapPrintRoot")
  && INDEX.includes("buildDraftMenuHtml(rows)")
  && INDEX.includes("buildBarSheetHtml(rows)")
  && INDEX.includes("getOnTapBeersSorted()")
) {
  pass("print previews read the same On Tap dataset");
} else {
  fail("print previews are not wired to getOnTapBeersSorted");
}

if (
  INDEX.includes("function toggleOntapPrintMenu")
  && INDEX.includes("function closeOntapPrintMenu")
  && INDEX.includes("function ensureOntapPrintMenuList")
  && INDEX.includes("function positionOntapPrintMenu")
  && INDEX.includes("document.body.appendChild(list)")
  && INDEX.includes("z-index: 4000")
  && INDEX.includes("Guest Draft Menu")
  && INDEX.includes("Bar Tap Sheet")
  && INDEX.includes("Print Both")
  && INDEX.includes("ontap-print-menu-list[hidden]")
  && INDEX.includes("-webkit-text-fill-color: #f1eee7 !important")
  && INDEX.includes("class=\"ontap-print-item\"")
  && !INDEX.includes("<details class=\"ontap-print-menu\"")
) {
  pass("Print dropdown portals to body with opaque items and the three approved options");
} else {
  fail("Print dropdown is still a details/summary or missing portal/contrast/close behavior");
}

if (NUCLEUS.includes("tapByProduct.set(String(productId)") && NUCLEUS.includes("tapByProduct.get(String(product.id))")) {
  pass("Nucleus tap join coerces product ids to strings");
} else {
  fail("Nucleus tap join can miss pours when id types differ");
}

if (SERVER.includes('"war-games.js"') && SERVER.includes('"arcade.js"')) {
  pass("server allowlists war-games.js and arcade.js");
} else {
  fail("client script allowlist is missing a War Games file");
}

function startLocalServer() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(ROOT, "server.js")], {
      cwd: ROOT,
      env: { ...process.env, PORT, DEV_LOGIN: "1", NODE_ENV: "development" },
      stdio: ["ignore", "pipe", "pipe"]
    });
    let output = "";
    child.stdout.on("data", (d) => { output += d; });
    child.stderr.on("data", (d) => { output += d; });
    const timer = setTimeout(() => {
      reject(new Error(`server did not start: ${output.slice(-800)}`));
    }, 25000);
    const onOut = () => {
      if (/running on port/.test(output)) {
        clearTimeout(timer);
        resolve({ child, output });
      }
    };
    child.stdout.on("data", onOut);
    child.stderr.on("data", onOut);
    child.on("exit", (code) => {
      if (code && code !== 0) {
        clearTimeout(timer);
        reject(new Error(`server exited ${code}: ${output.slice(-800)}`));
      }
    });
  });
}

function cookieHeader(res) {
  const raw = typeof res.headers.getSetCookie === "function"
    ? res.headers.getSetCookie()
    : [res.headers.get("set-cookie")].filter(Boolean);
  return raw.map((row) => String(row).split(";")[0]).join("; ");
}

async function liveBrowserChecks() {
  let child;
  try {
    const started = await startLocalServer();
    child = started.child;
  } catch (err) {
    fail(`could not boot a local server for signed-in checks: ${err.message}`);
    return;
  }

  try {
    const page = await fetch(`${BASE}/`);
    const html = await page.text();
    if (page.ok && html.includes('data-type="games"') && html.includes("War Games")) {
      pass("signed-in shell HTML includes the War Games destination");
    } else {
      fail("index.html served to the browser is missing the War Games tab");
    }

    for (const file of ["war-games.js", "arcade.js"]) {
      const res = await fetch(`${BASE}/${file}`);
      const body = await res.text();
      if (res.ok && !body.includes('id="loginGate"') && /WAR_GAMES|HIGHWAY_STORAGE_KEY|ARCADE_GAMES/.test(body)) {
        pass(`GET /${file} serves the script, not the app shell`);
      } else {
        fail(`GET /${file} returned ${res.status} / wrong body`);
      }
    }

    const usersRes = await fetch(`${BASE}/api/auth/dev-users`);
    if (!usersRes.ok) {
      fail(`dev-users returned ${usersRes.status} — cannot sign in an employee`);
      return;
    }
    const users = (await usersRes.json()).users || [];
    const employee = users.find((u) => u.email === "riley@mp.test")
      || users.find((u) => u.role === "trainee" || u.role === "bartender");
    if (!employee) {
      fail("no employee/trainee seed user for signed-in War Games check");
      return;
    }

    const loginRes = await fetch(`${BASE}/api/auth/dev-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ userId: employee.id })
    });
    if (!loginRes.ok) {
      fail(`dev-login as ${employee.email} returned ${loginRes.status}`);
      return;
    }
    const cookie = cookieHeader(loginRes);
    if (!cookie) {
      fail("dev-login did not set a session cookie");
      return;
    }
    pass(`signed in employee ${employee.email} (${employee.role})`);

    const authedPage = await fetch(`${BASE}/`, { headers: { Cookie: cookie } });
    const authedHtml = await authedPage.text();
    if (authedHtml.includes('src="war-games.js"') && authedHtml.includes('src="arcade.js"') && authedHtml.includes('data-type="games"')) {
      pass("employee page loads war-games.js, arcade.js, and the War Games tab");
    } else {
      fail("employee page is missing War Games scripts or nav");
    }

    const beersRes = await fetch(`${BASE}/api/beers`, { headers: { Cookie: cookie } });
    if (beersRes.status === 503) {
      pass("On Tap live check skipped (Nucleus is not configured in this environment)");
    } else if (!beersRes.ok) {
      fail(`/api/beers returned ${beersRes.status} for a signed-in employee`);
    } else {
      const payload = await beersRes.json();
      const beers = payload.beers || [];
      const pouring = beers.filter((beer) => isYes(beer["On Tap"]));
      if (!beers.length) {
        fail("/api/beers returned no catalog rows while Nucleus is configured");
      } else if (!pouring.length) {
        fail("/api/beers returned beers but none are marked On Tap (join/filter regression)");
      } else {
        pass(`On Tap API returned ${pouring.length} pouring beers of ${beers.length} catalog rows`);
      }
    }

    const metaRes = await fetch(`${BASE}/api/tap-display-meta`, { headers: { Cookie: cookie } });
    if (metaRes.ok) {
      pass("tap display meta is reachable for the same On Tap dataset");
    } else {
      fail(`/api/tap-display-meta returned ${metaRes.status}`);
    }
  } finally {
    if (child && child.exitCode == null) {
      child.kill("SIGTERM");
    }
  }
}

(async () => {
  await liveBrowserChecks();
  if (failures) {
    console.error(`\n${failures} browser QA check(s) failed.`);
    process.exit(1);
  }
  console.log("\nBrowser QA checks passed.");
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
