require("dotenv").config();

const crypto = require("crypto");
const fs = require("fs");
const express = require("express");
const path = require("path");
const jwt = require("jsonwebtoken");
const Database = require("better-sqlite3");
const { DB_PATH } = require("./db-path");
const { startBackupSchedule } = require("./backup");
const { buildContext, localAnswer, getBeers, universalSearch } = require("./chat-knowledge");
const nucleus = require("./nucleus");
const { NucleusError } = nucleus;
const { registerFloorOpsApi } = require("./floor-ops-api");
const { registerPortalPolishApi } = require("./portal-polish-api");
const { TROUBLESHOOTING, GUEST_SCENARIOS, COMPLAINT_SCENARIOS } = require("./ops-content");
const {
  buildLocalSummary,
  buildAISummary,
  fetchGoogleReviews,
  fetchYelpReviews,
  getLiveSyncStatus
} = require("./reviews");
const { MERCH_CATALOG } = require("./merch-catalog");
const { registerMpInventory } = require("./mp-inventory-api");
const { SOPS_CATALOG, SOPS_RETIRED_TITLES } = require("./sops-catalog");
const { CHECKLISTS, getChecklistById, listChecklists } = require("./checklists-data");
const sevenShifts = require("./seven-shifts");
const {
  ensureTables: ensureSevenShiftsTables,
  syncSevenShifts,
  getUserShiftContext,
  getWorkingStaff,
  localDateKey
} = require("./seven-shifts-sync");
const {
  ROLES,
  ALL_ROLES,
  normalizeRole,
  parseExtraRoles,
  serializeExtraRoles,
  roleLabel,
  hasRole,
  canManageTeam,
  canManageApprovedEmails,
  canManageMerch,
  canManageOpsInventory,
  canViewShiftReports,
  canSubmitShiftSurvey,
  receivesDailyBriefing,
  isFloorStaffForTraining,
  canManageSops,
  canManageSiteFeedback,
  canRefreshReviews,
  buildPermissions
} = require("./roles");

