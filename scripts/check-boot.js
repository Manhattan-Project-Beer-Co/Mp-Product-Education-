#!/usr/bin/env node
// Starts the real server against a throwaway database and checks that it comes
// up and serves.
//
// Parsing cleanly is not the same as running. This catches the failures that a
// syntax check cannot see: a query against a column that does not exist, a
// module that throws at load, a schema statement that only fails on a fresh
// database. It exercises table creation and first-boot seeding end to end,
// because the database it points at is always empty.
//
// It also asserts that the production boot guard actually refuses to start on
// the built-in default secret — that guard is the only thing standing between a
// misconfigured deploy and forgeable session cookies.

const { spawn } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const PORT = process.env.CHECK_BOOT_PORT || "8099";
const BASE = `http://127.0.0.1:${PORT}`;
const STARTUP_TIMEOUT_MS = 60_000;
const APP_DIR = path.join(__dirname, "..");
const SERVER_JS = path.join(APP_DIR, "server.js");

let failures = 0;
const fail = (msg) => {
  failures++;
  console.error(`FAIL  ${msg}`);
};
const pass = (msg) => console.log(`PASS  ${msg}`);

function freshDbPath(label) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), `mp-check-${label}-`));
  return path.join(dir, "training.db");
}

// Started from an empty scratch directory, not the repo, so the child cannot
// read the developer's .env.
//
// Scrubbing process.env is not enough on its own. server.js calls
// dotenv.config(), which resolves .env against process.cwd() and would put back
// exactly the variables baseEnv() removed — so on any machine with a .env the
// production guard checks below saw a real JWT_SECRET, the server started
// normally, and a check that exists to prove the guard fires reported failure
// instead. CI has no .env, so it passed there and the guard went unexercised
// where it mattered. dotenv does not search parent directories, so an empty cwd
// is enough to isolate it.
//
// Safe because nothing in the app resolves paths against cwd: server.js,
// db-path.js and backup.js all use __dirname, and the one place server.js
// spawns a child passes cwd: __dirname explicitly.
function startServer(env) {
  const cwd = fs.mkdtempSync(path.join(os.tmpdir(), "mp-check-cwd-"));
  const child = spawn(process.execPath, [SERVER_JS], {
    cwd,
    env: { ...env, PORT },
    stdio: ["ignore", "pipe", "pipe"]
  });
  let output = "";
  child.stdout.on("data", (d) => (output += d));
  child.stderr.on("data", (d) => (output += d));
  return { child, getOutput: () => output };
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function waitForServer(child) {
  const deadline = Date.now() + STARTUP_TIMEOUT_MS;
  while (Date.now() < deadline) {
    if (child.exitCode !== null) return false; // Died before it ever listened.
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return true;
    } catch {
      // Not listening yet.
    }
    await sleep(500);
  }
  return false;
}

// The environment the app actually needs, minus anything inherited that would
// change behaviour (a stray NODE_ENV, a real JWT_SECRET from the runner).
function baseEnv(overrides) {
  const { NODE_ENV, JWT_SECRET, RAILWAY_ENVIRONMENT, DB_PATH, ...rest } = process.env;
  return { ...rest, ...overrides };
}

async function checkRefusesDefaultSecretInProduction() {
  const { child, getOutput } = startServer(
    baseEnv({ NODE_ENV: "production", DB_PATH: freshDbPath("guard") })
  );

  const exitCode = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(null);
    }, 20_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });

  if (exitCode === 1 && /JWT_SECRET is still the built-in default/.test(getOutput())) {
    pass("refuses to start in production while JWT_SECRET is the built-in default");
  } else {
    fail(
      `expected exit 1 with a JWT_SECRET refusal, got exit ${exitCode}.\n${getOutput().slice(0, 800)}`
    );
  }
}

