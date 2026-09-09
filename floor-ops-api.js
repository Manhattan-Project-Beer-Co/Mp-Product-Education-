/**
 * Floor ops APIs: 86 board, handoff, sell-this-today, maintenance,
 * shout-outs, skills, first-5, team challenges, feedback pipeline extras.
 */

const { hasShiftLeadCapability } = require("./roles");

const TRAINING_STATUSES = ["not_introduced", "learning", "can_do", "verified", "needs_practice"];

function ensureFloorOpsTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS availability_board (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category TEXT NOT NULL DEFAULT 'other',
      item_name TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('86','low','out')),
      notes TEXT NOT NULL DEFAULT '',
      created_by INTEGER,
      updated_by INTEGER,
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_availability_active ON availability_board(active, status);

    CREATE TABLE IF NOT EXISTS shift_handoffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_date TEXT NOT NULL,
      note TEXT NOT NULL,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      active INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_handoffs_active ON shift_handoffs(active, expires_at);

    CREATE TABLE IF NOT EXISTS sell_this_today (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL DEFAULT 'beer',
      item_name TEXT NOT NULL,
      talking_points TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      starts_on TEXT NOT NULL,
      ends_on TEXT,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sell_this_completions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      challenge_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      action TEXT NOT NULL,
      points INTEGER NOT NULL DEFAULT 0,
      completed_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(challenge_id, user_id, action),
      FOREIGN KEY (challenge_id) REFERENCES sell_this_today(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS maintenance_tickets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      area TEXT NOT NULL DEFAULT 'General',
      severity TEXT NOT NULL DEFAULT 'medium',
      status TEXT NOT NULL DEFAULT 'reported',
      photo_url TEXT NOT NULL DEFAULT '',
      reported_by INTEGER,
      assigned_to INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (reported_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS staff_shoutouts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      from_user_id INTEGER,
      to_user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      highlight INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (from_user_id) REFERENCES users(id),
      FOREIGN KEY (to_user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS staff_skills (
      user_id INTEGER NOT NULL,
      skill_key TEXT NOT NULL,
      level TEXT NOT NULL DEFAULT 'none',
      signed_off_by INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, skill_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS first_five_progress (
      user_id INTEGER NOT NULL,
      shift_number INTEGER NOT NULL CHECK(shift_number BETWEEN 1 AND 5),
      skill_key TEXT NOT NULL,
      demonstrated INTEGER NOT NULL DEFAULT 0,
      signed_off_by INTEGER,
      signed_off_at TEXT,
      PRIMARY KEY (user_id, shift_number, skill_key),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS team_challenges (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      goal_count INTEGER NOT NULL DEFAULT 50,
      progress_count INTEGER NOT NULL DEFAULT 0,
      reward TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS checklist_photos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      checklist_id TEXT NOT NULL,
      task_id TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      user_id INTEGER,
      photo_url TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS recipe_batches (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      base_yield TEXT NOT NULL DEFAULT '1 batch',
      ingredients_json TEXT NOT NULL,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Remove an old development fixture that should never appear as a live floor push.
  db.prepare("UPDATE sell_this_today SET active = 0 WHERE item_name = 'Test New IPA'").run();

  const fbCols = new Set(db.prepare("PRAGMA table_info(site_feedback)").all().map(c => c.name));
  if (!fbCols.has("pipeline_status")) {
    db.exec(`ALTER TABLE site_feedback ADD COLUMN pipeline_status TEXT NOT NULL DEFAULT 'submitted'`);
  }
  if (!fbCols.has("suggested_by_name")) {
    db.exec(`ALTER TABLE site_feedback ADD COLUMN suggested_by_name TEXT NOT NULL DEFAULT ''`);
  }
  if (!fbCols.has("implemented_note")) {
    db.exec(`ALTER TABLE site_feedback ADD COLUMN implemented_note TEXT NOT NULL DEFAULT ''`);
  }

  const fiveCols = new Set(db.prepare("PRAGMA table_info(first_five_progress)").all().map((c) => c.name));
  if (!fiveCols.has("status")) {
    db.exec(`ALTER TABLE first_five_progress ADD COLUMN status TEXT NOT NULL DEFAULT ''`);
  }
  db.exec(`
    CREATE TABLE IF NOT EXISTS training_handoffs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      trainee_id INTEGER NOT NULL,
      shift_number INTEGER NOT NULL CHECK(shift_number BETWEEN 1 AND 5),
      strength TEXT NOT NULL DEFAULT '',
      needs_practice TEXT NOT NULL DEFAULT '',
      next_focus TEXT NOT NULL DEFAULT '',
      note TEXT NOT NULL DEFAULT '',
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (trainee_id) REFERENCES users(id),
      FOREIGN KEY (created_by) REFERENCES users(id)
    );
  `);
  db.prepare(`
    UPDATE first_five_progress
    SET status = 'verified'
    WHERE demonstrated = 1 AND (status IS NULL OR status = '')
  `).run();
}

const SKILL_KEYS = [
  { key: "beer", label: "Beer" },
  { key: "coffee", label: "Coffee" },
  { key: "bar", label: "Bar" },
  { key: "events", label: "Events" },
  { key: "opening", label: "Opening" },
  { key: "closing", label: "Closing" },
  { key: "training", label: "Training" },
  { key: "shift_lead", label: "Shift Lead" },
  { key: "pour_over", label: "Pour-over" },
  { key: "inventory", label: "Inventory" }
];

const FIRST_FIVE = [
  {
    shift: 1,
    title: "Shift 1 — Foundations + Flow",
    goal: "Understand how MP operates.",
    focus: "Learn the room, Launch Pad, how we talk about beer, and when to stop and ask about allergens.",
    mission: "Get oriented so you can work a shift without getting lost.",
    skills: ["login_portal", "find_on_tap", "ask_mp", "allergy_confirm", "taste_one_beer"]
  },
  {
    shift: 2,
    title: "Shift 2 — Floor + Bar Readiness",
    goal: "Prepare yourself and your area for service.",
    focus: "Guest greet, beer styles, coffee menu, and how we close the day.",
    mission: "Show up ready — greet, know the menus, leave a clean handoff.",
    skills: ["guest_greet", "style_basics", "coffee_menu", "end_of_shift"]
  },
  {
    shift: 3,
    title: "Shift 3 — Service Systems",
    goal: "Understand how service moves and how to support it.",
    focus: "Checklists, SOPs, and the 86 board — the systems that keep the floor honest.",
    mission: "Run service confidently without waiting to be told what to do.",
    skills: ["checklist_run", "sop_lookup", "86_board"]
  },
  {
    shift: 4,
    title: "Shift 4 — Bar + Order Execution",
    goal: "Perform key service tasks confidently.",
    focus: "Sell This Today, pairing talk, and recovering when a guest is unhappy.",
    mission: "Take the order, recommend with confidence, and recover cleanly.",
    skills: ["sell_this", "pairing_talk", "recovery_scenario"]
  },
  {
    shift: 5,
    title: "Shift 5 — Ownership + Checkout",
    goal: "Begin operating independently.",
    focus: "Own a slice of service, know what’s on the books, and get trainer sign-off.",
    mission: "Work your section like it’s yours — then check out clean.",
    skills: ["independent_service", "events_awareness", "trainer_signoff"]
  }
];

const FIRST_FIVE_SKILL_SET = new Set(FIRST_FIVE.flatMap((block) => block.skills));

function trainerUser(db, req) {
  if (!req.user?.id) return null;
  return db.prepare("SELECT id, name, email, role, extra_roles FROM users WHERE id = ?").get(req.user.id);
}

function isTrainer(db, req) {
  return hasShiftLeadCapability(trainerUser(db, req));
}

function progressStatus(row) {
  if (!row) return "not_introduced";
  const status = String(row.status || "").trim();
  if (TRAINING_STATUSES.includes(status)) return status;
  return row.demonstrated ? "verified" : "learning";
}

function mapProgressRow(row) {
  const status = progressStatus(row);
  return {
    user_id: row.user_id,
    shift_number: row.shift_number,
    skill_key: row.skill_key,
    demonstrated: status === "verified" || Boolean(row.demonstrated),
    status,
    signed_off_by: row.signed_off_by || null,
    signed_off_at: row.signed_off_at || null
  };
}

function latestHandoff(db, traineeId) {
  return db.prepare(`
    SELECT h.*, u.name AS trainer_name
    FROM training_handoffs h
    LEFT JOIN users u ON u.id = h.created_by
    WHERE h.trainee_id = ?
    ORDER BY h.created_at DESC, h.id DESC
    LIMIT 1
  `).get(traineeId) || null;
}

function mapHandoff(row) {
  if (!row) return null;
  return {
    id: row.id,
    traineeId: row.trainee_id,
    shiftNumber: row.shift_number,
    strength: row.strength || "",
    needsPractice: row.needs_practice || "",
    nextFocus: row.next_focus || "",
    note: row.note || "",
    trainerName: row.trainer_name || "",
    createdAt: row.created_at
  };
}

function computeUnlockFromRows(rows) {
  const done = new Set(
    (rows || [])
      .map(mapProgressRow)
      .filter((row) => row.status === "verified")
      .map((row) => `${row.shift_number}:${row.skill_key}`)
  );
  let unlocked = 1;
  for (let shift = 1; shift <= 5; shift += 1) {
    const block = FIRST_FIVE.find((item) => item.shift === shift);
    if (!block) break;
    const complete = block.skills.every((sk) => done.has(`${shift}:${sk}`));
    if (complete) unlocked = Math.min(5, shift + 1);
    else {
      unlocked = shift;
      break;
    }
  }
  return { done, unlockedShift: unlocked };
}

function expireHandoffs(db) {
  db.prepare(`
    UPDATE shift_handoffs
    SET active = 0
    WHERE active = 1 AND expires_at < datetime('now')
  `).run();
}

function registerFloorOpsApi(app, {
  db,
  authRequired,
  managerOrAdminRequired,
  optionalAuth,
  todayDate,
  publicUser
}) {
  ensureFloorOpsTables(db);

  // ── Availability / 86 board ──
  app.get("/api/availability", optionalAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT a.*, u.name AS created_by_name
      FROM availability_board a
      LEFT JOIN users u ON u.id = a.created_by
      WHERE a.active = 1
      ORDER BY
        CASE a.status WHEN '86' THEN 0 WHEN 'out' THEN 1 ELSE 2 END,
        a.updated_at DESC
    `).all();
    res.json({ items: rows });
  });

  app.post("/api/availability", authRequired, (req, res) => {
    const itemName = String(req.body.itemName || "").trim().slice(0, 120);
    const category = String(req.body.category || "other").trim().slice(0, 40);
    const status = String(req.body.status || "86").trim();
    const notes = String(req.body.notes || "").trim().slice(0, 500);
    if (!itemName) return res.status(400).json({ error: "Item name required." });
    if (!["86", "low", "out"].includes(status)) {
      return res.status(400).json({ error: "Status must be 86, low, or out." });
    }
    const result = db.prepare(`
      INSERT INTO availability_board (category, item_name, status, notes, created_by, updated_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(category, itemName, status, notes, req.user.id, req.user.id);
    const row = db.prepare("SELECT * FROM availability_board WHERE id = ?").get(result.lastInsertRowid);
    res.json({ ok: true, item: row });
  });

  app.patch("/api/availability/:id", authRequired, (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM availability_board WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Not found." });
    const status = req.body.status != null ? String(req.body.status) : existing.status;
    const notes = req.body.notes != null ? String(req.body.notes).trim().slice(0, 500) : existing.notes;
    const active = req.body.active != null ? (req.body.active ? 1 : 0) : existing.active;
    if (!["86", "low", "out"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    db.prepare(`
      UPDATE availability_board
      SET status = ?, notes = ?, active = ?, updated_by = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, notes, active, req.user.id, id);
    res.json({ ok: true, item: db.prepare("SELECT * FROM availability_board WHERE id = ?").get(id) });
  });

  // ── Handoff notes ──
  app.get("/api/handoffs", authRequired, (req, res) => {
    expireHandoffs(db);
    const rows = db.prepare(`
      SELECT h.*, u.name AS author_name
      FROM shift_handoffs h
      LEFT JOIN users u ON u.id = h.created_by
      WHERE h.active = 1
      ORDER BY h.created_at DESC
      LIMIT 20
    `).all();
    res.json({ notes: rows });
  });

  app.post("/api/handoffs", authRequired, (req, res) => {
    expireHandoffs(db);
    const note = String(req.body.note || "").trim().slice(0, 500);
    if (!note) return res.status(400).json({ error: "Note required." });
    const shiftDate = todayDate();
    const hours = Number(req.body.expiresHours) || 16;
    db.prepare(`
      INSERT INTO shift_handoffs (shift_date, note, created_by, expires_at)
      VALUES (?, ?, ?, datetime('now', ?))
    `).run(shiftDate, note, req.user.id, `+${Math.min(48, Math.max(4, hours))} hours`);
    const notes = db.prepare(`
      SELECT h.*, u.name AS author_name
      FROM shift_handoffs h
      LEFT JOIN users u ON u.id = h.created_by
      WHERE h.active = 1
      ORDER BY h.created_at DESC
      LIMIT 20
    `).all();
    res.json({ ok: true, notes });
  });

  app.delete("/api/handoffs/:id", authRequired, (req, res) => {
    db.prepare("UPDATE shift_handoffs SET active = 0 WHERE id = ?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Sell This Today ──
  app.get("/api/sell-this-today", optionalAuth, (req, res) => {
    const today = todayDate();
    const challenge = db.prepare(`
      SELECT * FROM sell_this_today
      WHERE active = 1 AND starts_on <= ? AND (ends_on IS NULL OR ends_on >= ?)
      ORDER BY id DESC LIMIT 1
    `).get(today, today);
    let myCompletions = [];
    if (challenge && req.user) {
      myCompletions = db.prepare(`
        SELECT action, points, completed_at FROM sell_this_completions
        WHERE challenge_id = ? AND user_id = ?
      `).all(challenge.id, req.user.id);
    }
    res.json({ challenge: challenge || null, myCompletions });
  });

  app.post("/api/sell-this-today", authRequired, managerOrAdminRequired, (req, res) => {
    const itemName = String(req.body.itemName || "").trim().slice(0, 120);
    const itemType = String(req.body.itemType || "beer").trim().slice(0, 40);
    const talkingPoints = String(req.body.talkingPoints || "").trim().slice(0, 1000);
    if (!itemName) return res.status(400).json({ error: "Item name required." });
    db.prepare("UPDATE sell_this_today SET active = 0 WHERE active = 1").run();
    const result = db.prepare(`
      INSERT INTO sell_this_today (item_type, item_name, talking_points, starts_on, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(itemType, itemName, talkingPoints, todayDate(), req.user.id);
    res.json({
      ok: true,
      challenge: db.prepare("SELECT * FROM sell_this_today WHERE id = ?").get(result.lastInsertRowid)
    });
  });

  app.delete("/api/sell-this-today", authRequired, managerOrAdminRequired, (req, res) => {
    db.prepare("UPDATE sell_this_today SET active = 0 WHERE active = 1").run();
    res.json({ ok: true, challenge: null });
  });

  app.post("/api/sell-this-today/complete", authRequired, (req, res) => {
    const today = todayDate();
    const challenge = db.prepare(`
      SELECT * FROM sell_this_today
      WHERE active = 1 AND starts_on <= ? AND (ends_on IS NULL OR ends_on >= ?)
      ORDER BY id DESC LIMIT 1
    `).get(today, today);
    if (!challenge) return res.status(404).json({ error: "No active Sell This Today challenge." });
    const action = String(req.body.action || "learn").trim();
    if (!["learn", "quiz", "tasting"].includes(action)) {
      return res.status(400).json({ error: "Action must be learn, quiz, or tasting." });
    }
    const points = action === "learn" ? 10 : action === "quiz" ? 25 : 20;
    try {
      db.prepare(`
        INSERT INTO sell_this_completions (challenge_id, user_id, action, points)
        VALUES (?, ?, ?, ?)
      `).run(challenge.id, req.user.id, action, points);
      db.prepare(`
        INSERT INTO progress_sessions (user_id, activity_type, category, score, total, points)
        VALUES (?, 'sell_this', ?, 1, 1, ?)
      `).run(req.user.id, challenge.item_type || "beer", points);
      const team = db.prepare("SELECT id, progress_count FROM team_challenges WHERE active = 1 ORDER BY id DESC LIMIT 1").get();
      if (team) {
        db.prepare("UPDATE team_challenges SET progress_count = progress_count + 1 WHERE id = ?").run(team.id);
      }
    } catch {
      return res.status(409).json({ error: "Already completed that action today." });
    }
    res.json({ ok: true, points });
  });

  // ── Maintenance ──
  app.get("/api/maintenance", authRequired, (req, res) => {
    const rows = db.prepare(`
      SELECT t.*, r.name AS reporter_name, a.name AS assignee_name
      FROM maintenance_tickets t
      LEFT JOIN users r ON r.id = t.reported_by
      LEFT JOIN users a ON a.id = t.assigned_to
      ORDER BY
        CASE t.status WHEN 'reported' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
        CASE t.severity WHEN 'critical' THEN 0 WHEN 'high' THEN 1 WHEN 'medium' THEN 2 ELSE 3 END,
        t.created_at DESC
      LIMIT 100
    `).all();
    res.json({ tickets: rows });
  });

  app.post("/api/maintenance", authRequired, (req, res) => {
    const title = String(req.body.title || "").trim().slice(0, 160);
    const description = String(req.body.description || "").trim().slice(0, 2000);
    const area = String(req.body.area || "General").trim().slice(0, 60);
    const severity = String(req.body.severity || "medium").trim();
    const photoUrl = String(req.body.photoUrl || "").trim().slice(0, 2_000_000);
    if (!title) return res.status(400).json({ error: "Title required." });
    if (!["low", "medium", "high", "critical"].includes(severity)) {
      return res.status(400).json({ error: "Invalid severity." });
    }
    const result = db.prepare(`
      INSERT INTO maintenance_tickets (title, description, area, severity, photo_url, reported_by)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(title, description, area, severity, photoUrl, req.user.id);
    res.json({ ok: true, ticket: db.prepare("SELECT * FROM maintenance_tickets WHERE id = ?").get(result.lastInsertRowid) });
  });

  app.patch("/api/maintenance/:id", authRequired, (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM maintenance_tickets WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Not found." });
    const status = req.body.status != null ? String(req.body.status) : existing.status;
    if (!["reported", "in_progress", "fixed"].includes(status)) {
      return res.status(400).json({ error: "Invalid status." });
    }
    const assignedTo = req.body.assignedTo != null ? Number(req.body.assignedTo) || null : existing.assigned_to;
    db.prepare(`
      UPDATE maintenance_tickets
      SET status = ?, assigned_to = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(status, assignedTo, id);
    res.json({ ok: true, ticket: db.prepare("SELECT * FROM maintenance_tickets WHERE id = ?").get(id) });
  });

  // ── Shout-outs ──
  app.get("/api/shoutouts", authRequired, (req, res) => {
    const rows = db.prepare(`
      SELECT s.*, f.name AS from_name, t.name AS to_name
      FROM staff_shoutouts s
      LEFT JOIN users f ON f.id = s.from_user_id
      JOIN users t ON t.id = s.to_user_id
      ORDER BY s.created_at DESC
      LIMIT 40
    `).all();
    res.json({ shoutouts: rows });
  });

  app.post("/api/shoutouts", authRequired, (req, res) => {
    const toUserId = Number(req.body.toUserId);
    const message = String(req.body.message || "").trim().slice(0, 280);
    if (!toUserId || !message) return res.status(400).json({ error: "Recipient and message required." });
    const highlight = req.body.highlight ? 1 : 0;
    db.prepare(`
      INSERT INTO staff_shoutouts (from_user_id, to_user_id, message, highlight)
      VALUES (?, ?, ?, ?)
    `).run(req.user.id, toUserId, message, highlight);
    res.json({ ok: true });
  });

  // ── Skills ──
  app.get("/api/skills", authRequired, (req, res) => {
    const users = db.prepare(`
      SELECT id, name, role FROM users
      WHERE role IN ('bartender','trainee','event_lead','shift_lead','merch','manager','admin','inventory_admin')
      ORDER BY name ASC
    `).all();
    const levels = db.prepare("SELECT * FROM staff_skills").all();
    const byUser = {};
    for (const row of levels) {
      if (!byUser[row.user_id]) byUser[row.user_id] = {};
      byUser[row.user_id][row.skill_key] = row.level;
    }
    res.json({
      skills: SKILL_KEYS,
      matrix: users.map(u => ({
        id: u.id,
        name: u.name,
        role: u.role,
        levels: byUser[u.id] || {}
      }))
    });
  });

  app.put("/api/skills/:userId/:skillKey", authRequired, managerOrAdminRequired, (req, res) => {
    const userId = Number(req.params.userId);
    const skillKey = String(req.params.skillKey);
    const level = String(req.body.level || "none");
    if (!SKILL_KEYS.some(s => s.key === skillKey)) {
      return res.status(400).json({ error: "Unknown skill." });
    }
    if (!["none", "learning", "proficient"].includes(level)) {
      return res.status(400).json({ error: "Level must be none, learning, or proficient." });
    }
    db.prepare(`
      INSERT INTO staff_skills (user_id, skill_key, level, signed_off_by, updated_at)
      VALUES (?, ?, ?, ?, datetime('now'))
      ON CONFLICT(user_id, skill_key) DO UPDATE SET
        level = excluded.level,
        signed_off_by = excluded.signed_off_by,
        updated_at = excluded.updated_at
    `).run(userId, skillKey, level, req.user.id);
    res.json({ ok: true });
  });

  app.get("/api/skills/who-knows", authRequired, (req, res) => {
    const skillKey = String(req.query.skill || "").trim();
    if (!skillKey) return res.status(400).json({ error: "skill query required." });
    const trained = db.prepare(`
      SELECT u.id, u.name, u.email, s.level
      FROM staff_skills s
      JOIN users u ON u.id = s.user_id
      WHERE s.skill_key = ? AND s.level IN ('learning','proficient')
      ORDER BY CASE s.level WHEN 'proficient' THEN 0 ELSE 1 END, u.name ASC
    `).all(skillKey);
    res.json({ skillKey, people: trained });
  });

  // ── First 5 Shifts ──
  app.get("/api/first-five/me", authRequired, (req, res) => {
    const rows = db.prepare(`
      SELECT * FROM first_five_progress WHERE user_id = ?
    `).all(req.user.id);
    res.json({
      curriculum: FIRST_FIVE,
      progress: rows.map(mapProgressRow),
      handoff: mapHandoff(latestHandoff(db, req.user.id)),
      canTrain: isTrainer(db, req)
    });
  });

  app.get("/api/first-five/roster", authRequired, (req, res) => {
    if (!isTrainer(db, req)) {
      return res.status(403).json({ error: "Trainer, shift lead, or manager access required." });
    }
    const people = db.prepare(`
      SELECT id, name, role FROM users
      WHERE role IN ('trainee', 'employee')
      ORDER BY name COLLATE NOCASE ASC
    `).all();
    const trainees = people.map((person) => {
      const rows = db.prepare("SELECT * FROM first_five_progress WHERE user_id = ?").all(person.id);
      const mapped = rows.map(mapProgressRow);
      const { unlockedShift } = computeUnlockFromRows(rows);
      const block = FIRST_FIVE.find((item) => item.shift === unlockedShift) || FIRST_FIVE[0];
      const skills = (block?.skills || []).map((skillKey) => {
        const row = mapped.find((item) => item.shift_number === unlockedShift && item.skill_key === skillKey);
        return { skillKey, status: row?.status || "not_introduced" };
      });
      return {
        id: person.id,
        name: person.name,
        role: person.role,
        unlockedShift,
        shiftTitle: block?.title || `Shift ${unlockedShift}`,
        skills,
        handoff: mapHandoff(latestHandoff(db, person.id))
      };
    });
    res.json({ trainees, curriculum: FIRST_FIVE, canTrain: true });
  });

  function upsertProgress(db, { userId, shiftNumber, skillKey, status, signedOffBy }) {
    const demonstrated = status === "verified" ? 1 : 0;
    const stamp = status === "verified" || status === "needs_practice" ? 1 : 0;
    db.prepare(`
      INSERT INTO first_five_progress (user_id, shift_number, skill_key, demonstrated, status, signed_off_by, signed_off_at)
      VALUES (?, ?, ?, ?, ?, ?, CASE WHEN ? = 1 THEN datetime('now') ELSE NULL END)
      ON CONFLICT(user_id, shift_number, skill_key) DO UPDATE SET
        demonstrated = excluded.demonstrated,
        status = excluded.status,
        signed_off_by = excluded.signed_off_by,
        signed_off_at = CASE WHEN ? = 1 THEN datetime('now') ELSE first_five_progress.signed_off_at END
    `).run(userId, shiftNumber, skillKey, demonstrated, status, signedOffBy, stamp, stamp);
  }

  app.post("/api/first-five/signoff", authRequired, (req, res) => {
    const targetUserId = Number(req.body.userId || req.user.id);
    const shiftNumber = Number(req.body.shiftNumber);
    const skillKey = String(req.body.skillKey || "").trim();
    const requested = String(req.body.status || "verified").trim();
    const status = TRAINING_STATUSES.includes(requested) ? requested : "verified";
    if (!shiftNumber || !FIRST_FIVE_SKILL_SET.has(skillKey)) {
      return res.status(400).json({ error: "shiftNumber and a known skillKey are required." });
    }
    const trainer = isTrainer(db, req);
    if (targetUserId !== req.user.id && !trainer) {
      return res.status(403).json({ error: "Only trainers can update another person's training." });
    }
    if ((status === "verified" || status === "needs_practice") && !trainer) {
      return res.status(403).json({ error: "Ask your trainer to verify or mark needs practice." });
    }
    if (!trainer && !["learning", "can_do"].includes(status)) {
      return res.status(403).json({ error: "You can mark a skill learning or can-do. Your trainer verifies." });
    }
    upsertProgress(db, {
      userId: targetUserId,
      shiftNumber,
      skillKey,
      status,
      signedOffBy: req.user.id
    });
    res.json({ ok: true, status });
  });

  app.post("/api/first-five/handoff", authRequired, (req, res) => {
    if (!isTrainer(db, req)) {
      return res.status(403).json({ error: "Trainer, shift lead, or manager access required." });
    }
    const traineeId = Number(req.body.traineeId);
    const shiftNumber = Number(req.body.shiftNumber) || 1;
    if (!traineeId) return res.status(400).json({ error: "traineeId required." });
    const trainee = db.prepare("SELECT id FROM users WHERE id = ?").get(traineeId);
    if (!trainee) return res.status(404).json({ error: "Trainee not found." });
    db.prepare(`
      INSERT INTO training_handoffs (trainee_id, shift_number, strength, needs_practice, next_focus, note, created_by)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(
      traineeId,
      Math.max(1, Math.min(5, shiftNumber)),
      String(req.body.strength || "").trim().slice(0, 400),
      String(req.body.needsPractice || "").trim().slice(0, 400),
      String(req.body.nextFocus || "").trim().slice(0, 400),
      String(req.body.note || "").trim().slice(0, 400),
      req.user.id
    );
    res.json({ ok: true, handoff: mapHandoff(latestHandoff(db, traineeId)) });
  });

  // ── Team challenges ──
  app.get("/api/team-challenges", optionalAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT * FROM team_challenges WHERE active = 1 ORDER BY id DESC LIMIT 5
    `).all();
    res.json({ challenges: rows });
  });

  app.post("/api/team-challenges", authRequired, managerOrAdminRequired, (req, res) => {
    const title = String(req.body.title || "").trim().slice(0, 160);
    const goalCount = Number(req.body.goalCount) || 50;
    const reward = String(req.body.reward || "").trim().slice(0, 200);
    if (!title) return res.status(400).json({ error: "Title required." });
    const result = db.prepare(`
      INSERT INTO team_challenges (title, goal_count, reward)
      VALUES (?, ?, ?)
    `).run(title, goalCount, reward);
    res.json({ ok: true, challenge: db.prepare("SELECT * FROM team_challenges WHERE id = ?").get(result.lastInsertRowid) });
  });

  // ── Feedback pipeline ──
  app.patch("/api/site-feedback/:id/pipeline", authRequired, managerOrAdminRequired, (req, res) => {
    const id = Number(req.params.id);
    const pipeline = String(req.body.pipelineStatus || "").trim();
    const allowed = ["submitted", "reviewing", "planned", "built"];
    if (!allowed.includes(pipeline)) {
      return res.status(400).json({ error: "Invalid pipeline status." });
    }
    const note = String(req.body.implementedNote || "").trim().slice(0, 400);
    db.prepare(`
      UPDATE site_feedback
      SET pipeline_status = ?, implemented_note = ?, status = CASE WHEN ? = 'built' THEN 'resolved' ELSE status END
      WHERE id = ?
    `).run(pipeline, note, pipeline, id);
    res.json({ ok: true });
  });

  // ── Pre-shift huddle + morning digest ──
  app.get("/api/huddle", authRequired, async (req, res) => {
    expireHandoffs(db);
    const today = todayDate();
    const eightySix = db.prepare(`
      SELECT category, item_name, status, notes FROM availability_board
      WHERE active = 1 ORDER BY updated_at DESC LIMIT 12
    `).all();
    const handoffs = db.prepare(`
      SELECT note, created_at FROM shift_handoffs WHERE active = 1 ORDER BY created_at DESC LIMIT 5
    `).all();
    const sell = db.prepare(`
      SELECT item_name, item_type, talking_points FROM sell_this_today
      WHERE active = 1 AND starts_on <= ? AND (ends_on IS NULL OR ends_on >= ?)
      ORDER BY id DESC LIMIT 1
    `).get(today, today);
    const shout = db.prepare(`
      SELECT s.message, t.name AS to_name
      FROM staff_shoutouts s
      JOIN users t ON t.id = s.to_user_id
      WHERE s.highlight = 1 OR date(s.created_at) = date('now')
      ORDER BY s.created_at DESC LIMIT 3
    `).all();
    const trainingQuestion = [
      "What's the house espresso bean right now, and where do you check tasting notes?",
      "Name one gluten-reduced beer talking point and when to escalate allergen questions.",
      "Where do you find today's 86s before approaching a table?",
      "What's on Sell This Today, and give one guest line.",
      "What's the first step if the espresso shot tastes sour?"
    ][new Date().getDay() % 5];

    res.json({
      shiftDate: today,
      durationHint: "约 60 seconds",
      sections: {
        eightySix,
        handoffs,
        sellThis: sell || null,
        shoutouts: shout,
        trainingQuestion,
        pushItem: sell?.item_name || "Ask the lead what's featured tonight",
        opsReminder: handoffs[0]?.note || "Check the 86 board and patio before first seating."
      }
    });
  });

  app.get("/api/manager/morning-digest", authRequired, managerOrAdminRequired, (req, res) => {
    const yesterday = db.prepare(`SELECT date('now', '-1 day') AS d`).get().d;
    const surveys = db.prepare(`
      SELECT COUNT(*) AS count, ROUND(AVG(rating), 1) AS avg_rating
      FROM shift_surveys WHERE shift_date = ?
    `).get(yesterday);
    const openFeedback = db.prepare(`
      SELECT COUNT(*) AS count FROM site_feedback WHERE status = 'open'
    `).get();
    const maint = db.prepare(`
      SELECT COUNT(*) AS count FROM maintenance_tickets WHERE status != 'fixed'
    `).get();
    const eightySix = db.prepare(`
      SELECT COUNT(*) AS count FROM availability_board WHERE active = 1
    `).get();
    const missed = db.prepare(`
      SELECT activity_type, COUNT(*) AS attempts,
             SUM(CASE WHEN score * 1.0 / total < 0.7 THEN 1 ELSE 0 END) AS weak
      FROM progress_sessions
      WHERE completed_at >= datetime('now', '-7 days') AND total > 0
      GROUP BY activity_type
      ORDER BY weak DESC
      LIMIT 8
    `).all();
    const shoutouts = db.prepare(`
      SELECT s.message, t.name AS to_name, s.created_at
      FROM staff_shoutouts s
      JOIN users t ON t.id = s.to_user_id
      WHERE s.created_at >= datetime('now', '-2 days')
      ORDER BY s.created_at DESC LIMIT 5
    `).all();

    res.json({
      date: todayDate(),
      yesterdaySurveys: surveys,
      openFeedback: openFeedback.count,
      openMaintenance: maint.count,
      activeEightySix: eightySix.count,
      trainingGaps: missed,
      shoutouts
    });
  });

  app.get("/api/manager/knowledge-gaps", authRequired, managerOrAdminRequired, (req, res) => {
    const gaps = db.prepare(`
      SELECT activity_type,
             COUNT(*) AS attempts,
             ROUND(AVG(score * 100.0 / total), 1) AS avg_accuracy,
             SUM(CASE WHEN score * 1.0 / total < 0.6 THEN 1 ELSE 0 END) AS misses
      FROM progress_sessions
      WHERE completed_at >= datetime('now', '-14 days') AND total > 0
      GROUP BY activity_type
      HAVING attempts >= 3
      ORDER BY misses DESC, avg_accuracy ASC
      LIMIT 15
    `).all();
    res.json({
      gaps,
      weeklyTrainingPrompt: gaps[0]
        ? `Focus tomorrow's pre-shift on ${gaps[0].activity_type} — team avg ${gaps[0].avg_accuracy}% with ${gaps[0].misses} weak attempts.`
        : "Not enough quiz data yet this week."
    });
  });

  // Seed default recipe if empty
  const recipeCount = db.prepare("SELECT COUNT(*) AS c FROM recipe_batches").get().c;
  if (!recipeCount) {
    db.prepare(`
      INSERT INTO recipe_batches (title, base_yield, ingredients_json)
      VALUES (?, ?, ?)
    `).run(
      "Michelada Mix (Mich. Mix)",
      "1 batch",
      JSON.stringify([
        { name: "Limes, strained", amount: 10, unit: "each" },
        { name: "Dry mix", amount: 77.5, unit: "g" },
        { name: "Clamato", amount: 1, unit: "can" },
        { name: "Worcestershire", amount: 1, unit: "small cup" },
        { name: "Tabasco", amount: 0.5, unit: "small cup" }
      ])
    );
  }

  app.get("/api/recipes/batches", (req, res) => {
    const rows = db.prepare("SELECT * FROM recipe_batches ORDER BY title ASC").all().map(row => ({
      ...row,
      ingredients: JSON.parse(row.ingredients_json || "[]")
    }));
    res.json({ recipes: rows });
  });

  return { SKILL_KEYS, FIRST_FIVE };
}

module.exports = {
  ensureFloorOpsTables,
  registerFloorOpsApi,
  SKILL_KEYS,
  FIRST_FIVE
};