const app = express();
const PORT = process.env.PORT || 8080;
const DEFAULT_JWT_SECRET = "mp-training-dev-secret-change-in-production";
const JWT_SECRET = process.env.JWT_SECRET || DEFAULT_JWT_SECRET;
// Railway sets RAILWAY_ENVIRONMENT on every deploy; NODE_ENV covers other hosts.
const IS_PRODUCTION = process.env.NODE_ENV === "production" || Boolean(process.env.RAILWAY_ENVIRONMENT);
const SESSION_COOKIE = "mp_session";
const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;
const OPENAI_API_KEY = process.env.OPENAI_API_KEY || "";
const OPENAI_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const APP_BASE_URL = (process.env.APP_BASE_URL || `http://localhost:${PORT}`).replace(/\/$/, "");
const AZURE_CLIENT_ID = process.env.AZURE_CLIENT_ID || "";
const AZURE_CLIENT_SECRET = process.env.AZURE_CLIENT_SECRET || "";
const AZURE_TENANT_ID = process.env.AZURE_TENANT_ID || "organizations";
const AZURE_REDIRECT_URI = process.env.AZURE_REDIRECT_URI || `${APP_BASE_URL}/api/auth/microsoft/callback`;
const AZURE_ADMIN_EMAILS = new Set(
  (process.env.AZURE_ADMIN_EMAILS || "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
);
// Staff sign-in is limited to this email domain (Microsoft path). Local
// DEV_LOGIN seed accounts are exempt so developers can still use @mp.test users.
const ALLOWED_EMAIL_DOMAIN = String(process.env.ALLOWED_EMAIL_DOMAIN || "manhattanproject.beer")
  .trim()
  .toLowerCase()
  .replace(/^@/, "");
const microsoftAuthEnabled = Boolean(AZURE_CLIENT_ID && AZURE_CLIENT_SECRET);
// Local development sign-in, so the portal can be run without registering an
// Entra app. Deliberately NOT inferred from "Microsoft is unconfigured" — that
// is exactly how a review host ends up publicly reachable with a known
// password. It has to be asked for by name, and it cannot reach production:
// the boot guard below refuses to start rather than letting it slip through a
// deploy, and every request is re-checked against the loopback interface.
const devLoginEnabled = process.env.DEV_LOGIN === "1";
const ALLOWED_APPROVED_ROLES = new Set(ALL_ROLES);

// JWT_SECRET signs the session cookie, which is the whole of authentication.
// Booting in production on the built-in default would accept forged sessions
// from anyone who has read this file.
if (IS_PRODUCTION && JWT_SECRET === DEFAULT_JWT_SECRET) {
  console.error(
    "Refusing to start: JWT_SECRET is still the built-in default in production. " +
      'Set a real one (node -e "console.log(require(\'crypto\').randomBytes(48).toString(\'base64url\'))").'
  );
  process.exit(1);
}

// Same posture as the JWT_SECRET guard: fail the deploy loudly rather than
// serve with a way in that bypasses Entra. A misconfigured environment variable
// should cost a failed deploy, not an open door nobody notices.
if (IS_PRODUCTION && devLoginEnabled) {
  console.error(
    "Refusing to start: DEV_LOGIN=1 is set in production. Local dev sign-in bypasses " +
      "Microsoft authentication and must never be enabled on a deployed host. Unset it."
  );
  process.exit(1);
}

const CHAT_SYSTEM_PROMPT = `You are Ask MP — the Manhattan Project Beer Co. universal training search assistant in the staff portal.

Rules:
- Answer ONLY using facts from the provided CONTEXT (beers, food cues, coffee, SOPs/recipes, events, checklists, training games, floor tools).
- If the answer is not in the context, say you don't have that in the training materials and point the user to the relevant tab (On Tap, Food, Coffee, SOPs, Floor Tools, Launch Pad).
- Never invent beer names, tap numbers, ABVs, styles, allergen guarantees, or medical claims. For allergies: advise confirming with kitchen.
- Never answer questions unrelated to this training site. Politely redirect to site topics.
- Keep answers concise, practical, and floor-friendly. Use bullet points when listing beers or steps.
- For beer questions, cite tap number, ABV, and style when available in context.
- Help with questions like Michelada ingredients, gluten-reduced beers, closing coffee, events, and training.`;

const chatRateLimit = new Map();
const CHAT_LIMIT = 30;
const CHAT_WINDOW_MS = 60 * 1000;

const db = new Database(DB_PATH);

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL DEFAULT '',
    role TEXT NOT NULL DEFAULT 'bartender',
    auth_provider TEXT NOT NULL DEFAULT 'local',
    microsoft_oid TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS progress_sessions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    activity_type TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'beer',
    score INTEGER NOT NULL,
    total INTEGER NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_progress_user ON progress_sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_progress_type ON progress_sessions(activity_type);

  CREATE TABLE IF NOT EXISTS daily_briefings (
    user_id INTEGER NOT NULL,
    briefing_date TEXT NOT NULL,
    shown_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, briefing_date),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS announcement_views (
    user_id INTEGER NOT NULL,
    item_key TEXT NOT NULL,
    viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, item_key),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS merch_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    price_cents INTEGER NOT NULL,
    image_url TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS merch_sizes (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    item_id INTEGER NOT NULL,
    size_label TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    FOREIGN KEY (item_id) REFERENCES merch_items(id) ON DELETE CASCADE,
    UNIQUE(item_id, size_label)
  );

  CREATE TABLE IF NOT EXISTS merch_ideas (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT NOT NULL DEFAULT '',
    image_url TEXT NOT NULL DEFAULT '',
    status TEXT NOT NULL DEFAULT 'active',
    created_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS merch_votes (
    idea_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (idea_id, user_id),
    FOREIGN KEY (idea_id) REFERENCES merch_ideas(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_merch_sizes_item ON merch_sizes(item_id);
  CREATE INDEX IF NOT EXISTS idx_merch_votes_idea ON merch_votes(idea_id);

  CREATE TABLE IF NOT EXISTS shift_surveys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    shift_date TEXT NOT NULL,
    rating INTEGER NOT NULL CHECK(rating >= 1 AND rating <= 5),
    comments TEXT NOT NULL DEFAULT '',
    submitted_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, shift_date)
  );

  CREATE TABLE IF NOT EXISTS shift_survey_digest_views (
    user_id INTEGER NOT NULL,
    shift_date TEXT NOT NULL,
    viewed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, shift_date),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_shift_surveys_date ON shift_surveys(shift_date);

  CREATE TABLE IF NOT EXISTS beer_checkins (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    beer_name TEXT NOT NULL,
    rating REAL,
    notes TEXT NOT NULL DEFAULT '',
    tasted_at TEXT NOT NULL DEFAULT (datetime('now')),
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, beer_name)
  );

  CREATE INDEX IF NOT EXISTS idx_beer_checkins_user ON beer_checkins(user_id);

  CREATE TABLE IF NOT EXISTS site_feedback (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    category TEXT NOT NULL,
    page_tab TEXT NOT NULL DEFAULT '',
    subject TEXT NOT NULL,
    message TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'open',
    admin_notes TEXT NOT NULL DEFAULT '',
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_site_feedback_status ON site_feedback(status);
  CREATE INDEX IF NOT EXISTS idx_site_feedback_user ON site_feedback(user_id);

  CREATE TABLE IF NOT EXISTS inventory_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    category TEXT NOT NULL DEFAULT 'General',
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'each',
    supplier TEXT NOT NULL DEFAULT '',
    ordered INTEGER NOT NULL DEFAULT 0,
    notes TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE INDEX IF NOT EXISTS idx_inventory_category ON inventory_items(category);

  CREATE TABLE IF NOT EXISTS review_sources (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    profile_url TEXT NOT NULL,
    external_id TEXT NOT NULL DEFAULT '',
    rating REAL,
    review_count INTEGER,
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS review_entries (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    source_id TEXT NOT NULL,
    external_id TEXT NOT NULL DEFAULT '',
    author TEXT NOT NULL DEFAULT 'Guest',
    rating REAL,
    text TEXT NOT NULL,
    review_date TEXT,
    fetched_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (source_id) REFERENCES review_sources(id),
    UNIQUE(source_id, external_id)
  );

  CREATE TABLE IF NOT EXISTS review_summary (
    id INTEGER PRIMARY KEY CHECK (id = 1),
    positives TEXT NOT NULL DEFAULT '[]',
    negatives TEXT NOT NULL DEFAULT '[]',
    overall_tone TEXT NOT NULL DEFAULT '',
    generated_at TEXT,
    mode TEXT NOT NULL DEFAULT 'local'
  );

  CREATE INDEX IF NOT EXISTS idx_review_entries_source ON review_entries(source_id);
  CREATE INDEX IF NOT EXISTS idx_review_entries_date ON review_entries(review_date);

  CREATE TABLE IF NOT EXISTS approved_emails (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT NOT NULL UNIQUE,
    role TEXT NOT NULL DEFAULT 'bartender',
    added_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (added_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS sop_documents (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category TEXT NOT NULL DEFAULT 'General',
    title TEXT NOT NULL,
    summary TEXT NOT NULL DEFAULT '',
    body TEXT NOT NULL DEFAULT '',
    attachment_name TEXT NOT NULL DEFAULT '',
    attachment_url TEXT NOT NULL DEFAULT '',
    active INTEGER NOT NULL DEFAULT 1,
    sort_order INTEGER NOT NULL DEFAULT 0,
    updated_by INTEGER,
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    updated_at TEXT NOT NULL DEFAULT (datetime('now')),
    FOREIGN KEY (updated_by) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_sop_category ON sop_documents(category);

  CREATE TABLE IF NOT EXISTS checklist_completions (
    user_id INTEGER NOT NULL,
    checklist_id TEXT NOT NULL,
    shift_date TEXT NOT NULL,
    task_id INTEGER NOT NULL,
    completed_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, checklist_id, shift_date, task_id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );
  CREATE INDEX IF NOT EXISTS idx_checklist_completions_lookup
    ON checklist_completions(checklist_id, shift_date);

  CREATE TABLE IF NOT EXISTS favorite_beer_unlocks (
    guesser_id INTEGER NOT NULL,
    target_user_id INTEGER NOT NULL,
    unlocked_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (guesser_id, target_user_id),
    FOREIGN KEY (guesser_id) REFERENCES users(id),
    FOREIGN KEY (target_user_id) REFERENCES users(id)
  );
`);

const userColumns = new Set(db.prepare("PRAGMA table_info(users)").all().map((c) => c.name));
if (!userColumns.has("auth_provider")) {
  db.exec(`ALTER TABLE users ADD COLUMN auth_provider TEXT NOT NULL DEFAULT 'local'`);
}
if (!userColumns.has("microsoft_oid")) {
  db.exec(`ALTER TABLE users ADD COLUMN microsoft_oid TEXT`);
}
if (!userColumns.has("extra_roles")) {
  db.exec(`ALTER TABLE users ADD COLUMN extra_roles TEXT NOT NULL DEFAULT '[]'`);
}
if (!userColumns.has("favorite_beer")) {
  db.exec(`ALTER TABLE users ADD COLUMN favorite_beer TEXT NOT NULL DEFAULT ''`);
}
// The Nucleus product id is what a beer actually *is*; the name beside it is a
// display label kept for rows that predate the picker and for anything the
// catalog cannot account for. Nullable-by-empty-string, matching favorite_beer:
// `favorite_beer` was free text, so some values ("Still deciding") are not beers
// at all and will never resolve. Blanking those to satisfy the schema would
// throw away the person's actual answer.
if (!userColumns.has("favorite_beer_product_id")) {
  db.exec(`ALTER TABLE users ADD COLUMN favorite_beer_product_id TEXT NOT NULL DEFAULT ''`);
}

const checkinColumns = new Set(
  db.prepare("PRAGMA table_info(beer_checkins)").all().map((c) => c.name)
);
if (!checkinColumns.has("nucleus_product_id")) {
  db.exec(`ALTER TABLE beer_checkins ADD COLUMN nucleus_product_id TEXT`);
}
// Deliberately NOT unique, and UNIQUE(user_id, beer_name) is left in place.
// Two spellings can resolve to one product — "Scotch ale" and "Scotch Ale", or
// "MP0142" and the name Nucleus now gives it, "Easy Run" — so a unique index on
// the id would make the backfill either fail or silently merge two of someone's
// tasting notes into one. Deduplicating is a decision to take later, in front of
// real rows, not something a migration should do quietly.
db.exec(
  `CREATE INDEX IF NOT EXISTS idx_beer_checkins_product ON beer_checkins(nucleus_product_id)`
);

db.exec(`
  CREATE TABLE IF NOT EXISTS shift_lead_duty (
    user_id INTEGER NOT NULL,
    shift_date TEXT NOT NULL,
    assigned_by INTEGER,
    assigned_at TEXT NOT NULL DEFAULT (datetime('now')),
    PRIMARY KEY (user_id, shift_date),
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (assigned_by) REFERENCES users(id)
  );

  CREATE INDEX IF NOT EXISTS idx_shift_lead_duty_date ON shift_lead_duty(shift_date);
`);

db.prepare(`UPDATE users SET role = 'bartender' WHERE role = 'employee'`).run();
db.prepare(`UPDATE approved_emails SET role = 'bartender' WHERE role = 'employee'`).run();

// Password authentication was removed in favour of Microsoft sign-in, so no
// code path reads password_hash any more. Clear it so the seeded demo
// credentials — which were published in this repo — cannot be resurrected by
// rolling back to an older build. This runs unconditionally: a host that lacks
// Entra credentials has no way in, which is the intended outcome, not a gap to
// paper over with a password.
db.prepare("UPDATE users SET password_hash = '' WHERE password_hash != ''").run();

const seedApproved = db.prepare(`
  INSERT OR IGNORE INTO approved_emails (email, role)
  VALUES (?, ?)
`);
for (const email of AZURE_ADMIN_EMAILS) {
  seedApproved.run(email, "admin");
}

(function ensureProgressPointsColumn() {
  const cols = db.prepare("PRAGMA table_info(progress_sessions)").all();
  if (!cols.some(c => c.name === "points")) {
    db.exec("ALTER TABLE progress_sessions ADD COLUMN points INTEGER NOT NULL DEFAULT 0");
  }
  db.prepare(`
    UPDATE progress_sessions
    SET points = score * 10
    WHERE points = 0 AND score > 0
  `).run();
})();

const GAME_POINT_VALUES = {
  quiz: 10,
  practice: 15,
  tap: 12,
  abv: 10,
  style: 10,
  reverse: 12,
  speed: 8,
  hard: 12,
  flash: 3,
  blind: 15,
  desc: 12,
  gf: 10,
  battle: 10,
  rocket: 10,
  coffee_quiz: 10,
  coffee_flash: 3,
  fav_beer: 25,
  sell_this: 20,
  guestscene: 12,
  recovery: 15
};

function computeSessionPoints(activityType, score, total) {
  const base = GAME_POINT_VALUES[activityType] || 10;
  let points = score * base;
  if (total >= 8 && score === total) {
    points += Math.round(base * total * 0.25);
  }
  return points;
}

function clampPoints(activityType, score, total, requested) {
  const expected = computeSessionPoints(activityType, score, total);
  if (!Number.isFinite(requested)) return expected;
  const maxAllowed = computeSessionPoints(activityType, total, total) + total * 15;
  return Math.max(expected, Math.min(Math.round(requested), maxAllowed));
}

function todayDate() {
  return localDateKey(new Date());
}

function maybeAutoSeedOnFirstBoot() {
  try {
    const { count } = db.prepare("SELECT COUNT(*) AS count FROM users").get();
    if (count > 0) return;
    console.log("No users found — seeding demo data for first deploy...");
    require("child_process").execSync("node seed.js", { stdio: "inherit", cwd: __dirname });
  } catch (err) {
    console.warn("First-boot seed skipped:", err.message);
  }
}

function ensureMerchCatalog() {
  try {
    const { count } = db.prepare("SELECT COUNT(*) AS count FROM merch_items WHERE active = 1").get();
    if (count > 0) return;

    const insertItem = db.prepare(`
      INSERT INTO merch_items (name, description, price_cents, image_url, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    const insertSize = db.prepare(`
      INSERT INTO merch_sizes (item_id, size_label, quantity) VALUES (?, ?, ?)
    `);

    const load = db.transaction(() => {
      for (const item of MERCH_CATALOG) {
        const result = insertItem.run(
          item.name,
          item.description,
          item.price_cents,
          item.image_url,
          item.sort_order
        );
        for (const label of item.sizes) {
          insertSize.run(result.lastInsertRowid, label, 0);
        }
      }
    });
    load();
    console.log(`Loaded ${MERCH_CATALOG.length} merch items into taproom catalog.`);
  } catch (err) {
    console.warn("Merch catalog load skipped:", err.message);
  }
}

function ensureSampleSops() {
  try {
    const findByTitle = db.prepare(`
      SELECT id FROM sop_documents WHERE title = ? AND active = 1 LIMIT 1
    `);
    const insertSop = db.prepare(`
      INSERT INTO sop_documents (category, title, summary, body, sort_order)
      VALUES (?, ?, ?, ?, ?)
    `);
    const updateSop = db.prepare(`
      UPDATE sop_documents
      SET category = ?, summary = ?, body = ?, sort_order = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    const retireSop = db.prepare(`
      UPDATE sop_documents
      SET active = 0, updated_at = datetime('now')
      WHERE title = ? AND active = 1
    `);

    let inserted = 0;
    let updated = 0;
    let retired = 0;
    for (const sample of SOPS_CATALOG) {
      const existing = findByTitle.get(sample.title);
      if (existing) {
        updateSop.run(sample.category, sample.summary, sample.body, sample.sort_order, existing.id);
        updated += 1;
      } else {
        insertSop.run(sample.category, sample.title, sample.summary, sample.body, sample.sort_order);
        inserted += 1;
      }
    }
    for (const title of SOPS_RETIRED_TITLES || []) {
      const result = retireSop.run(title);
      retired += result.changes || 0;
    }
    if (inserted || updated || retired) {
      console.log(`SOP catalog synced (${inserted} new, ${updated} updated, ${retired} retired).`);
    }
  } catch (err) {
    console.warn("SOP seed skipped:", err.message);
  }
}

app.use(express.json({ limit: "6mb" }));

// The only endpoints reachable without a session: what the sign-in handshake
// itself needs. Everything else under /api requires one.
const PUBLIC_API_ROUTES = new Set([
  "/auth/providers",
  "/auth/microsoft",
  "/auth/microsoft/callback",
  "/auth/logout"
]);

// Added to the public set only when dev sign-in is on, so on every other host
// these are refused by the gate before their handlers are reached — two
// independent refusals rather than one.
if (devLoginEnabled) {
  PUBLIC_API_ROUTES.add("/auth/dev-users");
  PUBLIC_API_ROUTES.add("/auth/dev-login");
}

// A single gate rather than a guard on each route, so the default for anything
// added later is "protected". Previously each route opted in, and the ones that
// did not — SOPs, inventory, the AI chat endpoint — were readable by anyone on
// the internet.
app.use("/api", (req, res, next) => {
  if (PUBLIC_API_ROUTES.has(req.path)) return next();

  const user = loadSessionUser(req);
  if (!user) return res.status(401).json({ error: "Login required." });

  if (!devLoginEnabled && !isAllowedStaffEmail(user.email)) {
    endSession(res);
    return res.status(403).json({
      error: `Only @${ALLOWED_EMAIL_DOMAIN} accounts can use this app.`
    });
  }

  req.user = user;
  next();
});

// The session cookie carries identity only — never the role. Roles are read
// from the database on every request (see loadSessionUser), so a role change or
// a deactivated account takes effect on the next click rather than whenever the
// token happens to expire.
function startSession(res, user) {
  const token = jwt.sign({ id: user.id }, JWT_SECRET, { expiresIn: "30d" });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE_MS,
    path: "/"
  });
}

function endSession(res) {
  res.clearCookie(SESSION_COOKIE, { httpOnly: true, secure: IS_PRODUCTION, sameSite: "lax", path: "/" });
}

function readSessionToken(req) {
  const header = req.headers.cookie || "";
  for (const part of header.split(";")) {
    const eq = part.indexOf("=");
    if (eq === -1) continue;
    if (part.slice(0, eq).trim() === SESSION_COOKIE) {
      return decodeURIComponent(part.slice(eq + 1).trim());
    }
  }
  return null;
}

function loadSessionUser(req) {
  const token = readSessionToken(req);
  if (!token) return null;

  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }

  return db
    .prepare("SELECT id, name, email, role, auth_provider, microsoft_oid, created_at FROM users WHERE id = ?")
    .get(payload.id) || null;
}

function authRequired(req, res, next) {
  // The /api gate has normally resolved this already; re-use it rather than
  // hitting the database twice per request.
  const user = req.user || loadSessionUser(req);
  if (!user) {
    endSession(res);
    return res.status(401).json({ error: "Login required." });
  }
  // Production / Microsoft sessions must be company email. DEV_LOGIN seed
  // accounts (@mp.test etc.) stay usable only while local dev sign-in is on.
  if (!devLoginEnabled && !isAllowedStaffEmail(user.email)) {
    endSession(res);
    return res.status(403).json({
      error: `Only @${ALLOWED_EMAIL_DOMAIN} accounts can use this app.`
    });
  }
  req.user = user;
  next();
}

function getUserRow(userId) {
  return db.prepare(`
    SELECT id, name, email, role, extra_roles, favorite_beer, favorite_beer_product_id, created_at
    FROM users WHERE id = ?
  `).get(userId);
}

function isOnShiftLeadDuty(userId, shiftDate = todayDate()) {
  if (!userId) return false;
  return Boolean(db.prepare(`
    SELECT 1 FROM shift_lead_duty WHERE user_id = ? AND shift_date = ?
  `).get(userId, shiftDate));
}

function publicUser(row, options = {}) {
  const onShiftLeadDuty = options.onShiftLeadDuty ?? isOnShiftLeadDuty(row.id);
  const shiftContext = options.includeShiftContext === false
    ? null
    : getUserShiftContext(db, row.id);
  const user = {
    id: row.id,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role),
    extra_roles: parseExtraRoles(row.extra_roles),
    favorite_beer: String(row.favorite_beer || "").trim(),
    favorite_beer_product_id: String(row.favorite_beer_product_id || "").trim(),
    created_at: row.created_at,
    on_shift_lead_duty: onShiftLeadDuty || Boolean(shiftContext?.isShiftLeadNow),
    shift: shiftContext
  };
  user.permissions = buildPermissions(user, user.on_shift_lead_duty);
  return user;
}

function loadAuthedUser(req) {
  const row = getUserRow(req.user.id);
  return row ? publicUser(row) : null;
}

function adminRequired(req, res, next) {
  const user = loadAuthedUser(req);
  if (!user || !hasRole(user, ROLES.ADMIN)) {
    return res.status(403).json({ error: "Admin access required." });
  }
  req.authUser = user;
  next();
}

function managerOrAdminRequired(req, res, next) {
  const user = loadAuthedUser(req);
  if (!user || !canManageTeam(user)) {
    return res.status(403).json({ error: "Manager or admin access required." });
  }
  req.authUser = user;
  next();
}

function merchManagerRequired(req, res, next) {
  const user = loadAuthedUser(req);
  if (!user || !canManageMerch(user)) {
    return res.status(403).json({ error: "Merch manager access required." });
  }
  req.authUser = user;
  next();
}

function shiftLeadOrManagerRequired(req, res, next) {
  const user = loadAuthedUser(req);
  if (!user || !canViewShiftReports(user, user.on_shift_lead_duty)) {
    return res.status(403).json({ error: "Shift lead duty or manager access required." });
  }
  req.authUser = user;
  next();
}

function inventoryManagerRequired(req, res, next) {
  const user = loadAuthedUser(req);
  if (!user || !canManageOpsInventory(user)) {
    return res.status(403).json({ error: "Inventory admin access required." });
  }
  req.authUser = user;
  next();
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function isAllowedStaffEmail(email) {
  if (!ALLOWED_EMAIL_DOMAIN) return true;
  const normalized = normalizeEmail(email);
  return normalized.endsWith(`@${ALLOWED_EMAIL_DOMAIN}`);
}

function getApprovedEmail(email) {
  return db.prepare("SELECT * FROM approved_emails WHERE email = ?").get(normalizeEmail(email));
}

// Access is bounded by the Entra tenant, not by an in-app list: the app
// registration is single-tenant, so anyone Microsoft authenticates is MPBC
// staff and gets an account on first sign-in. approved_emails survives only as
// a way to pre-assign a role before someone's first login.
function resolveApprovedRole(email, existingRole) {
  const normalized = normalizeEmail(email);
  if (AZURE_ADMIN_EMAILS.has(normalized)) return "admin";
  const approved = getApprovedEmail(normalized);
  if (approved && ALLOWED_APPROVED_ROLES.has(approved.role)) return normalizeRole(approved.role);
  if (existingRole && ALLOWED_APPROVED_ROLES.has(existingRole)) return normalizeRole(existingRole);
  return ROLES.BARTENDER;
}

function microsoftAuthorizeUrl(state) {
  const params = new URLSearchParams({
    client_id: AZURE_CLIENT_ID,
    response_type: "code",
    redirect_uri: AZURE_REDIRECT_URI,
    response_mode: "query",
    scope: "openid profile email User.Read",
    state,
    prompt: "select_account"
  });
  return `https://login.microsoftonline.com/${encodeURIComponent(AZURE_TENANT_ID)}/oauth2/v2.0/authorize?${params}`;
}

function upsertMicrosoftUser({ oid, email, name }) {
  const normalized = normalizeEmail(email);
  const existingByOid = oid
    ? db.prepare("SELECT * FROM users WHERE microsoft_oid = ?").get(oid)
    : null;
  const existingByEmail = db.prepare("SELECT * FROM users WHERE email = ?").get(normalized);
  const existing = existingByOid || existingByEmail;
  const role = resolveApprovedRole(normalized, existing?.role);

  if (existing) {
    db.prepare(`
      UPDATE users
      SET name = ?, email = ?, auth_provider = 'microsoft', microsoft_oid = COALESCE(?, microsoft_oid), role = ?
      WHERE id = ?
    `).run(name, normalized, oid || null, role, existing.id);

    return db.prepare("SELECT id, name, email, role, extra_roles, created_at FROM users WHERE id = ?").get(existing.id);
  }

  const result = db.prepare(`
    INSERT INTO users (name, email, password_hash, role, auth_provider, microsoft_oid, extra_roles)
    VALUES (?, ?, '', ?, 'microsoft', ?, '[]')
  `).run(name, normalized, role, oid || null);

  return db.prepare("SELECT id, name, email, role, extra_roles, created_at FROM users WHERE id = ?").get(result.lastInsertRowid);
}

function isValidShiftDate(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function normalizeReviewsForSummary(reviews) {
  return reviews.map(review => ({
    source_id: review.source_id || review.sourceId,
    rating: review.rating,
    text: review.text
  }));
}

function getReviewSources() {
  return db.prepare(`
    SELECT * FROM review_sources WHERE active = 1 ORDER BY sort_order ASC, name ASC
  `).all().map(row => ({
    id: row.id,
    name: row.name,
    profileUrl: row.profile_url,
    externalId: row.external_id,
    rating: row.rating,
    reviewCount: row.review_count,
    updatedAt: row.updated_at
  }));
}

function getCachedReviews(sourceId) {
  const sql = `
    SELECT source_id, external_id, author, rating, text, review_date, fetched_at
    FROM review_entries
    ${sourceId ? "WHERE source_id = ?" : ""}
    ORDER BY review_date DESC, fetched_at DESC
    LIMIT 40
  `;
  const rows = sourceId ? db.prepare(sql).all(sourceId) : db.prepare(sql).all();
  return rows.map(row => ({
    sourceId: row.source_id,
    externalId: row.external_id,
    author: row.author,
    rating: row.rating,
    text: row.text,
    reviewDate: row.review_date,
    fetchedAt: row.fetched_at
  }));
}

function getCachedSummary() {
  const row = db.prepare("SELECT * FROM review_summary WHERE id = 1").get();
  if (!row) return null;
  return {
    positives: JSON.parse(row.positives || "[]"),
    negatives: JSON.parse(row.negatives || "[]"),
    overallTone: row.overall_tone,
    generatedAt: row.generated_at,
    mode: row.mode
  };
}

function saveReviewSummary(summary) {
  db.prepare(`
    INSERT INTO review_summary (id, positives, negatives, overall_tone, generated_at, mode)
    VALUES (1, ?, ?, ?, datetime('now'), ?)
    ON CONFLICT(id) DO UPDATE SET
      positives = excluded.positives,
      negatives = excluded.negatives,
      overall_tone = excluded.overall_tone,
      generated_at = excluded.generated_at,
      mode = excluded.mode
  `).run(
    JSON.stringify(summary.positives || []),
    JSON.stringify(summary.negatives || []),
    summary.overallTone || "",
    summary.mode || "local"
  );
}

function upsertReviewEntries(reviews) {
  const stmt = db.prepare(`
    INSERT INTO review_entries (source_id, external_id, author, rating, text, review_date, fetched_at)
    VALUES (@source_id, @external_id, @author, @rating, @text, @review_date, datetime('now'))
    ON CONFLICT(source_id, external_id) DO UPDATE SET
      author = excluded.author,
      rating = excluded.rating,
      text = excluded.text,
      review_date = excluded.review_date,
      fetched_at = excluded.fetched_at
  `);

  const tx = db.transaction(items => {
    items.forEach(review => {
      stmt.run({
        source_id: review.source_id,
        external_id: String(review.external_id || `${review.source_id}-${review.author}-${review.review_date}`),
        author: review.author || "Guest",
        rating: review.rating ?? null,
        text: review.text || "",
        review_date: review.review_date || null
      });
    });
  });
  tx(reviews);
}

function updateReviewSourceStats(sourceId, rating, reviewCount) {
  db.prepare(`
    UPDATE review_sources
    SET rating = COALESCE(?, rating),
        review_count = COALESCE(?, review_count),
        updated_at = datetime('now')
    WHERE id = ?
  `).run(rating, reviewCount, sourceId);
}

async function refreshReviewsFromApis() {
  const live = getLiveSyncStatus();
  const fetched = [];
  const errors = [];

  if (live.google) {
    try {
      const google = await fetchGoogleReviews();
      if (google.reviews.length) {
        upsertReviewEntries(google.reviews);
        fetched.push(...google.reviews);
      }
      if (google.rating != null || google.reviewCount != null) {
        updateReviewSourceStats("google", google.rating, google.reviewCount);
      }
    } catch (err) {
      errors.push(`Google: ${err.message}`);
    }
  }

  if (live.yelp) {
    try {
      const yelp = await fetchYelpReviews();
      if (yelp.reviews.length) {
        upsertReviewEntries(yelp.reviews);
        fetched.push(...yelp.reviews);
      }
      if (yelp.rating != null || yelp.reviewCount != null) {
        updateReviewSourceStats("yelp", yelp.rating, yelp.reviewCount);
      }
    } catch (err) {
      errors.push(`Yelp: ${err.message}`);
    }
  }

  const allReviews = getCachedReviews();
  let summary;
  try {
    const normalized = normalizeReviewsForSummary(allReviews);
    summary = live.aiSummary ? await buildAISummary(normalized) : buildLocalSummary(normalized);
  } catch {
    summary = buildLocalSummary(normalizeReviewsForSummary(allReviews));
  }
  saveReviewSummary(summary);

  return {
    fetchedCount: fetched.length,
    totalCached: allReviews.length,
    summary,
    errors,
    live
  };
}

function shouldAutoRefreshReviews() {
  const row = db.prepare("SELECT generated_at FROM review_summary WHERE id = 1").get();
  if (!row?.generated_at) return true;
  const ageMs = Date.now() - new Date(row.generated_at.replace(" ", "T")).getTime();
  return ageMs > 6 * 60 * 60 * 1000;
}

function optionalAuth(req, res, next) {
  req.user = loadSessionUser(req);
  next();
}

function formatMerchItem(row, sizes) {
  const counted = sizes.filter(s => s.quantity > 0);
  const totalQuantity = counted.length
    ? counted.reduce((sum, s) => sum + s.quantity, 0)
    : null;

  return {
    id: row.id,
    name: row.name,
    description: row.description,
    price_cents: row.price_cents,
    price: (row.price_cents / 100).toFixed(row.price_cents % 100 ? 2 : 0),
    image_url: row.image_url,
    active: Boolean(row.active),
    sort_order: row.sort_order,
    sizes: sizes.map(s => ({
      id: s.id,
      size_label: s.size_label,
      quantity: s.quantity > 0 ? s.quantity : null,
      quantity_raw: s.quantity
    })),
    total_quantity: totalQuantity
  };
}

function getMerchCatalog() {
  const items = db.prepare(`
    SELECT * FROM merch_items WHERE active = 1 ORDER BY sort_order ASC, name ASC
  `).all();
  const sizeStmt = db.prepare(`
    SELECT id, size_label, quantity FROM merch_sizes WHERE item_id = ? ORDER BY size_label ASC
  `);
  return items.map(item => formatMerchItem(item, sizeStmt.all(item.id)));
}

function getMerchIdeas(userId) {
  const ideas = db.prepare(`
    SELECT i.*, u.name AS creator_name,
           COUNT(v.user_id) AS vote_count
    FROM merch_ideas i
    LEFT JOIN users u ON u.id = i.created_by
    LEFT JOIN merch_votes v ON v.idea_id = i.id
    WHERE i.status = 'active'
    GROUP BY i.id
    ORDER BY vote_count DESC, i.created_at DESC
  `).all();

  let votedIds = new Set();
  if (userId) {
    votedIds = new Set(
      db.prepare("SELECT idea_id FROM merch_votes WHERE user_id = ?").all(userId).map(row => row.idea_id)
    );
  }

  return ideas.map(idea => ({
    id: idea.id,
    title: idea.title,
    description: idea.description,
    image_url: idea.image_url,
    created_at: idea.created_at,
    creator_name: idea.creator_name,
    vote_count: idea.vote_count,
    user_voted: votedIds.has(idea.id)
  }));
}

function getUserStats(userId) {
  const totals = db.prepare(`
    SELECT
      COUNT(*) AS sessions_completed,
      COALESCE(SUM(score), 0) AS total_correct,
      COALESCE(SUM(total), 0) AS total_questions,
      COALESCE(SUM(points), 0) AS total_points,
      MAX(completed_at) AS last_activity
    FROM progress_sessions
    WHERE user_id = ?
  `).get(userId);

  const byActivity = db.prepare(`
    SELECT activity_type, category, COUNT(*) AS attempts,
           COALESCE(SUM(score), 0) AS correct,
           COALESCE(SUM(total), 0) AS questions,
           MAX(completed_at) AS last_played
    FROM progress_sessions
    WHERE user_id = ?
    GROUP BY activity_type, category
    ORDER BY last_played DESC
  `).all(userId);

  const recent = db.prepare(`
    SELECT activity_type, category, score, total, completed_at
    FROM progress_sessions
    WHERE user_id = ?
    ORDER BY completed_at DESC
    LIMIT 15
  `).all(userId);

  const accuracy = totals.total_questions
    ? Math.round((totals.total_correct / totals.total_questions) * 100)
    : 0;

  return {
    summary: {
      sessions_completed: totals.sessions_completed,
      total_correct: totals.total_correct,
      total_questions: totals.total_questions,
      total_points: totals.total_points,
      accuracy,
      last_activity: totals.last_activity
    },
    by_activity: byActivity.map(row => ({
      ...row,
      accuracy: row.questions ? Math.round((row.correct / row.questions) * 100) : 0
    })),
    recent
  };
}

function getBeerCheckins(userId) {
  return db.prepare(`
    SELECT beer_name, rating, notes, tasted_at, updated_at
    FROM beer_checkins
    WHERE user_id = ?
    ORDER BY tasted_at DESC
  `).all(userId);
}

function isBeerOnTap(beer) {
  const onTap = String(beer["On Tap"] || "").trim().toLowerCase();
  return onTap.startsWith("yes");
}

async function getUserBadges(userId) {
  const stats = getUserStats(userId);
  const checkins = getBeerCheckins(userId);
  const act = activityMap(stats);
  const triedSet = new Set(checkins.map(c => c.beer_name.trim().toLowerCase()));

  let onTapNames = [];
  try {
    const beers = await getBeers();
    onTapNames = beers
      .filter(isBeerOnTap)
      .map(b => String(b.Name || "").trim())
      .filter(Boolean);
  } catch (_) {
    onTapNames = [];
  }

  const onTapTried = onTapNames.filter(name => triedSet.has(name.toLowerCase())).length;
  const coveragePct = onTapNames.length
    ? Math.round((onTapTried / onTapNames.length) * 100)
    : 0;

  const badges = [
    {
      key: "first_pour",
      title: "First Pour",
      description: "Log your first staff tasting",
      icon: "🍺",
      earned: checkins.length >= 1
    },
    {
      key: "palate_builder",
      title: "Palate Builder",
      description: "Log 5 beer tastings",
      icon: "📝",
      earned: checkins.length >= 5
    },
    {
      key: "menu_explorer",
      title: "Menu Explorer",
      description: "Log 10 beer tastings",
      icon: "🗺️",
      earned: checkins.length >= 10
    },
    {
      key: "rotation_complete",
      title: "Rotation Complete",
      description: "Taste every beer currently on tap",
      icon: "✅",
      earned: onTapNames.length > 0 && onTapTried >= onTapNames.length
    },
    {
      key: "first_game",
      title: "Boot Camp",
      description: "Complete your first training game",
      icon: "🎯",
      earned: stats.summary.sessions_completed >= 1
    },
    {
      key: "tap_match",
      title: "Tap Match Pro",
      description: "75%+ accuracy in Tap Match",
      icon: "🔢",
      earned: (act.tap?.accuracy || 0) >= 75 && (act.tap?.attempts || 0) >= 1
    },
    {
      key: "guest_match",
      title: "Guest Guide",
      description: "75%+ accuracy in Guest Match",
      icon: "💬",
      earned: (act.practice?.accuracy || 0) >= 75 && (act.practice?.attempts || 0) >= 1
    },
    {
      key: "floor_ready",
      title: "Floor Ready",
      description: "Pass Tap Match and Guest Match thresholds",
      icon: "🏆",
      earned: (act.tap?.accuracy || 0) >= 75 && (act.practice?.accuracy || 0) >= 75
    },
    {
      key: "launch_pad",
      title: "Launch Pad Ace",
      description: "75%+ accuracy in Launch Pad arcade",
      icon: "🚀",
      earned: (act.rocket?.accuracy || 0) >= 75 && (act.rocket?.attempts || 0) >= 1
    },
    {
      key: "coffee_cert",
      title: "Coffee Certified",
      description: "75%+ on the Coffee Quiz",
      icon: "☕",
      earned: (act.coffee_quiz?.accuracy || 0) >= 75 && (act.coffee_quiz?.attempts || 0) >= 1
    },
    {
      key: "point_hunter",
      title: "Point Hunter",
      description: "Earn 500+ training points total",
      icon: "⭐",
      earned: (stats.summary.total_points || 0) >= 500
    }
  ];

  return {
    badges,
    tasting: {
      total: checkins.length,
      onTapTotal: onTapNames.length,
      onTapTried,
      coveragePct,
      untriedOnTap: onTapNames.filter(name => !triedSet.has(name.toLowerCase()))
    }
  };
}

const ACTIVITY_LABELS = {
  quiz: "Flavor Quiz",
  practice: "Guest Match",
  tap: "Tap Match",
  abv: "ABV Challenge",
  style: "Style Match",
  reverse: "Pick the Profile",
  speed: "Speed Round",
  rocket: "Launch Pad",
  hard: "Hard Mode",
  flash: "Beer Flashcards",
  blind: "Blind Pick",
  desc: "Description Match",
  gf: "GF Spotter",
  battle: "ABV Battle",
  coffee_quiz: "Coffee Quiz",
  coffee_flash: "Coffee Flashcards",
  fav_beer: "Staff Favorites"
};

const TRAINING_PATH = [
  { type: "flash", category: "beer", label: "Beer Flashcards", goal: 70, critical: false,
    suggest: "Learn the beer menu with flashcards before moving to scored quizzes." },
  { type: "quiz", category: "beer", label: "Flavor Quiz", goal: 70, critical: false,
    suggest: "Practice matching flavor profiles to beer names." },
  { type: "style", category: "beer", label: "Style Match", goal: 70, critical: false,
    suggest: "Build style recognition for menu conversations." },
  { type: "tap", category: "beer", label: "Tap Match", goal: 75, critical: true,
    suggest: "Tap numbers are essential on the floor — prioritize this next." },
  { type: "abv", category: "beer", label: "ABV Challenge", goal: 70, critical: false,
    suggest: "Memorize ABVs from the sheet for guest questions." },
  { type: "practice", category: "beer", label: "Guest Match", goal: 75, critical: true,
    suggest: "Practice guest guidance scenarios for service readiness." },
  { type: "reverse", category: "beer", label: "Pick the Profile", goal: 70, critical: false,
    suggest: "Reverse quiz strengthens detailed product knowledge." },
  { type: "speed", category: "beer", label: "Speed Round", goal: 75, critical: false,
    suggest: "Ready for a mixed review — try Speed Round under pressure." },
  { type: "rocket", category: "beer", label: "Launch Pad", goal: 75, critical: false,
    suggest: "Arcade-style review — lock the correct tap answer in Launch Pad." },
  { type: "blind", category: "beer", label: "Blind Pick", goal: 70, critical: false,
    suggest: "Match style and ABV clues without seeing the beer name." },
  { type: "gf", category: "beer", label: "GF Spotter", goal: 80, critical: true,
    suggest: "Know which taps are gluten-reduced for guest questions." },
  { type: "hard", category: "beer", label: "Hard Mode", goal: 70, critical: false,
    suggest: "Tough decoys and bonus points — for staff who know the list cold." },
  { type: "coffee_flash", category: "coffee", label: "Coffee Flashcards", goal: 70, critical: false,
    suggest: "Review coffee manual key points with flashcards." },
  { type: "coffee_quiz", category: "coffee", label: "Coffee Quiz", goal: 75, critical: true,
    suggest: "Complete the coffee quiz to verify bar standards knowledge." }
];

function daysSince(dateStr) {
  if (!dateStr) return null;
  const then = new Date(dateStr.includes("T") ? dateStr : dateStr.replace(" ", "T") + "Z");
  const now = new Date();
  return Math.floor((now - then) / (1000 * 60 * 60 * 24));
}

function activityMap(stats) {
  const map = {};
  for (const row of stats.by_activity) {
    map[row.activity_type] = row;
  }
  return map;
}

function getTrainingRecommendations(stats) {
  const recs = [];
  const map = activityMap(stats);
  const { summary } = stats;
  const inactiveDays = daysSince(summary.last_activity);

  if (summary.sessions_completed === 0) {
    recs.push({
      priority: 0,
      kind: "start",
      title: "Begin onboarding",
      message: "No training logged yet. Start with Beer Flashcards, then Flavor Quiz.",
      action: "Beer Flashcards"
    });
    return recs;
  }

  if (inactiveDays !== null && inactiveDays >= 7) {
    recs.push({
      priority: 1,
      kind: "inactive",
      title: "Schedule a refresher",
      message: `No training in ${inactiveDays} days. Assign a 10-question Speed Round or Tap Match session.`,
      action: "Speed Round"
    });
  }

  for (const step of TRAINING_PATH) {
    const row = map[step.type];
    if (!row) {
      recs.push({
        priority: step.critical ? 2 : 4,
        kind: "missing",
        title: `Start ${step.label}`,
        message: step.suggest,
        action: step.label
      });
    } else if (step.goal && row.questions > 0 && row.accuracy < step.goal) {
      recs.push({
        priority: step.critical ? 3 : 5,
        kind: "improve",
        title: `Improve ${step.label}`,
        message: `${row.accuracy}% accuracy (${row.attempts} attempt${row.attempts === 1 ? "" : "s"}) — retry until ${step.goal}%+.`,
        action: step.label
      });
    }
  }

  const beerActivities = TRAINING_PATH.filter(s => s.category === "beer");
  const coffeeActivities = TRAINING_PATH.filter(s => s.category === "coffee");
  const beerDone = beerActivities.filter(s => {
    const r = map[s.type];
    return r && (!s.goal || r.accuracy >= s.goal);
  }).length;
  const coffeeStarted = coffeeActivities.some(s => map[s.type]);

  if (beerDone >= 5 && !coffeeStarted) {
    recs.push({
      priority: 6,
      kind: "expand",
      title: "Add coffee training",
      message: "Beer fundamentals look solid. Move them to the Coffee tab for manual + quiz.",
      action: "Coffee Flashcards"
    });
  }

  if (summary.accuracy >= 85 && summary.sessions_completed >= 6) {
    recs.push({
      priority: 7,
      kind: "advanced",
      title: "Stretch assignment",
      message: "Strong overall performance. Use Speed Round for shift-prep or cross-training.",
      action: "Speed Round"
    });
  }

  if (summary.accuracy < 60 && summary.sessions_completed >= 2) {
    recs.push({
      priority: 2.5,
      kind: "foundation",
      title: "Rebuild foundations",
      message: `Overall accuracy is ${summary.accuracy}%. Slow down with Flashcards before timed games.`,
      action: "Beer Flashcards"
    });
  }

  recs.sort((a, b) => a.priority - b.priority);

  const seen = new Set();
  const unique = [];
  for (const rec of recs) {
    const key = rec.title;
    if (seen.has(key)) continue;
    seen.add(key);
    unique.push(rec);
  }

  return unique.slice(0, 5);
}

function chatRateOk(ip) {
  const now = Date.now();
  const bucket = chatRateLimit.get(ip) || [];
  const recent = bucket.filter(ts => now - ts < CHAT_WINDOW_MS);
  if (recent.length >= CHAT_LIMIT) return false;
  recent.push(now);
  chatRateLimit.set(ip, recent);
  return true;
}

async function askOpenAI(message, history, context) {
  const messages = [
    { role: "system", content: `${CHAT_SYSTEM_PROMPT}\n\nCONTEXT:\n${context}` },
    ...history
      .filter(m => m && (m.role === "user" || m.role === "assistant") && m.content)
      .slice(-8)
      .map(m => ({ role: m.role, content: String(m.content).slice(0, 2000) })),
    { role: "user", content: message }
  ];

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${OPENAI_API_KEY}`
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      messages,
      temperature: 0.2,
      max_tokens: 700
    })
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error?.message || "AI request failed.");
  }

  const reply = data.choices?.[0]?.message?.content?.trim();
  if (!reply) throw new Error("Empty AI response.");
  return reply;
}

app.post("/api/auth/logout", (req, res) => {
  endSession(res);
  res.json({ ok: true });
});

app.get("/api/auth/providers", (req, res) => {
  res.json({ microsoft: microsoftAuthEnabled, dev: devLoginEnabled });
});

// Dev sign-in picks an existing seeded account by id — there is no password to
// check, because a password here would buy nothing (the whole feature is gated
// on DEV_LOGIN=1 on a loopback connection) while re-introducing exactly what
// was removed: a credential in the repo that keeps working if this code is ever
// reachable. Nothing is created, so the accounts available are whatever seed.js
// already put in this developer's local database.
function devLoginRefusal(req) {
  if (!devLoginEnabled) {
    return { status: 404, error: "Not found." };
  }
  // Re-checked per request rather than trusted from boot: if DEV_LOGIN is ever
  // set somewhere it shouldn't be, a remote caller still cannot use it.
  // Read off the socket, not req.ip — req.ip honours X-Forwarded-For, which the
  // caller controls.
  const remote = req.socket.remoteAddress || "";
  if (!["127.0.0.1", "::1", "::ffff:127.0.0.1"].includes(remote)) {
    return { status: 403, error: "Dev sign-in is only available from localhost." };
  }
  return null;
}

app.get("/api/auth/dev-users", (req, res) => {
  const refusal = devLoginRefusal(req);
  if (refusal) return res.status(refusal.status).json({ error: refusal.error });

  const users = db.prepare(`
    SELECT id, name, email, role FROM users ORDER BY role, name
  `).all();
  res.json({ users: users.map((u) => ({ ...u, role: normalizeRole(u.role) })) });
});

app.post("/api/auth/dev-login", (req, res) => {
  const refusal = devLoginRefusal(req);
  if (refusal) return res.status(refusal.status).json({ error: refusal.error });

  const user = db.prepare(`
    SELECT id, name, email, role, auth_provider, microsoft_oid, created_at
    FROM users WHERE id = ?
  `).get(Number(req.body.userId));
  if (!user) return res.status(404).json({ error: "No such user in the local database." });

  console.log(`Dev sign-in as ${user.email} (${user.role}).`);
  startSession(res, user);
  res.json({ ok: true, user: publicUser(user) });
});

app.get("/api/auth/microsoft", (req, res) => {
  if (!microsoftAuthEnabled) {
    return res.status(503).json({
      error: "Microsoft sign-in is not configured. Set AZURE_CLIENT_ID and AZURE_CLIENT_SECRET."
    });
  }

  const state = jwt.sign(
    { nonce: crypto.randomBytes(16).toString("hex"), purpose: "ms-oauth" },
    JWT_SECRET,
    { expiresIn: "10m" }
  );
  res.redirect(microsoftAuthorizeUrl(state));
});

app.get("/api/auth/microsoft/callback", async (req, res) => {
  const fail = (message) => {
    const params = new URLSearchParams({ auth_error: message });
    return res.redirect(`/?${params}`);
  };

  if (!microsoftAuthEnabled) {
    return fail("Microsoft sign-in is not configured.");
  }

  const { code, state, error, error_description: errorDescription } = req.query;
  if (error) {
    return fail(String(errorDescription || error));
  }
  if (!code || !state) {
    return fail("Missing authorization response from Microsoft.");
  }

  try {
    const decoded = jwt.verify(String(state), JWT_SECRET);
    if (decoded.purpose !== "ms-oauth") {
      return fail("Invalid sign-in state.");
    }
  } catch {
    return fail("Sign-in expired. Please try again.");
  }

  try {
    const tokenRes = await fetch(
      `https://login.microsoftonline.com/${encodeURIComponent(AZURE_TENANT_ID)}/oauth2/v2.0/token`,
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: AZURE_CLIENT_ID,
          client_secret: AZURE_CLIENT_SECRET,
          code: String(code),
          redirect_uri: AZURE_REDIRECT_URI,
          grant_type: "authorization_code"
        })
      }
    );
    const tokenData = await tokenRes.json();
    if (!tokenRes.ok || !tokenData.access_token) {
      console.error("Microsoft token error:", tokenData);
      return fail(tokenData.error_description || "Could not complete Microsoft sign-in.");
    }

    const profileRes = await fetch("https://graph.microsoft.com/v1.0/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` }
    });
    const profile = await profileRes.json();
    if (!profileRes.ok) {
      console.error("Microsoft profile error:", profile);
      return fail("Could not load your Microsoft profile.");
    }

    const email = normalizeEmail(profile.mail || profile.userPrincipalName);
    const name = String(profile.displayName || email.split("@")[0] || "Team member").trim();
    const oid = profile.id ? String(profile.id) : null;

    if (!email) {
      return fail("Your Microsoft account did not return an email address.");
    }

    if (!isAllowedStaffEmail(email)) {
      return fail(
        `Only @${ALLOWED_EMAIL_DOMAIN} Microsoft accounts can sign in. ` +
          `Signed in as ${email}.`
      );
    }

    const user = upsertMicrosoftUser({ oid, email, name });
    startSession(res, user);
    return res.redirect("/");
  } catch (err) {
    console.error("Microsoft auth callback error:", err.message);
    return fail("Microsoft sign-in failed. Please try again.");
  }
});

app.get("/api/auth/me", authRequired, (req, res) => {
  const row = getUserRow(req.user.id);
  if (!row) return res.status(404).json({ error: "User not found." });
  res.json({ user: publicUser(row) });
});

app.patch("/api/me/favorite-beer", authRequired, async (req, res) => {
  const productId = String(req.body.productId || req.body.product_id || "").trim();

  // Clearing is still allowed — an empty pick means "no favourite", which is a
  // real answer and not the same as never having been asked.
  if (!productId) {
    db.prepare(
      "UPDATE users SET favorite_beer = '', favorite_beer_product_id = '' WHERE id = ?"
    ).run(req.user.id);
    const cleared = getUserRow(req.user.id);
    return cleared
      ? res.json({ ok: true, user: publicUser(cleared) })
      : res.status(404).json({ error: "User not found." });
  }

  // The name is resolved from the catalog rather than taken from the request:
  // this field used to be a free-text box, which is how "Still deciding" ended
  // up stored as a beer. The id decides, and the name is only a display label
  // written from the same source that supplied the id.
  let product;
  try {
    product = (await nucleus.getProducts()).find((p) => p.id === productId);
  } catch (error) {
    return nucleusFailed(res, error, "the beer catalog");
  }
  if (!product) {
    return res.status(400).json({ error: "That beer is not in the catalog." });
  }

  db.prepare(
    "UPDATE users SET favorite_beer = ?, favorite_beer_product_id = ? WHERE id = ?"
  ).run(String(product.name).slice(0, 80), product.id, req.user.id);

  const row = getUserRow(req.user.id);
  if (!row) return res.status(404).json({ error: "User not found." });
  res.json({ ok: true, user: publicUser(row) });
});

const FAV_BEER_DECOYS = [
  "Black Matter Nitro",
  "Hoppenheimer",
  "Atomic Blonde",
  "Little Boy",
  "Chain Reaction",
  "Trinity",
  "Fat Man Stout",
  "Manhattan Project IPA",
  "Still deciding",
  "Whatever's on special"
];

function shuffleArray(list) {
  const arr = [...list];
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function getUnlockedFavoriteIds(guesserId) {
  return new Set(
    db.prepare("SELECT target_user_id FROM favorite_beer_unlocks WHERE guesser_id = ?")
      .all(guesserId)
      .map(row => row.target_user_id)
  );
}

app.get("/api/games/favorite-beer-quiz", authRequired, async (req, res) => {
  // Only favourites that resolve to a real beer. This used to be any non-empty
  // string, which meant the quiz could ask what someone's favourite beer is and
  // expect the answer "Still deciding" — a leftover of the free-text box the
  // picker replaced. A legacy value gains an id the moment its owner re-picks,
  // or when scripts/backfill-beer-uuids.js matches it.
  const staff = db.prepare(`
    SELECT id, name, favorite_beer
    FROM users
    WHERE TRIM(COALESCE(favorite_beer, '')) != ''
      AND TRIM(COALESCE(favorite_beer_product_id, '')) != ''
      AND id != ?
    ORDER BY name ASC
  `).all(req.user.id);

  if (staff.length < 1) {
    return res.json({
      questions: [],
      unlockedCount: 0,
      totalWithFavorites: 0,
      message: "Nobody has set a favorite beer yet — ask teammates to add theirs on Launch Pad."
    });
  }

  const unlocked = getUnlockedFavoriteIds(req.user.id);

  // Decoys come from the catalog, so every wrong answer is a real beer. They
  // used to be drawn from whatever colleagues had typed into the old free-text
  // box, which meant "Still deciding" could be offered as a plausible guess.
  // The hardcoded list survives only as a fallback for Nucleus being down.
  let decoyPool = FAV_BEER_DECOYS;
  try {
    const products = await nucleus.getProducts();
    if (products.length) decoyPool = products.map((p) => String(p.name).trim());
  } catch (error) {
    console.warn("Favourite-beer quiz: falling back to built-in decoys —", error.message);
  }

  const ordered = [
    ...shuffleArray(staff.filter(row => !unlocked.has(row.id))),
    ...shuffleArray(staff.filter(row => unlocked.has(row.id)))
  ].slice(0, 8);

  const questions = ordered.map(row => {
    const correct = String(row.favorite_beer).trim();
    const decoys = shuffleArray(
      decoyPool.filter(beer => beer.toLowerCase() !== correct.toLowerCase())
    ).slice(0, 3);
    while (decoys.length < 3) {
      decoys.push(FAV_BEER_DECOYS[decoys.length % FAV_BEER_DECOYS.length]);
    }
    return {
      targetUserId: row.id,
      name: row.name,
      unlocked: unlocked.has(row.id),
      choices: shuffleArray([correct, ...decoys.slice(0, 3)])
    };
  });

  res.json({
    questions,
    unlockedCount: unlocked.size,
    totalWithFavorites: staff.length
  });
});

app.post("/api/games/favorite-beer-guess", authRequired, (req, res) => {
  const targetUserId = Number(req.body.targetUserId);
  const guess = String(req.body.guess || "").trim();
  if (!Number.isFinite(targetUserId) || !guess) {
    return res.status(400).json({ error: "Pick a teammate and a beer guess." });
  }
  if (targetUserId === req.user.id) {
    return res.status(400).json({ error: "You already know your own favorite." });
  }

  const target = db.prepare(`
    SELECT id, name, favorite_beer FROM users WHERE id = ?
  `).get(targetUserId);
  const favoriteBeer = String(target?.favorite_beer || "").trim();
  if (!target || !favoriteBeer) {
    return res.status(404).json({ error: "That teammate has not set a favorite beer yet." });
  }

  const correct = guess.toLowerCase() === favoriteBeer.toLowerCase();
  const already = db.prepare(`
    SELECT 1 FROM favorite_beer_unlocks WHERE guesser_id = ? AND target_user_id = ?
  `).get(req.user.id, targetUserId);

  let pointsAwarded = 0;
  let unlocked = Boolean(already);

  if (correct && !already) {
    db.prepare(`
      INSERT INTO favorite_beer_unlocks (guesser_id, target_user_id)
      VALUES (?, ?)
    `).run(req.user.id, targetUserId);
    pointsAwarded = computeSessionPoints("fav_beer", 1, 1);
    db.prepare(`
      INSERT INTO progress_sessions (user_id, activity_type, category, score, total, points)
      VALUES (?, 'fav_beer', 'beer', 1, 1, ?)
    `).run(req.user.id, pointsAwarded);
    unlocked = true;
  }

  res.json({
    correct,
    favoriteBeer: correct ? favoriteBeer : null,
    alreadyUnlocked: Boolean(already),
    unlocked,
    pointsAwarded,
    targetName: target.name
  });
});

app.get("/api/shifts/me", authRequired, (req, res) => {
  res.json({ shift: getUserShiftContext(db, req.user.id) });
});

app.get("/api/shifts/working", authRequired, managerOrAdminRequired, (req, res) => {
  const shiftDate = isValidShiftDate(req.query.date) ? req.query.date : todayDate();
  const staff = getWorkingStaff(db, shiftDate).map(row => ({
    sevenShiftId: row.seven_shift_id,
    sevenUserId: row.seven_user_id,
    userId: row.user_id,
    name: row.portal_name || null,
    email: row.portal_email || null,
    roleName: row.role_name,
    stationName: row.station_name,
    startAt: row.start_at,
    endAt: row.end_at,
    isShiftLead: Boolean(row.is_shift_lead),
    mapped: Boolean(row.user_id)
  }));
  res.json({
    shiftDate,
    source: sevenShifts.isConfigured() ? "7shifts" : "none",
    count: staff.length,
    staff
  });
});

app.post("/api/shifts/sync", authRequired, managerOrAdminRequired, async (req, res) => {
  try {
    const result = await syncSevenShifts(db);
    if (result.skipped) {
      return res.status(503).json({
        error: "7shifts is not configured. Add SEVEN_SHIFTS_ACCESS_TOKEN and SEVEN_SHIFTS_COMPANY_ID.",
        result
      });
    }
    res.json(result);
  } catch (err) {
    console.error("7shifts sync error:", err.message);
    res.status(502).json({ error: err.message || "Could not sync 7shifts." });
  }
});

app.get("/api/shifts/status", authRequired, managerOrAdminRequired, (req, res) => {
  ensureSevenShiftsTables(db);
  const latest = db.prepare(`SELECT MAX(synced_at) AS synced_at FROM scheduled_shifts`).get();
  const todayCount = db.prepare(`SELECT COUNT(*) AS count FROM scheduled_shifts WHERE shift_date = ?`).get(todayDate());
  const unmapped = db.prepare(`
    SELECT COUNT(*) AS count FROM scheduled_shifts
    WHERE shift_date = ? AND user_id IS NULL
  `).get(todayDate());
  res.json({
    configured: sevenShifts.isConfigured(),
    locationId: sevenShifts.config().locationId,
    departmentId: sevenShifts.config().departmentId,
    lastSyncedAt: latest?.synced_at || null,
    todayShiftCount: todayCount?.count || 0,
    unmappedToday: unmapped?.count || 0
  });
});

app.post("/api/progress", authRequired, (req, res) => {
  const activity_type = (req.body.activity_type || "").trim();
  const category = (req.body.category || "beer").trim();
  const score = Number(req.body.score);
  const total = Number(req.body.total);
  const points = clampPoints(activity_type, score, total, Number(req.body.points));
  const maxStreak = Number(req.body.max_streak || req.body.maxStreak) || 0;

  if (!activity_type || !Number.isFinite(score) || !Number.isFinite(total) || total <= 0) {
    return res.status(400).json({ error: "Invalid progress payload." });
  }

  db.prepare(`
    INSERT INTO progress_sessions (user_id, activity_type, category, score, total, points)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(req.user.id, activity_type, category, score, total, points);

  const { bumpStreak, awardAchievement, evaluateSecretAchievements } = require("./portal-polish-api");
  const newly = [];
  if (maxStreak > 0) {
    const existing = db.prepare(`
      SELECT best FROM user_streaks WHERE user_id = ? AND streak_key = 'answer_streak'
    `).get(req.user.id);
    const best = Math.max(maxStreak, existing?.best || 0);
    db.prepare(`
      INSERT INTO user_streaks (user_id, streak_key, count, best, last_date)
      VALUES (?, 'answer_streak', ?, ?, date('now'))
      ON CONFLICT(user_id, streak_key) DO UPDATE SET
        count = excluded.count,
        best = excluded.best,
        last_date = excluded.last_date
    `).run(req.user.id, maxStreak, best);
    if (best >= 5 && awardAchievement(db, req.user.id, "critical-mass")) newly.push("critical-mass");
  }
  if (score >= total && total > 0 && awardAchievement(db, req.user.id, "trinity-test")) {
    newly.push("trinity-test");
  }
  if (activity_type === "coffee_flash" && awardAchievement(db, req.user.id, "orbital-rendezvous")) {
    newly.push("orbital-rendezvous");
  }

  const stats = getUserStats(req.user.id);
  const byActivity = {};
  for (const row of stats.by_activity || []) byActivity[row.activity_type] = row;
  const more = evaluateSecretAchievements(db, req.user.id, {
    byActivity,
    maxStreak,
    perfectRound: score >= total && total > 0
  });
  for (const key of more) {
    if (!newly.includes(key)) newly.push(key);
  }

  const titles = require("./ops-content").SECRET_ACHIEVEMENTS
    .filter(a => newly.includes(a.id))
    .map(a => a.title);

  res.json({ ok: true, points, newlyEarned: newly, titles });
});

app.get("/api/progress/me", authRequired, (req, res) => {
  res.json(getUserStats(req.user.id));
});

app.get("/api/beer-checkins/me", authRequired, async (req, res) => {
  try {
    const checkins = getBeerCheckins(req.user.id);
    const { badges, tasting } = await getUserBadges(req.user.id);
    res.json({ checkins, summary: tasting, badges });
  } catch (err) {
    console.error("Beer checkins error:", err.message);
    res.status(500).json({ error: "Could not load tasting journal." });
  }
});

app.post("/api/beer-checkins", authRequired, (req, res) => {
  const beerName = String(req.body.beerName || "").trim();
  // Sent by the beer card the check-in was opened from, so it is the id of the
  // beer actually on screen. Optional rather than required: a check-in saved
  // before this shipped has none, and refusing it would lose the note.
  const productId = String(req.body.productId || "").trim();
  const ratingRaw = req.body.rating;
  const notes = String(req.body.notes || "").trim().slice(0, 2000);
  const tastedAt = String(req.body.tastedAt || "").trim();

  if (!beerName) {
    return res.status(400).json({ error: "Beer name is required." });
  }

  let rating = null;
  if (ratingRaw !== null && ratingRaw !== undefined && ratingRaw !== "") {
    rating = Number(ratingRaw);
    if (!Number.isFinite(rating) || rating < 1 || rating > 5) {
      return res.status(400).json({ error: "Rating must be between 1 and 5 stars." });
    }
  }

  const tastedAtValue = /^\d{4}-\d{2}-\d{2}/.test(tastedAt) ? tastedAt : null;

  db.prepare(`
    INSERT INTO beer_checkins
      (user_id, beer_name, nucleus_product_id, rating, notes, tasted_at, updated_at)
    VALUES (?, ?, ?, ?, ?, COALESCE(?, datetime('now')), datetime('now'))
    ON CONFLICT(user_id, beer_name) DO UPDATE SET
      nucleus_product_id = COALESCE(excluded.nucleus_product_id, beer_checkins.nucleus_product_id),
      rating = excluded.rating,
      notes = excluded.notes,
      tasted_at = COALESCE(excluded.tasted_at, beer_checkins.tasted_at),
      updated_at = datetime('now')
  `).run(req.user.id, beerName, productId || null, rating, notes, tastedAtValue);

  res.json({ ok: true, beerName });
});

const FEEDBACK_CATEGORIES = new Set(["bug", "wrong_info", "idea", "other"]);
const FEEDBACK_STATUSES = new Set(["open", "reviewed", "resolved"]);

function formatFeedbackRow(row) {
  return {
    id: row.id,
    userId: row.user_id,
    userName: row.user_name || row.name || "Staff",
    userEmail: row.user_email || row.email || "",
    userRole: row.user_role || row.role || "",
    category: row.category,
    pageTab: row.page_tab,
    subject: row.subject,
    message: row.message,
    status: row.status,
    pipelineStatus: row.pipeline_status || "submitted",
    adminNotes: row.admin_notes,
    implementedNote: row.implemented_note || "",
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

app.post("/api/site-feedback", authRequired, (req, res) => {
  const category = String(req.body.category || "").trim();
  const pageTab = String(req.body.pageTab || req.body.page_tab || "").trim().slice(0, 80);
  const subject = String(req.body.subject || "").trim().slice(0, 160);
  const message = String(req.body.message || "").trim().slice(0, 4000);

  if (!FEEDBACK_CATEGORIES.has(category)) {
    return res.status(400).json({ error: "Please choose a feedback category." });
  }
  if (!subject) {
    return res.status(400).json({ error: "Please add a short subject line." });
  }
  if (!message) {
    return res.status(400).json({ error: "Please describe the issue or idea." });
  }

  const result = db.prepare(`
    INSERT INTO site_feedback (user_id, category, page_tab, subject, message)
    VALUES (?, ?, ?, ?, ?)
  `).run(req.user.id, category, pageTab, subject, message);

  res.json({ ok: true, id: result.lastInsertRowid });
});

app.get("/api/site-feedback/me", authRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT id, category, page_tab, subject, message, status, admin_notes, created_at, updated_at
    FROM site_feedback
    WHERE user_id = ?
    ORDER BY created_at DESC
    LIMIT 50
  `).all(req.user.id);

  res.json({
    submissions: rows.map(row => formatFeedbackRow(row))
  });
});

app.get("/api/site-feedback", authRequired, managerOrAdminRequired, (req, res) => {
  const status = String(req.query.status || "").trim();
  const rows = db.prepare(`
    SELECT f.id, f.user_id, f.category, f.page_tab, f.subject, f.message, f.status, f.admin_notes,
           f.created_at, f.updated_at, u.name AS user_name, u.email AS user_email, u.role AS user_role
    FROM site_feedback f
    JOIN users u ON u.id = f.user_id
    ${status && FEEDBACK_STATUSES.has(status) ? "WHERE f.status = ?" : ""}
    ORDER BY f.created_at DESC
    LIMIT 200
  `).all(...(status && FEEDBACK_STATUSES.has(status) ? [status] : []));

  res.json({
    feedback: rows.map(row => formatFeedbackRow(row))
  });
});

app.patch("/api/site-feedback/:id", authRequired, managerOrAdminRequired, (req, res) => {
  const id = Number(req.params.id);
  const status = String(req.body.status || "").trim();
  const adminNotes = String(req.body.adminNotes || req.body.admin_notes || "").trim().slice(0, 2000);

  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid feedback id." });
  }

  const existing = db.prepare("SELECT id FROM site_feedback WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Feedback not found." });
  }

  if (status && !FEEDBACK_STATUSES.has(status)) {
    return res.status(400).json({ error: "Invalid status." });
  }

  db.prepare(`
    UPDATE site_feedback
    SET status = COALESCE(?, status),
        admin_notes = CASE WHEN ? != '' THEN ? ELSE admin_notes END,
        updated_at = datetime('now')
    WHERE id = ?
  `).run(status || null, adminNotes, adminNotes, id);

  const row = db.prepare(`
    SELECT f.id, f.user_id, f.category, f.page_tab, f.subject, f.message, f.status, f.admin_notes,
           f.created_at, f.updated_at, u.name AS user_name, u.email AS user_email, u.role AS user_role
    FROM site_feedback f
    JOIN users u ON u.id = f.user_id
    WHERE f.id = ?
  `).get(id);

  res.json({ ok: true, feedback: formatFeedbackRow(row) });
});

