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

function startServer(env) {
  const child = spawn(process.execPath, ["server.js"], {
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

async function checkBootsAndServes() {
  const { child, getOutput } = startServer(
    baseEnv({
      JWT_SECRET: process.env.JWT_SECRET || "ci-smoke-test-secret",
      DB_PATH: process.env.DB_PATH || freshDbPath("boot")
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

    // Password authentication is gone; these must not answer.
    for (const route of ["/api/auth/login", "/api/auth/register"]) {
      const res = await fetch(`${BASE}${route}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}"
      });
      if (res.status === 404) {
        pass(`${route} is gone`);
      } else {
        fail(`${route} returned ${res.status}, expected 404 — password auth was removed`);
      }
    }
  } finally {
    child.kill("SIGKILL");
  }
}

(async () => {
  await checkRefusesDefaultSecretInProduction();
  await checkBootsAndServes();

  if (failures) {
    console.error(`\n${failures} boot check(s) failed.`);
    process.exit(1);
  }
  console.log("\nAll boot checks passed.");
})();