// Dev sign-in bypasses Entra entirely, so the only thing making it safe to have
// in the tree is that it cannot reach a deployed host. That is a boot guard, and
// an unexercised guard is a guess.
async function checkRefusesDevLoginInProduction() {
  const { child, getOutput } = startServer(
    baseEnv({
      NODE_ENV: "production",
      JWT_SECRET: "ci-smoke-test-secret",
      DEV_LOGIN: "1",
      DB_PATH: freshDbPath("devguard")
    })
  );

  const exitCode = await new Promise((resolve) => {
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      resolve(null);
    }, 20_000);
    child.on("exit", (code) => {
      clearTimeout(timer);
      resolve(code);
    });
  });

  if (exitCode === 1 && /DEV_LOGIN=1 is set in production/.test(getOutput())) {
    pass("refuses to start in production with DEV_LOGIN=1");
  } else {
    fail(
      `expected exit 1 with a DEV_LOGIN refusal, got exit ${exitCode}.\n${getOutput().slice(0, 800)}`
    );
  }
}

async function checkBootsAndServes() {
  const dbPath = process.env.DB_PATH || freshDbPath("boot");
  const { child, getOutput } = startServer(
    baseEnv({
      JWT_SECRET: process.env.JWT_SECRET || "ci-smoke-test-secret",
      DB_PATH: dbPath
    })
  );

  try {
    if (!(await waitForServer(child))) {
      fail(`server did not serve ${BASE}/ within ${STARTUP_TIMEOUT_MS / 1000}s.\n${getOutput().slice(0, 3000)}`);
      return;
    }
    pass("server boots on an empty database and serves /");

    const providers = await fetch(`${BASE}/api/auth/providers`);
    const body = await providers.json();
    if (providers.ok && typeof body.microsoft === "boolean") {
      pass("/api/auth/providers responds with the expected shape");
    } else {
      fail(`/api/auth/providers returned ${providers.status}: ${JSON.stringify(body)}`);
    }

    // Unauthenticated callers must be refused, not served.
    const me = await fetch(`${BASE}/api/auth/me`);
    if (me.status === 401) {
      pass("/api/auth/me rejects a request with no session cookie");
    } else {
      fail(`/api/auth/me returned ${me.status}, expected 401`);
    }

    // Password authentication is gone; these must never authenticate anyone.
    // Either answer is correct: 404 because no handler exists, or 401 because
    // the /api gate refuses the anonymous caller before reaching the 404. The
    // property worth pinning is that it never succeeds — not which of the two
    // refusals happens to come first.
    // Dev sign-in is in the list because this server was booted without
    // DEV_LOGIN, which is the state every deployed host is in. It must be as
    // unreachable here as password auth is.
    for (const route of ["/api/auth/login", "/api/auth/register", "/api/auth/dev-login"]) {
      const res = await fetch(`${BASE}${route}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      if (res.status === 404 || res.status === 401) {
        pass(`${route} is gone (${res.status})`);
      } else {
        fail(`${route} returned ${res.status}; password auth was removed and must never succeed`);
      }
    }

    const devUsers = await fetch(`${BASE}/api/auth/dev-users`);
    if (devUsers.status === 404 || devUsers.status === 401) {
      pass(`/api/auth/dev-users is gone (${devUsers.status})`);
    } else {
      fail(`/api/auth/dev-users returned ${devUsers.status}; it must not exist without DEV_LOGIN=1`);
    }

    await checkApiRequiresSession();
    await checkBackupWasTaken(dbPath);
  } finally {
    child.kill("SIGKILL");
  }
}

// Every /api route must refuse an anonymous caller, except the handful the
// sign-in handshake needs. These were all open at one point — SOPs, inventory
// and the AI chat endpoint were readable by anyone who knew the URL — so they
// are worth pinning down rather than trusting to review.
async function checkApiRequiresSession() {
  const mustBeGated = [
    ["GET", "/api/sops"],
    ["GET", "/api/inventory"],
    ["GET", "/api/ops-inventory"],
    ["GET", "/api/merch"],
    ["GET", "/api/merch/ideas"],
    ["GET", "/api/reviews"],
    ["GET", "/api/chat/status"],
    ["POST", "/api/chat"],
    ["GET", "/api/games/leaderboard"],
    ["GET", "/api/admin/employees"]
  ];

  for (const [method, route] of mustBeGated) {
    const res = await fetch(`${BASE}${route}`, {
      method,
      headers: { "Content-Type": "application/json" },
      ...(method === "POST" ? { body: "{}" } : {})
    });
    if (res.status === 401) {
      pass(`${method} ${route} requires a session`);
    } else {
      fail(`${method} ${route} returned ${res.status} to an anonymous caller, expected 401`);
    }
  }

  // The sign-in handshake itself must stay reachable, or nobody can ever log in.
  const providers = await fetch(`${BASE}/api/auth/providers`);
  if (providers.ok) pass("/api/auth/providers stays public");
  else fail(`/api/auth/providers returned ${providers.status}; sign-in would be impossible`);

  // The page itself must still be served so the login screen can render.
  const page = await fetch(`${BASE}/`);
  const html = await page.text();
  if (page.ok && html.includes('id="loginGate"')) {
    pass("the app shell is served and carries the sign-in gate");
  } else {
    fail(`GET / returned ${page.status} and ${html.includes("loginGate") ? "has" : "lacks"} the sign-in gate`);
  }

  // Source files must not be served to the world.
  const source = await fetch(`${BASE}/server.js`);
  const sourceBody = await source.text();
  if (!sourceBody.includes("JWT_SECRET")) {
    pass("server source is not served as a static file");
  } else {
    fail("GET /server.js returned the server source");
  }

  // The page needs four scripts from disk, and the tempting way to serve them
  // is express.static(__dirname) — which also publishes server.js, seed.js and,
  // because DB_PATH is unset on Railway and Render, training.db and backups/.
  // That happened once already. These two checks pin both halves: the scripts
  // the login gate needs must be served, and nothing else may be.
  for (const file of ["roles.js", "site-features.js", "ops-content.js", "floor-tools.js"]) {
    const res = await fetch(`${BASE}/${file}`);
    const body = await res.text();
    // The catch-all answers unknown paths with index.html, so a 200 alone
    // proves nothing — the page would come back with the wrong content type
    // and the gate would hang, which is the bug the static revert was chasing.
    if (res.ok && !body.includes('id="loginGate"')) {
      pass(`${file} is served to the browser`);
    } else {
      fail(`GET /${file} returned ${res.status} and ${body.includes("loginGate") ? "the app shell instead of the script" : "no script body"}`);
    }
  }

  for (const file of ["package.json", "seed.js", "backup.js", "db-path.js", "training.db"]) {
    const res = await fetch(`${BASE}/${file}`);
    const body = await res.text();
    if (body.includes('id="loginGate"')) {
      pass(`/${file} is not served (falls through to the app shell)`);
    } else {
      fail(`GET /${file} returned ${res.status} and served the file rather than the app shell`);
    }
  }
}

// A backup that is never verified is a backup you do not have. This asserts the
// boot snapshot actually lands on disk, is non-empty, and is a real SQLite file
// rather than a truncated copy.
async function checkBackupWasTaken(dbPath) {
  const backupDir = path.join(path.dirname(dbPath), "backups");
  const deadline = Date.now() + 20_000;

  let files = [];
  while (Date.now() < deadline) {
    files = fs.existsSync(backupDir)
      ? fs.readdirSync(backupDir).filter((f) => /^training-\d{4}-\d{2}-\d{2}\.db$/.test(f))
      : [];
    if (files.length) break;
    await sleep(500);
  }

  if (!files.length) {
    fail(`no backup appeared in ${backupDir} within 20s of boot`);
    return;
  }
  pass(`backup written at boot (${files[0]})`);

  const backup = path.join(backupDir, files[0]);
  const size = fs.statSync(backup).size;
  const header = fs.readFileSync(backup).subarray(0, 16).toString("latin1");

  if (size > 0 && header.startsWith("SQLite format 3")) {
    pass(`backup is a valid SQLite file (${Math.round(size / 1024)} KB)`);
  } else {
    fail(`backup at ${backup} is ${size} bytes and does not carry a SQLite header`);
  }

  // Half-written snapshots must never be left behind under a usable name.
  const partials = fs.readdirSync(backupDir).filter((f) => f.endsWith(".partial"));
  if (partials.length === 0) {
    pass("no .partial files left behind");
  } else {
    fail(`leftover partial backup(s): ${partials.join(", ")}`);
  }
}

(async () => {
  await checkRefusesDefaultSecretInProduction();
  await checkRefusesDevLoginInProduction();
  await checkBootsAndServes();

  if (failures) {
    console.error(`\n${failures} boot check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll boot checks passed.");
})();