app.get("/api/admin/approved-emails", authRequired, adminRequired, (req, res) => {
  const rows = db.prepare(`
    SELECT a.id, a.email, a.role, a.created_at, a.added_by,
           u.name AS added_by_name,
           eu.id AS user_id,
           eu.name AS user_name
    FROM approved_emails a
    LEFT JOIN users u ON u.id = a.added_by
    LEFT JOIN users eu ON eu.email = a.email
    ORDER BY a.created_at DESC, a.email ASC
  `).all();

  res.json({
    emails: rows.map((row) => ({
      id: row.id,
      email: row.email,
      role: row.role,
      created_at: row.created_at,
      added_by_name: row.added_by_name || null,
      signed_in: Boolean(row.user_id),
      user_name: row.user_name || null,
      locked: AZURE_ADMIN_EMAILS.has(row.email)
    }))
  });
});

app.post("/api/admin/approved-emails", authRequired, adminRequired, (req, res) => {
  const email = normalizeEmail(req.body.email);
  const role = ALLOWED_APPROVED_ROLES.has(req.body.role) ? normalizeRole(req.body.role) : ROLES.BARTENDER;

  if (!email || !email.includes("@")) {
    return res.status(400).json({ error: "A valid email address is required." });
  }

  if (!isAllowedStaffEmail(email)) {
    return res.status(400).json({
      error: `Only @${ALLOWED_EMAIL_DOMAIN} emails can be pre-assigned a role.`
    });
  }

  try {
    db.prepare(`
      INSERT INTO approved_emails (email, role, added_by)
      VALUES (?, ?, ?)
    `).run(email, role, req.user.id);
  } catch (err) {
    if (String(err.message).includes("UNIQUE")) {
      db.prepare(`
        UPDATE approved_emails
        SET role = ?, added_by = ?
        WHERE email = ?
      `).run(role, req.user.id, email);
    } else {
      throw err;
    }
  }

  db.prepare(`UPDATE users SET role = ? WHERE email = ?`).run(role, email);

  const row = db.prepare(`
    SELECT a.id, a.email, a.role, a.created_at, a.added_by,
           u.name AS added_by_name,
           eu.id AS user_id,
           eu.name AS user_name
    FROM approved_emails a
    LEFT JOIN users u ON u.id = a.added_by
    LEFT JOIN users eu ON eu.email = a.email
    WHERE a.email = ?
  `).get(email);

  res.status(201).json({
    email: {
      id: row.id,
      email: row.email,
      role: row.role,
      created_at: row.created_at,
      added_by_name: row.added_by_name || null,
      signed_in: Boolean(row.user_id),
      user_name: row.user_name || null,
      locked: AZURE_ADMIN_EMAILS.has(row.email)
    }
  });
});

app.patch("/api/admin/approved-emails/:id", authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid approved email id." });
  }

  const existing = db.prepare("SELECT * FROM approved_emails WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Approved email not found." });
  }

  const role = ALLOWED_APPROVED_ROLES.has(req.body.role) ? normalizeRole(req.body.role) : null;
  if (!role) {
    return res.status(400).json({ error: "A valid role is required." });
  }

  if (AZURE_ADMIN_EMAILS.has(existing.email) && role !== "admin") {
    return res.status(400).json({
      error: "This email is locked as admin in server config."
    });
  }

  db.prepare(`
    UPDATE approved_emails
    SET role = ?, added_by = ?
    WHERE id = ?
  `).run(role, req.user.id, id);

  db.prepare(`UPDATE users SET role = ? WHERE email = ?`).run(role, existing.email);

  const row = db.prepare(`
    SELECT a.id, a.email, a.role, a.created_at, a.added_by,
           u.name AS added_by_name,
           eu.id AS user_id,
           eu.name AS user_name
    FROM approved_emails a
    LEFT JOIN users u ON u.id = a.added_by
    LEFT JOIN users eu ON eu.email = a.email
    WHERE a.id = ?
  `).get(id);

  res.json({
    email: {
      id: row.id,
      email: row.email,
      role: row.role,
      created_at: row.created_at,
      added_by_name: row.added_by_name || null,
      signed_in: Boolean(row.user_id),
      user_name: row.user_name || null,
      locked: AZURE_ADMIN_EMAILS.has(row.email)
    }
  });
});

app.delete("/api/admin/approved-emails/:id", authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid approved email id." });
  }

  const existing = db.prepare("SELECT * FROM approved_emails WHERE id = ?").get(id);
  if (!existing) {
    return res.status(404).json({ error: "Approved email not found." });
  }

  if (AZURE_ADMIN_EMAILS.has(existing.email)) {
    return res.status(400).json({
      error: "This email is locked as an admin in server config and cannot be removed."
    });
  }

  if (existing.email === normalizeEmail(req.user.email)) {
    return res.status(400).json({ error: "You cannot remove your own approved email." });
  }

  db.prepare("DELETE FROM approved_emails WHERE id = ?").run(id);
  res.json({ ok: true, email: existing.email });
});

app.get("/api/games/leaderboard", optionalAuth, (req, res) => {
  const period = String(req.query.period || "week").trim();
  const allowed = ["week", "month", "all"];
  const safePeriod = allowed.includes(period) ? period : "week";

  let dateClause = "";
  if (safePeriod === "week") dateClause = "AND p.completed_at >= datetime('now', '-7 days')";
  if (safePeriod === "month") dateClause = "AND p.completed_at >= datetime('now', '-30 days')";

  const leaderboard = db.prepare(`
    SELECT u.id, u.name, u.role, u.favorite_beer,
           COALESCE(SUM(p.points), 0) AS points,
           COALESCE(SUM(p.score), 0) AS correct,
           COALESCE(SUM(p.total), 0) AS questions,
           COUNT(p.id) AS sessions
    FROM users u
    INNER JOIN progress_sessions p ON p.user_id = u.id
    WHERE u.role IN ('bartender', 'trainee', 'event_lead', 'shift_lead', 'admin', 'merch', 'manager', 'inventory_admin')
      ${dateClause}
    GROUP BY u.id
    HAVING points > 0
    ORDER BY points DESC, correct DESC, u.name ASC
    LIMIT 25
  `).all();

  const unlockedIds = req.user ? getUnlockedFavoriteIds(req.user.id) : new Set();

  const mapped = leaderboard.map((row, index) => {
    const favoriteBeer = String(row.favorite_beer || "").trim();
    const isSelf = req.user && row.id === req.user.id;
    const reveal = Boolean(favoriteBeer) && (isSelf || unlockedIds.has(row.id));
    return {
      rank: index + 1,
      id: row.id,
      name: row.name,
      role: row.role,
      favoriteBeer: reveal ? favoriteBeer : null,
      favoriteBeerLocked: Boolean(favoriteBeer) && !reveal,
      points: row.points,
      correct: row.correct,
      questions: row.questions,
      sessions: row.sessions,
      accuracy: row.questions ? Math.round((row.correct / row.questions) * 100) : 0
    };
  });

  let me = null;
  if (req.user) {
    const myRow = db.prepare(`
      SELECT COALESCE(SUM(p.points), 0) AS points,
             COALESCE(SUM(p.score), 0) AS correct,
             COALESCE(SUM(p.total), 0) AS questions,
             COUNT(p.id) AS sessions
      FROM progress_sessions p
      WHERE p.user_id = ?
        ${dateClause}
    `).get(req.user.id);

    const myPoints = myRow?.points || 0;
    let myRank = null;
    if (myPoints > 0) {
      myRank = db.prepare(`
        SELECT COUNT(*) + 1 AS rank
        FROM (
          SELECT u.id, COALESCE(SUM(p.points), 0) AS points
          FROM users u
          INNER JOIN progress_sessions p ON p.user_id = u.id
          WHERE u.role IN ('bartender', 'trainee', 'event_lead', 'shift_lead', 'admin', 'merch', 'manager', 'inventory_admin')
            ${dateClause}
          GROUP BY u.id
          HAVING points > ?
        )
      `).get(myPoints)?.rank || 1;
    }

    me = {
      id: req.user.id,
      rank: myRank,
      points: myPoints,
      correct: myRow?.correct || 0,
      questions: myRow?.questions || 0,
      sessions: myRow?.sessions || 0,
      accuracy: myRow?.questions ? Math.round((myRow.correct / myRow.questions) * 100) : 0,
      favoritesUnlocked: unlockedIds.size
    };
  }

  res.json({
    period: safePeriod,
    leaderboard: mapped,
    me
  });
});

app.get("/api/announcements/state", authRequired, (req, res) => {
  const date = todayDate();
  const briefing = db
    .prepare("SELECT 1 FROM daily_briefings WHERE user_id = ? AND briefing_date = ?")
    .get(req.user.id, date);
  const viewed = db
    .prepare("SELECT item_key FROM announcement_views WHERE user_id = ?")
    .all(req.user.id)
    .map(row => row.item_key);

  res.json({
    briefingShownToday: Boolean(briefing),
    viewedKeys: viewed
  });
});

app.post("/api/announcements/briefing-shown", authRequired, (req, res) => {
  const date = todayDate();
  db.prepare(`
    INSERT OR IGNORE INTO daily_briefings (user_id, briefing_date)
    VALUES (?, ?)
  `).run(req.user.id, date);
  res.json({ ok: true });
});

app.post("/api/announcements/view", authRequired, (req, res) => {
  const itemKey = (req.body.itemKey || "").trim();
  if (!itemKey) {
    return res.status(400).json({ error: "itemKey is required." });
  }

  db.prepare(`
    INSERT OR REPLACE INTO announcement_views (user_id, item_key, viewed_at)
    VALUES (?, ?, datetime('now'))
  `).run(req.user.id, itemKey);

  res.json({ ok: true });
});

app.get("/api/merch", (req, res) => {
  res.json({ items: getMerchCatalog() });
});

app.post("/api/merch", authRequired, merchManagerRequired, (req, res) => {
  const name = (req.body.name || "").trim();
  const description = (req.body.description || "").trim();
  const price_cents = Number(req.body.price_cents);
  const image_url = (req.body.image_url || "").trim();
  const sizes = Array.isArray(req.body.sizes) ? req.body.sizes : [];

  if (!name || !Number.isFinite(price_cents) || price_cents < 0) {
    return res.status(400).json({ error: "Name and valid price are required." });
  }

  const result = db.prepare(`
    INSERT INTO merch_items (name, description, price_cents, image_url)
    VALUES (?, ?, ?, ?)
  `).run(name, description, Math.round(price_cents), image_url);

  const itemId = result.lastInsertRowid;
  const insertSize = db.prepare(`
    INSERT INTO merch_sizes (item_id, size_label, quantity) VALUES (?, ?, ?)
  `);

  sizes.forEach(size => {
    const label = (size.size_label || size.label || "").trim();
    const quantity = Math.max(0, Number(size.quantity) || 0);
    if (label) insertSize.run(itemId, label, quantity);
  });

  const item = db.prepare("SELECT * FROM merch_items WHERE id = ?").get(itemId);
  const itemSizes = db.prepare("SELECT id, size_label, quantity FROM merch_sizes WHERE item_id = ?").all(itemId);
  res.status(201).json({ item: formatMerchItem(item, itemSizes) });
});

app.patch("/api/merch/:id", authRequired, merchManagerRequired, (req, res) => {
  const item = db.prepare("SELECT * FROM merch_items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Merch item not found." });

  const name = (req.body.name ?? item.name).trim();
  const description = (req.body.description ?? item.description).trim();
  const price_cents = req.body.price_cents != null ? Math.round(Number(req.body.price_cents)) : item.price_cents;
  const image_url = (req.body.image_url ?? item.image_url).trim();
  const active = req.body.active != null ? (req.body.active ? 1 : 0) : item.active;

  if (!name || !Number.isFinite(price_cents) || price_cents < 0) {
    return res.status(400).json({ error: "Invalid merch item payload." });
  }

  db.prepare(`
    UPDATE merch_items
    SET name = ?, description = ?, price_cents = ?, image_url = ?, active = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, description, price_cents, image_url, active, item.id);

  if (Array.isArray(req.body.sizes)) {
    const upsertSize = db.prepare(`
      INSERT INTO merch_sizes (item_id, size_label, quantity) VALUES (?, ?, ?)
      ON CONFLICT(item_id, size_label) DO UPDATE SET quantity = excluded.quantity
    `);
    const labels = [];
    req.body.sizes.forEach(size => {
      const label = (size.size_label || size.label || "").trim();
      const quantity = Math.max(0, Number(size.quantity) || 0);
      if (label) {
        labels.push(label);
        upsertSize.run(item.id, label, quantity);
      }
    });

    if (req.body.replace_sizes !== false) {
      const deleteSize = db.prepare(`
        DELETE FROM merch_sizes WHERE item_id = ? AND size_label = ?
      `);
      db.prepare("SELECT size_label FROM merch_sizes WHERE item_id = ?").all(item.id).forEach(row => {
        if (!labels.includes(row.size_label)) {
          deleteSize.run(item.id, row.size_label);
        }
      });
    }
  }

  const updated = db.prepare("SELECT * FROM merch_items WHERE id = ?").get(item.id);
  const sizes = db.prepare("SELECT id, size_label, quantity FROM merch_sizes WHERE item_id = ?").all(item.id);
  res.json({ item: formatMerchItem(updated, sizes) });
});

app.delete("/api/merch/:id", authRequired, merchManagerRequired, (req, res) => {
  const item = db.prepare("SELECT id FROM merch_items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Merch item not found." });
  db.prepare("UPDATE merch_items SET active = 0, updated_at = datetime('now') WHERE id = ?").run(item.id);
  res.json({ ok: true });
});

app.get("/api/merch/ideas", optionalAuth, (req, res) => {
  res.json({ ideas: getMerchIdeas(req.user?.id) });
});

app.post("/api/merch/ideas", authRequired, merchManagerRequired, (req, res) => {
  const title = (req.body.title || "").trim();
  const description = (req.body.description || "").trim();
  const image_url = (req.body.image_url || "").trim();

  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  const result = db.prepare(`
    INSERT INTO merch_ideas (title, description, image_url, created_by)
    VALUES (?, ?, ?, ?)
  `).run(title, description, image_url, req.user.id);

  res.status(201).json({ ideas: getMerchIdeas(req.user.id) });
});

app.patch("/api/merch/ideas/:id", authRequired, merchManagerRequired, (req, res) => {
  const idea = db.prepare("SELECT * FROM merch_ideas WHERE id = ?").get(req.params.id);
  if (!idea) return res.status(404).json({ error: "Idea not found." });

  const title = (req.body.title ?? idea.title).trim();
  const description = (req.body.description ?? idea.description).trim();
  const image_url = (req.body.image_url ?? idea.image_url).trim();
  const status = (req.body.status ?? idea.status).trim();

  if (!title) {
    return res.status(400).json({ error: "Title is required." });
  }

  db.prepare(`
    UPDATE merch_ideas SET title = ?, description = ?, image_url = ?, status = ? WHERE id = ?
  `).run(title, description, image_url, status, idea.id);

  res.json({ ideas: getMerchIdeas(req.user.id) });
});

app.delete("/api/merch/ideas/:id", authRequired, merchManagerRequired, (req, res) => {
  const idea = db.prepare("SELECT id FROM merch_ideas WHERE id = ?").get(req.params.id);
  if (!idea) return res.status(404).json({ error: "Idea not found." });
  db.prepare("UPDATE merch_ideas SET status = 'archived' WHERE id = ?").run(idea.id);
  res.json({ ok: true, ideas: getMerchIdeas(req.user.id) });
});

app.post("/api/merch/ideas/:id/vote", authRequired, (req, res) => {
  const idea = db.prepare("SELECT id FROM merch_ideas WHERE id = ? AND status = 'active'").get(req.params.id);
  if (!idea) return res.status(404).json({ error: "Idea not found." });

  const existing = db.prepare(`
    SELECT 1 FROM merch_votes WHERE idea_id = ? AND user_id = ?
  `).get(idea.id, req.user.id);

  if (existing) {
    db.prepare("DELETE FROM merch_votes WHERE idea_id = ? AND user_id = ?").run(idea.id, req.user.id);
  } else {
    db.prepare("INSERT INTO merch_votes (idea_id, user_id) VALUES (?, ?)").run(idea.id, req.user.id);
  }

  res.json({ ideas: getMerchIdeas(req.user.id) });
});

function formatInventoryItem(row) {
  const quantity = Number(row.quantity) || 0;
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    quantity,
    unit: row.unit,
    supplier: row.supplier,
    ordered: Boolean(row.ordered),
    in_stock: quantity > 0,
    notes: row.notes,
    active: Boolean(row.active),
    sort_order: row.sort_order,
    updated_at: row.updated_at
  };
}

function getInventoryCatalog() {
  const rows = db.prepare(`
    SELECT * FROM inventory_items
    WHERE active = 1
    ORDER BY category ASC, sort_order ASC, name ASC
  `).all();
  return rows.map(formatInventoryItem);
}

app.get("/api/inventory", (req, res) => {
  res.json({ items: getInventoryCatalog() });
});

app.post("/api/inventory", authRequired, inventoryManagerRequired, (req, res) => {
  const name = (req.body.name || "").trim();
  const category = (req.body.category || "General").trim();
  const quantity = Math.max(0, Number(req.body.quantity) || 0);
  const unit = (req.body.unit || "each").trim();
  const supplier = (req.body.supplier || "").trim();
  const ordered = req.body.ordered ? 1 : 0;
  const notes = (req.body.notes || "").trim();
  const sort_order = Number(req.body.sort_order) || 0;

  if (!name) {
    return res.status(400).json({ error: "Product name is required." });
  }

  const result = db.prepare(`
    INSERT INTO inventory_items (name, category, quantity, unit, supplier, ordered, notes, sort_order)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(name, category, quantity, unit, supplier, ordered, notes, sort_order);

  const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ item: formatInventoryItem(item) });
});

app.patch("/api/inventory/:id", authRequired, inventoryManagerRequired, (req, res) => {
  const item = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Inventory item not found." });

  const name = (req.body.name ?? item.name).trim();
  const category = (req.body.category ?? item.category).trim();
  const quantity = req.body.quantity != null ? Math.max(0, Number(req.body.quantity) || 0) : item.quantity;
  const unit = (req.body.unit ?? item.unit).trim();
  const supplier = (req.body.supplier ?? item.supplier).trim();
  const ordered = req.body.ordered != null ? (req.body.ordered ? 1 : 0) : item.ordered;
  const notes = (req.body.notes ?? item.notes).trim();
  const sort_order = req.body.sort_order != null ? Number(req.body.sort_order) || 0 : item.sort_order;

  if (!name) {
    return res.status(400).json({ error: "Product name is required." });
  }

  db.prepare(`
    UPDATE inventory_items
    SET name = ?, category = ?, quantity = ?, unit = ?, supplier = ?, ordered = ?, notes = ?, sort_order = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(name, category, quantity, unit, supplier, ordered, notes, sort_order, item.id);

  const updated = db.prepare("SELECT * FROM inventory_items WHERE id = ?").get(item.id);
  res.json({ item: formatInventoryItem(updated) });
});

app.delete("/api/inventory/:id", authRequired, inventoryManagerRequired, (req, res) => {
  const item = db.prepare("SELECT id FROM inventory_items WHERE id = ?").get(req.params.id);
  if (!item) return res.status(404).json({ error: "Inventory item not found." });
  db.prepare("UPDATE inventory_items SET active = 0, updated_at = datetime('now') WHERE id = ?").run(item.id);
  res.json({ ok: true });
});

function formatSop(row) {
  return {
    id: row.id,
    category: row.category,
    title: row.title,
    summary: row.summary,
    body: row.body,
    attachment_name: row.attachment_name || "",
    attachment_url: row.attachment_url || "",
    sort_order: row.sort_order,
    updated_at: row.updated_at
  };
}

function getSopCatalog() {
  return db.prepare(`
    SELECT id, category, title, summary, body, attachment_name, attachment_url, sort_order, updated_at
    FROM sop_documents
    WHERE active = 1
    ORDER BY category ASC, sort_order ASC, title ASC
  `).all().map(formatSop);
}

app.get("/api/sops", (req, res) => {
  res.json({ documents: getSopCatalog() });
});

app.post("/api/sops", authRequired, adminRequired, (req, res) => {
  const title = (req.body.title || "").trim();
  const category = (req.body.category || "General").trim();
  const summary = (req.body.summary || "").trim();
  const body = String(req.body.body || "").trim();
  const attachment_name = (req.body.attachment_name || "").trim();
  const attachment_url = (req.body.attachment_url || "").trim();
  const sort_order = Number(req.body.sort_order) || 0;

  if (!title) {
    return res.status(400).json({ error: "SOP title is required." });
  }
  if (!body && !attachment_url) {
    return res.status(400).json({ error: "SOP body text or an attachment is required." });
  }

  const result = db.prepare(`
    INSERT INTO sop_documents (category, title, summary, body, attachment_name, attachment_url, sort_order, updated_by)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(category, title, summary, body, attachment_name, attachment_url, sort_order, req.user.id);

  const doc = db.prepare("SELECT * FROM sop_documents WHERE id = ?").get(result.lastInsertRowid);
  res.status(201).json({ document: formatSop(doc) });
});

app.patch("/api/sops/:id", authRequired, adminRequired, (req, res) => {
  const doc = db.prepare("SELECT * FROM sop_documents WHERE id = ? AND active = 1").get(req.params.id);
  if (!doc) return res.status(404).json({ error: "SOP not found." });

  const title = (req.body.title ?? doc.title).trim();
  const category = (req.body.category ?? doc.category).trim();
  const summary = (req.body.summary ?? doc.summary).trim();
  const body = req.body.body != null ? String(req.body.body).trim() : doc.body;
  const attachment_name = (req.body.attachment_name ?? doc.attachment_name).trim();
  const attachment_url = (req.body.attachment_url ?? doc.attachment_url).trim();
  const sort_order = req.body.sort_order != null ? Number(req.body.sort_order) || 0 : doc.sort_order;

  if (!title) {
    return res.status(400).json({ error: "SOP title is required." });
  }

  db.prepare(`
    UPDATE sop_documents
    SET category = ?, title = ?, summary = ?, body = ?, attachment_name = ?, attachment_url = ?,
        sort_order = ?, updated_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(category, title, summary, body, attachment_name, attachment_url, sort_order, req.user.id, doc.id);

  const updated = db.prepare("SELECT * FROM sop_documents WHERE id = ?").get(doc.id);
  res.json({ document: formatSop(updated) });
});

app.delete("/api/sops/:id", authRequired, adminRequired, (req, res) => {
  const doc = db.prepare("SELECT id FROM sop_documents WHERE id = ? AND active = 1").get(req.params.id);
  if (!doc) return res.status(404).json({ error: "SOP not found." });
  db.prepare(`
    UPDATE sop_documents
    SET active = 0, updated_by = ?, updated_at = datetime('now')
    WHERE id = ?
  `).run(req.user.id, doc.id);
  res.json({ ok: true });
});

app.get("/api/checklists", optionalAuth, (req, res) => {
  const shiftDate = isValidShiftDate(req.query.date) ? req.query.date : todayDate();
  const lists = listChecklists();

  let completedByList = {};
  if (req.user?.id) {
    const rows = db.prepare(`
      SELECT checklist_id, COUNT(*) AS done
      FROM checklist_completions
      WHERE user_id = ? AND shift_date = ?
      GROUP BY checklist_id
    `).all(req.user.id, shiftDate);
    completedByList = Object.fromEntries(rows.map(row => [row.checklist_id, row.done]));
  }

  res.json({
    shiftDate,
    checklists: lists.map(list => ({
      ...list,
      completedCount: completedByList[list.id] || 0
    }))
  });
});

app.get("/api/checklists/:id", optionalAuth, (req, res) => {
  const checklist = getChecklistById(req.params.id);
  if (!checklist) return res.status(404).json({ error: "Checklist not found." });

  const shiftDate = isValidShiftDate(req.query.date) ? req.query.date : todayDate();
  let completedTaskIds = [];
  if (req.user?.id) {
    completedTaskIds = db.prepare(`
      SELECT task_id FROM checklist_completions
      WHERE user_id = ? AND checklist_id = ? AND shift_date = ?
    `).all(req.user.id, checklist.id, shiftDate).map(row => row.task_id);
  }

  res.json({
    shiftDate,
    checklist: {
      id: checklist.id,
      name: checklist.name,
      category: checklist.category,
      dueLabel: checklist.dueLabel,
      summary: checklist.summary,
      tasks: checklist.tasks
    },
    completedTaskIds
  });
});

app.post("/api/checklists/:id/toggle", authRequired, (req, res) => {
  const checklist = getChecklistById(req.params.id);
  if (!checklist) return res.status(404).json({ error: "Checklist not found." });

  const shiftDate = isValidShiftDate(req.body.shiftDate) ? req.body.shiftDate : todayDate();
  const taskId = Number(req.body.taskId);
  const task = checklist.tasks.find(entry => entry.id === taskId);
  if (!task) return res.status(400).json({ error: "Invalid task id." });

  const existing = db.prepare(`
    SELECT 1 FROM checklist_completions
    WHERE user_id = ? AND checklist_id = ? AND shift_date = ? AND task_id = ?
  `).get(req.user.id, checklist.id, shiftDate, taskId);

  if (existing) {
    db.prepare(`
      DELETE FROM checklist_completions
      WHERE user_id = ? AND checklist_id = ? AND shift_date = ? AND task_id = ?
    `).run(req.user.id, checklist.id, shiftDate, taskId);
  } else {
    db.prepare(`
      INSERT INTO checklist_completions (user_id, checklist_id, shift_date, task_id)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, checklist.id, shiftDate, taskId);
  }

  const completedTaskIds = db.prepare(`
    SELECT task_id FROM checklist_completions
    WHERE user_id = ? AND checklist_id = ? AND shift_date = ?
  `).all(req.user.id, checklist.id, shiftDate).map(row => row.task_id);

  let streak = null;
  if (!existing && completedTaskIds.length >= checklist.tasks.length) {
    try {
      const { bumpStreak, awardAchievement } = require("./portal-polish-api");
      let key = "checklist_days";
      if (/closing/i.test(checklist.id) || /closing/i.test(checklist.name || "")) key = "closing_days";
      if (/opening/i.test(checklist.id) || /opening/i.test(checklist.name || "")) key = "opening_days";
      streak = bumpStreak(db, req.user.id, key, shiftDate);
      if (key === "closing_days") {
        awardAchievement(db, req.user.id, "fallout-shelter");
        if (streak.count >= 10) awardAchievement(db, req.user.id, "ten-perfect-closes");
      }
      if (streak.count >= 30) awardAchievement(db, req.user.id, "thirty-checklists");
    } catch (_) {}
  }

  res.json({
    ok: true,
    shiftDate,
    completed: !existing,
    completedTaskIds,
    completedCount: completedTaskIds.length,
    taskCount: checklist.tasks.length,
    streak
  });
});

app.post("/api/checklists/:id/reset", authRequired, (req, res) => {
  const checklist = getChecklistById(req.params.id);
  if (!checklist) return res.status(404).json({ error: "Checklist not found." });
  const shiftDate = isValidShiftDate(req.body.shiftDate) ? req.body.shiftDate : todayDate();

  db.prepare(`
    DELETE FROM checklist_completions
    WHERE user_id = ? AND checklist_id = ? AND shift_date = ?
  `).run(req.user.id, checklist.id, shiftDate);

  res.json({ ok: true, shiftDate, completedTaskIds: [] });
});

app.get("/api/admin/employees", authRequired, managerOrAdminRequired, (req, res) => {
  const employees = db.prepare(`
    SELECT u.id, u.name, u.email, u.role, u.created_at,
           COUNT(p.id) AS sessions_completed,
           COALESCE(SUM(p.score), 0) AS total_correct,
           COALESCE(SUM(p.total), 0) AS total_questions,
           MAX(p.completed_at) AS last_activity
    FROM users u
    LEFT JOIN progress_sessions p ON p.user_id = u.id
    GROUP BY u.id
    ORDER BY u.name ASC
  `).all();

  res.json({
    employees: employees.map(row => {
      const base = {
        ...publicUser(row, { includeShiftContext: false }),
        sessions_completed: row.sessions_completed,
        total_correct: row.total_correct,
        total_questions: row.total_questions,
        accuracy: row.total_questions ? Math.round((row.total_correct / row.total_questions) * 100) : 0,
        last_activity: row.last_activity
      };

      if (!isFloorStaffForTraining({ role: normalizeRole(row.role) })) {
        return { ...base, next_step: null, recommendations: [] };
      }

      const recommendations = getTrainingRecommendations(getUserStats(row.id));
      return {
        ...base,
        next_step: recommendations[0] || null,
        recommendations
      };
    })
  });
});

app.get("/api/admin/employees/:id", authRequired, managerOrAdminRequired, async (req, res) => {
  const user = getUserRow(req.params.id);
  if (!user) return res.status(404).json({ error: "Employee not found." });
  const stats = getUserStats(user.id);
  const checkins = getBeerCheckins(user.id);
  let tastingSummary = { total: checkins.length, onTapTried: 0, onTapTotal: 0, coveragePct: 0 };
  try {
    const { tasting } = await getUserBadges(user.id);
    tastingSummary = tasting;
  } catch (_) {}

  res.json({
    user: publicUser(user),
    stats,
    tasting: tastingSummary,
    recentTastings: checkins.slice(0, 8),
    recommendations: isFloorStaffForTraining({ role: normalizeRole(user.role) })
      ? getTrainingRecommendations(stats)
      : []
  });
});

app.get("/api/admin/shift-lead-duty", authRequired, managerOrAdminRequired, (req, res) => {
  const shiftDate = isValidShiftDate(req.query.date) ? req.query.date : todayDate();
  const assignments = db.prepare(`
    SELECT d.user_id, d.shift_date, d.assigned_at, u.name, u.email, u.role, u.extra_roles
    FROM shift_lead_duty d
    JOIN users u ON u.id = d.user_id
    WHERE d.shift_date = ?
    ORDER BY u.name ASC
  `).all(shiftDate).map(row => ({
    userId: row.user_id,
    shiftDate: row.shift_date,
    assignedAt: row.assigned_at,
    name: row.name,
    email: row.email,
    role: normalizeRole(row.role),
    extraRoles: parseExtraRoles(row.extra_roles)
  }));

  res.json({ shiftDate, assignments });
});

app.post("/api/admin/shift-lead-duty", authRequired, managerOrAdminRequired, (req, res) => {
  const shiftDate = isValidShiftDate(req.body.shiftDate) ? req.body.shiftDate : todayDate();
  const userId = Number(req.body.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "A valid user id is required." });
  }

  const target = getUserRow(userId);
  if (!target) return res.status(404).json({ error: "User not found." });

  db.prepare(`
    INSERT OR IGNORE INTO shift_lead_duty (user_id, shift_date, assigned_by)
    VALUES (?, ?, ?)
  `).run(userId, shiftDate, req.user.id);

  res.json({ ok: true, shiftDate, userId });
});

app.delete("/api/admin/shift-lead-duty", authRequired, managerOrAdminRequired, (req, res) => {
  const shiftDate = isValidShiftDate(req.body.shiftDate) ? req.body.shiftDate : todayDate();
  const userId = Number(req.body.userId);

  if (!Number.isInteger(userId) || userId <= 0) {
    return res.status(400).json({ error: "A valid user id is required." });
  }

  db.prepare(`DELETE FROM shift_lead_duty WHERE user_id = ? AND shift_date = ?`).run(userId, shiftDate);
  res.json({ ok: true, shiftDate, userId });
});

app.patch("/api/admin/users/:id", authRequired, managerOrAdminRequired, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  const existing = getUserRow(id);
  if (!existing) return res.status(404).json({ error: "User not found." });

  const role = req.body.role && ALLOWED_APPROVED_ROLES.has(req.body.role)
    ? normalizeRole(req.body.role)
    : normalizeRole(existing.role);
  const extra_roles = req.body.extra_roles != null
    ? serializeExtraRoles(req.body.extra_roles)
    : existing.extra_roles || "[]";

  db.prepare(`UPDATE users SET role = ?, extra_roles = ? WHERE id = ?`).run(role, extra_roles, id);
  db.prepare(`UPDATE approved_emails SET role = ? WHERE email = ?`).run(role, existing.email);

  const updated = getUserRow(id);
  res.json({ ok: true, user: publicUser(updated) });
});

function deleteUserById(userId) {
  const id = Number(userId);
  const existing = getUserRow(id);
  if (!existing) return { ok: false, status: 404, error: "User not found." };

  const email = normalizeEmail(existing.email);
  if (AZURE_ADMIN_EMAILS.has(email)) {
    return {
      ok: false,
      status: 400,
      error: "Bootstrap admins from server config cannot be deleted."
    };
  }

  const userTables = [
    "progress_sessions",
    "daily_briefings",
    "announcement_views",
    "merch_votes",
    "shift_surveys",
    "beer_checkins",
    "site_feedback",
    "checklist_completions",
    "shift_lead_duty",
    "user_streaks"
  ];

  const run = db.transaction(() => {
    for (const table of userTables) {
      try {
        db.prepare(`DELETE FROM ${table} WHERE user_id = ?`).run(id);
      } catch {
        // Older DBs may lack some tables.
      }
    }

    try {
      db.prepare(
        "DELETE FROM favorite_beer_unlocks WHERE guesser_id = ? OR target_user_id = ?"
      ).run(id, id);
    } catch {
      // optional table
    }

    try {
      db.prepare("UPDATE merch_ideas SET created_by = NULL WHERE created_by = ?").run(id);
    } catch {
      // optional
    }
    try {
      db.prepare("UPDATE approved_emails SET added_by = NULL WHERE added_by = ?").run(id);
    } catch {
      // optional
    }
    try {
      db.prepare("UPDATE shift_lead_duty SET assigned_by = NULL WHERE assigned_by = ?").run(id);
    } catch {
      // optional
    }
    try {
      db.prepare("UPDATE seven_shifts_users SET user_id = NULL WHERE user_id = ?").run(id);
    } catch {
      // optional
    }
    try {
      db.prepare("UPDATE sop_documents SET updated_by = NULL WHERE updated_by = ?").run(id);
    } catch {
      // optional
    }

    db.prepare("DELETE FROM approved_emails WHERE email = ?").run(email);
    db.prepare("DELETE FROM users WHERE id = ?").run(id);
  });

  run();
  return { ok: true, email: existing.email, id };
}

app.delete("/api/admin/users/:id", authRequired, adminRequired, (req, res) => {
  const id = Number(req.params.id);
  if (!Number.isInteger(id) || id <= 0) {
    return res.status(400).json({ error: "Invalid user id." });
  }

  if (id === req.user.id) {
    return res.status(400).json({ error: "You cannot delete your own account." });
  }

  const result = deleteUserById(id);
  if (!result.ok) {
    return res.status(result.status).json({ error: result.error });
  }

  res.json({ ok: true, id: result.id, email: result.email });
});

app.get("/api/chat/status", (req, res) => {
  res.json({
    enabled: Boolean(OPENAI_API_KEY),
    mode: OPENAI_API_KEY ? "ai" : "local"
  });
});

app.post("/api/chat", async (req, res) => {
  const ip = req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.socket.remoteAddress || "local";
  if (!chatRateOk(ip)) {
    return res.status(429).json({ error: "Too many messages. Please wait a moment." });
  }

  const message = String(req.body.message || "").trim();
  const history = Array.isArray(req.body.history) ? req.body.history : [];

  if (!message) {
    return res.status(400).json({ error: "Message is required." });
  }
  if (message.length > 800) {
    return res.status(400).json({ error: "Message is too long." });
  }

  try {
    let beers = [];
    try {
      beers = await getBeers();
    } catch (fetchErr) {
      console.warn("Beer menu unavailable for chat:", fetchErr.message);
    }

    const sops = getSopCatalog();
    const context = buildContext(message, beers, sops);

    if (OPENAI_API_KEY) {
      const reply = await askOpenAI(message, history, context);
      return res.json({ reply, mode: "ai" });
    }

    const reply = localAnswer(message, beers, sops);
    return res.json({ reply, mode: "local" });
  } catch (err) {
    console.error("Chat error:", err.message);
    return res.status(500).json({ error: "Could not get an answer right now. Try again in a moment." });
  }
});

app.get("/api/shift-surveys/status", authRequired, (req, res) => {
  const shiftDate = isValidShiftDate(req.query.date) ? req.query.date : todayDate();
  const row = db.prepare(`
    SELECT submitted_at FROM shift_surveys
    WHERE user_id = ? AND shift_date = ?
  `).get(req.user.id, shiftDate);

  res.json({
    shiftDate,
    submitted: Boolean(row),
    submittedAt: row?.submitted_at || null
  });
});

app.post("/api/shift-surveys", authRequired, (req, res) => {
  const shiftDate = isValidShiftDate(req.body.shiftDate) ? req.body.shiftDate : todayDate();
  const rating = Number(req.body.rating);
  const comments = String(req.body.comments || "").trim().slice(0, 2000);

  if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
    return res.status(400).json({ error: "Please select a shift rating from 1 to 5." });
  }
  if (shiftDate > todayDate()) {
    return res.status(400).json({ error: "Cannot submit a survey for a future date." });
  }

  const existing = db.prepare(`
    SELECT id FROM shift_surveys WHERE user_id = ? AND shift_date = ?
  `).get(req.user.id, shiftDate);

  if (existing) {
    return res.status(409).json({ error: "You already submitted a survey for this shift date." });
  }

  db.prepare(`
    INSERT INTO shift_surveys (user_id, shift_date, rating, comments)
    VALUES (?, ?, ?, ?)
  `).run(req.user.id, shiftDate, rating, comments);

  res.json({ ok: true, shiftDate });
});

app.get("/api/shift-surveys/daily", authRequired, shiftLeadOrManagerRequired, (req, res) => {
  const shiftDate = isValidShiftDate(req.query.date) ? req.query.date : todayDate();
  const surveys = db.prepare(`
    SELECT rating, comments, submitted_at
    FROM shift_surveys
    WHERE shift_date = ?
    ORDER BY submitted_at ASC
  `).all(shiftDate);

  const stats = db.prepare(`
    SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS averageRating
    FROM shift_surveys
    WHERE shift_date = ?
  `).get(shiftDate);

  const digestView = db.prepare(`
    SELECT viewed_at FROM shift_survey_digest_views
    WHERE user_id = ? AND shift_date = ?
  `).get(req.user.id, shiftDate);

  res.json({
    shiftDate,
    surveys: surveys.map((row, index) => ({
      number: index + 1,
      rating: row.rating,
      comments: row.comments,
      submittedAt: row.submitted_at
    })),
    count: stats.count || 0,
    averageRating: stats.averageRating ?? null,
    digestViewed: Boolean(digestView),
    digestViewedAt: digestView?.viewed_at || null
  });
});

app.post("/api/shift-surveys/digest-viewed", authRequired, shiftLeadOrManagerRequired, (req, res) => {
  const shiftDate = isValidShiftDate(req.body.shiftDate) ? req.body.shiftDate : todayDate();
  db.prepare(`
    INSERT OR IGNORE INTO shift_survey_digest_views (user_id, shift_date)
    VALUES (?, ?)
  `).run(req.user.id, shiftDate);
  res.json({ ok: true, shiftDate });
});

app.get("/api/reviews", async (req, res) => {
  try {
    const live = getLiveSyncStatus();
    if ((live.google || live.yelp) && shouldAutoRefreshReviews()) {
      await refreshReviewsFromApis().catch(err => console.warn("Review auto-refresh:", err.message));
    }

    const sourceId = (req.query.source || "").trim();
    const reviews = getCachedReviews(sourceId || null);
    let summary = getCachedSummary();
    if (!summary) {
      summary = buildLocalSummary(normalizeReviewsForSummary(reviews));
      saveReviewSummary(summary);
    }

    res.json({
      sources: getReviewSources(),
      reviews,
      summary,
      liveSync: live,
      lastRefreshed: summary.generatedAt || null
    });
  } catch (err) {
    console.error("Reviews error:", err.message);
    res.status(500).json({ error: "Could not load reviews." });
  }
});

app.post("/api/reviews/refresh", authRequired, adminRequired, async (req, res) => {
  try {
    const result = await refreshReviewsFromApis();
    res.json({
      ok: true,
      fetchedCount: result.fetchedCount,
      totalCached: result.totalCached,
      summary: result.summary,
      errors: result.errors,
      liveSync: result.live,
      sources: getReviewSources(),
      reviews: getCachedReviews()
    });
  } catch (err) {
    console.error("Review refresh error:", err.message);
    res.status(500).json({ error: err.message || "Could not refresh reviews." });
  }
});

registerMpInventory(app, db, { authRequired, inventoryManagerRequired, optionalAuth });

registerFloorOpsApi(app, {
  db,
  authRequired,
  managerOrAdminRequired,
  optionalAuth,
  todayDate,
  publicUser
});

registerPortalPolishApi(app, {
  db,
  authRequired,
  managerOrAdminRequired,
  optionalAuth,
  adminRequired,
  todayDate,
  getWorkingStaff,
  getUserStats,
  getBeerCheckins,
  getBeers,
  isBeerOnTap
});

app.get("/api/search", async (req, res) => {
  const q = String(req.query.q || "").trim();
  if (!q) return res.json({ results: [] });
  try {
    let beers = [];
    try {
      beers = await getBeers();
    } catch (_) {}
    const sops = getSopCatalog();
    const results = universalSearch(q, { beers, sops, foods: [] });
    res.json({ query: q, results });
  } catch (err) {
    res.status(500).json({ error: err.message || "Search failed." });
  }
});

app.get("/api/scenarios", (req, res) => {
  res.json({
    guest: GUEST_SCENARIOS,
    complaint: COMPLAINT_SCENARIOS,
    troubleshooting: TROUBLESHOOTING
  });
});

// ── Nucleus ────────────────────────────────────────────────────────────────
// The browser never talks to Nucleus directly. The bearer key would be a leaked
// credential in page JavaScript, and Nucleus's CORS admits only its own frontend
// origin, so a direct call is refused anyway. These routes are the seam.

function nucleusFailed(res, error, what) {
  if (error instanceof NucleusError) {
    console.error(`Nucleus: ${error.message}`);
    // 502, not 500: this app is fine, its upstream is not — and the distinction
    // is what tells whoever is paged where to look.
    return res.status(502).json({ error: `Could not load ${what} from Nucleus.` });
  }
  console.error(`Nucleus ${what} failed:`, error);
  return res.status(500).json({ error: `Could not load ${what}.` });
}

app.get("/api/beers", authRequired, async (req, res) => {
  if (!nucleus.configured()) {
    return res.status(503).json({
      error: "Beer data is not configured. Set NUCLEUS_BASE_URL and NUCLEUS_API_KEY."
    });
  }
  try {
    res.json({ beers: await nucleus.getBeerRows() });
  } catch (error) {
    return nucleusFailed(res, error, "the beer list");
  }
});

// Backs every beer picker. The whole catalog, inactive included — a favourite
// beer is very often a discontinued one.
app.get("/api/beers/options", authRequired, async (req, res) => {
  if (!nucleus.configured()) return res.json({ options: [] });
  try {
    res.json({ options: await nucleus.getPickerOptions() });
  } catch (error) {
    return nucleusFailed(res, error, "the beer catalog");
  }
});

app.get("/api/taps", authRequired, async (req, res) => {
  if (!nucleus.configured()) return res.json({ taps: [] });
  try {
    res.json({ taps: await nucleus.getTaps(), canWrite: nucleus.canWrite() });
  } catch (error) {
    return nucleusFailed(res, error, "the tap list");
  }
});

app.put("/api/taps/:tapId/product", authRequired, managerOrAdminRequired, async (req, res) => {
  const productId = String(req.body.productId || req.body.product_id || "").trim();
  if (!productId) return res.status(400).json({ error: "A beer is required." });
  if (!nucleus.canWrite()) {
    // Said plainly rather than as a 502 later: a read-only key here is a
    // configuration choice, and locally it is the *correct* one — the alternative
    // is a production write key on a laptop, where every click edits the real
    // taproom wall.
    return res.status(503).json({
      error: "This app is configured read-only for Nucleus. Set NUCLEUS_API_KEY_WRITE to change taps."
    });
  }
  try {
    res.json({ tap: await nucleus.setTapProduct(req.params.tapId, productId) });
  } catch (error) {
    return nucleusFailed(res, error, "the tap");
  }
});

app.delete("/api/taps/:tapId/product", authRequired, managerOrAdminRequired, async (req, res) => {
  if (!nucleus.canWrite()) {
    return res.status(503).json({
      error: "This app is configured read-only for Nucleus. Set NUCLEUS_API_KEY_WRITE to change taps."
    });
  }
  try {
    res.json({ tap: await nucleus.clearTap(req.params.tapId) });
  } catch (error) {
    return nucleusFailed(res, error, "the tap");
  }
});

// The page loads four browser scripts from disk, so something has to serve
// them. express.static(__dirname) would do it by serving the whole application
// directory — which also hands out server.js, seed.js, and (when DB_PATH is
// unset, as it is on Railway and Render) training.db and backups/ to anyone who
// asks. An explicit allowlist serves exactly what the browser needs, so a file
// added to the repo later is not published by accident.
//
// These are fetched before sign-in because the page cannot render its login
// gate without them. Keep that in mind before adding anything to the list:
// whatever is here is world-readable.
const CLIENT_SCRIPTS = new Set([
  "roles.js",
  "site-features.js",
  "ops-content.js",
  "floor-tools.js"
]);

app.get("/:file", (req, res, next) => {
  if (!CLIENT_SCRIPTS.has(req.params.file)) return next();
  res.sendFile(path.join(__dirname, req.params.file));
});

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

const server = app.listen(PORT, () => {
  maybeAutoSeedOnFirstBoot();
  ensureMerchCatalog();
  ensureSampleSops();
  ensureSevenShiftsTables(db);
  console.log(`MP Training server running on port ${PORT}`);
  console.log(`Database: ${DB_PATH} (${Math.max(1, Math.round(fs.statSync(DB_PATH).size / 1024))} KB)`);
  console.log(`Microsoft sign-in: ${microsoftAuthEnabled ? "enabled" : "disabled (set AZURE_CLIENT_ID + AZURE_CLIENT_SECRET)"}`);
  if (devLoginEnabled) {
    console.log("Dev sign-in: ENABLED — any seeded account, no password, localhost only. Never set DEV_LOGIN=1 on a deployed host.");
  }
  console.log(`7shifts sync: ${sevenShifts.isConfigured() ? "enabled" : "disabled (set SEVEN_SHIFTS_ACCESS_TOKEN + SEVEN_SHIFTS_COMPANY_ID)"}`);

  if (sevenShifts.isConfigured()) {
    const runSync = () => {
      syncSevenShifts(db)
        .then(result => {
          if (!result.skipped) {
            console.log(`7shifts synced ${result.kept} shifts (${result.users} users).`);
          }
        })
        .catch(err => console.warn("7shifts sync failed:", err.message));
    };
    runSync();
    setInterval(runSync, Number(process.env.SEVEN_SHIFTS_SYNC_MS) || 5 * 60 * 1000);
  }

  // Backs up immediately, then hourly checks that today's snapshot exists.
  startBackupSchedule(db);
});

/**
 * Railway sends SIGTERM to replace the container on every deploy. Without a
 * handler the process dies from the signal, exits non-zero, and Railway reports
 * a crash for what is a routine redeploy. Stop accepting connections, close the
 * database so the file on the volume is left clean, then exit 0.
 */
let shuttingDown = false;

function shutdown(signal) {
  if (shuttingDown) return;
  shuttingDown = true;
  console.log(`${signal} received — shutting down.`);

  // Timers (7shifts sync, backup schedule) keep the event loop alive, so exit
  // explicitly rather than waiting for it to drain.
  const finish = (code) => {
    try {
      db.close();
    } catch (err) {
      console.warn("Database close failed:", err.message);
    }
    process.exit(code);
  };

  // Don't let a hung connection hold the container past Railway's grace period.
  const forced = setTimeout(() => {
    console.warn("Shutdown timed out — exiting anyway.");
    finish(0);
  }, 10000);
  forced.unref();

  server.close((err) => {
    if (err) console.warn("Server close failed:", err.message);
    clearTimeout(forced);
    finish(0);
  });
}

process.on("SIGTERM", () => shutdown("SIGTERM"));
process.on("SIGINT", () => shutdown("SIGINT"));
