/**
 * Remaining portal polish: photo standards, checklist photos, achievements/streaks,
 * tap-change + menu packages, weekly training, deeper analytics, on-shift who-knows.
 */

const { localDateKey } = require("./seven-shifts-sync");
const { SECRET_ACHIEVEMENTS } = require("./ops-content");

function ensurePolishTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS photo_standards (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      area TEXT NOT NULL,
      title TEXT NOT NULL,
      caption TEXT NOT NULL DEFAULT '',
      photo_url TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS user_achievements (
      user_id INTEGER NOT NULL,
      achievement_key TEXT NOT NULL,
      earned_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (user_id, achievement_key)
    );

    CREATE TABLE IF NOT EXISTS user_streaks (
      user_id INTEGER NOT NULL,
      streak_key TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 0,
      best INTEGER NOT NULL DEFAULT 0,
      last_date TEXT,
      PRIMARY KEY (user_id, streak_key)
    );

    CREATE TABLE IF NOT EXISTS tap_changes (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      tap_number TEXT NOT NULL DEFAULT '',
      old_beer TEXT NOT NULL DEFAULT '',
      new_beer TEXT NOT NULL,
      talking_points TEXT NOT NULL DEFAULT '',
      flavor_notes TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      briefing_key TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS menu_packages (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      item_type TEXT NOT NULL DEFAULT 'food',
      item_name TEXT NOT NULL,
      ingredients TEXT NOT NULL DEFAULT '',
      allergens TEXT NOT NULL DEFAULT '',
      talking_points TEXT NOT NULL DEFAULT '',
      pairing_notes TEXT NOT NULL DEFAULT '',
      quiz_question TEXT NOT NULL DEFAULT '',
      quiz_answer TEXT NOT NULL DEFAULT '',
      flash_front TEXT NOT NULL DEFAULT '',
      flash_back TEXT NOT NULL DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_by INTEGER,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS search_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      query TEXT NOT NULL,
      result_type TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);
}

function bumpStreak(db, userId, streakKey, onDate) {
  const row = db.prepare(`
    SELECT count, best, last_date FROM user_streaks WHERE user_id = ? AND streak_key = ?
  `).get(userId, streakKey);

  let count = 1;
  if (row?.last_date === onDate) {
    count = row.count;
  } else if (row?.last_date) {
    const prev = new Date(`${row.last_date}T12:00:00`);
    const cur = new Date(`${onDate}T12:00:00`);
    const diffDays = Math.round((cur - prev) / 86400000);
    count = diffDays === 1 ? (row.count || 0) + 1 : 1;
  }
  const best = Math.max(count, row?.best || 0);
  db.prepare(`
    INSERT INTO user_streaks (user_id, streak_key, count, best, last_date)
    VALUES (?, ?, ?, ?, ?)
    ON CONFLICT(user_id, streak_key) DO UPDATE SET
      count = excluded.count,
      best = excluded.best,
      last_date = excluded.last_date
  `).run(userId, streakKey, count, best, onDate);
  return { count, best };
}

function awardAchievement(db, userId, key) {
  try {
    db.prepare(`
      INSERT INTO user_achievements (user_id, achievement_key) VALUES (?, ?)
    `).run(userId, key);
    return true;
  } catch {
    return false;
  }
}

function evaluateSecretAchievements(db, userId, statsHint = {}) {
  const newly = [];
  const act = statsHint.byActivity || {};
  const distinctGames = Object.keys(act).filter(k =>
    ["quiz", "practice", "tap", "abv", "style", "reverse", "speed", "rocket", "flash", "fav_beer", "guestscene", "recovery"].includes(k)
  ).length;
  if (distinctGames >= 5 && awardAchievement(db, userId, "level-5-clearance")) newly.push("level-5-clearance");

  const answerStreak = Number(statsHint.maxStreak) || 0;
  const storedAnswer = db.prepare(`
    SELECT best FROM user_streaks WHERE user_id = ? AND streak_key = 'answer_streak'
  `).get(userId);
  const bestAnswer = Math.max(answerStreak, storedAnswer?.best || 0);
  if (bestAnswer >= 5 && awardAchievement(db, userId, "critical-mass")) newly.push("critical-mass");

  const coffeeOk = (act.coffee_quiz?.accuracy || 0) >= 75;
  const tastingCoverage = Number(statsHint.tastingCoverage) || 0;
  if (coffeeOk && tastingCoverage >= 50 && awardAchievement(db, userId, "atomic-bartender")) {
    newly.push("atomic-bartender");
  }

  const shoutCount = db.prepare(`SELECT COUNT(*) AS c FROM staff_shoutouts WHERE from_user_id = ?`).get(userId)?.c || 0;
  if (shoutCount >= 3 && awardAchievement(db, userId, "chain-reaction")) newly.push("chain-reaction");

  const michSearch = db.prepare(`
    SELECT 1 FROM search_events WHERE user_id = ? AND lower(query) LIKE '%michelada%' LIMIT 1
  `).get(userId);
  if (michSearch && awardAchievement(db, userId, "classified-file")) newly.push("classified-file");

  if (statsHint.perfectRound && awardAchievement(db, userId, "trinity-test")) newly.push("trinity-test");
  // also catch historical perfect sessions
  const perfect = db.prepare(`
    SELECT 1 FROM progress_sessions
    WHERE user_id = ? AND total > 0 AND score >= total
    LIMIT 1
  `).get(userId);
  if (perfect && awardAchievement(db, userId, "trinity-test")) newly.push("trinity-test");

  if ((act.coffee_flash?.attempts || 0) >= 1 && awardAchievement(db, userId, "orbital-rendezvous")) {
    newly.push("orbital-rendezvous");
  }

  return newly;
}

function registerPortalPolishApi(app, {
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
}) {
  ensurePolishTables(db);

  async function computeTastingCoverage(userId) {
    if (typeof getBeerCheckins !== "function" || typeof getBeers !== "function") return 0;
    try {
      const checkins = getBeerCheckins(userId);
      const triedSet = new Set(checkins.map(c => String(c.beer_name || "").trim().toLowerCase()).filter(Boolean));
      const beers = await getBeers();
      const onTap = beers
        .filter(b => (typeof isBeerOnTap === "function" ? isBeerOnTap(b) : String(b["On Tap"] || "").toLowerCase().startsWith("yes")))
        .map(b => String(b.Name || "").trim())
        .filter(Boolean);
      if (!onTap.length) return 0;
      const tried = onTap.filter(name => triedSet.has(name.toLowerCase())).length;
      return Math.round((tried / onTap.length) * 100);
    } catch {
      return 0;
    }
  }

  async function runAchievementPass(userId, extra = {}) {
    const stats = getUserStats ? getUserStats(userId) : { by_activity: [] };
    const byActivity = {};
    for (const row of stats.by_activity || []) byActivity[row.activity_type] = row;
    const tastingCoverage = extra.tastingCoverage != null
      ? extra.tastingCoverage
      : await computeTastingCoverage(userId);
    return evaluateSecretAchievements(db, userId, {
      byActivity,
      tastingCoverage,
      maxStreak: extra.maxStreak || 0,
      perfectRound: Boolean(extra.perfectRound)
    });
  }

  app.get("/api/staff-directory", authRequired, (req, res) => {
    const rows = db.prepare(`
      SELECT id, name, role FROM users
      WHERE id != ?
      ORDER BY name ASC
    `).all(req.user.id);
    res.json({ staff: rows });
  });

  // ── Photo standards (“what GOOD looks like”) ──
  app.get("/api/photo-standards", optionalAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT p.*, u.name AS author_name
      FROM photo_standards p
      LEFT JOIN users u ON u.id = p.created_by
      WHERE p.active = 1
      ORDER BY p.area ASC, p.sort_order ASC, p.id DESC
    `).all();
    res.json({ photos: rows });
  });

  app.post("/api/photo-standards", authRequired, managerOrAdminRequired, (req, res) => {
    const area = String(req.body.area || "").trim().slice(0, 80);
    const title = String(req.body.title || "").trim().slice(0, 160);
    const caption = String(req.body.caption || "").trim().slice(0, 500);
    const photoUrl = String(req.body.photoUrl || "").trim();
    if (!area || !title || !photoUrl) {
      return res.status(400).json({ error: "Area, title, and photo are required." });
    }
    const result = db.prepare(`
      INSERT INTO photo_standards (area, title, caption, photo_url, created_by)
      VALUES (?, ?, ?, ?, ?)
    `).run(area, title, caption, photoUrl, req.user.id);
    res.json({ ok: true, photo: db.prepare("SELECT * FROM photo_standards WHERE id = ?").get(result.lastInsertRowid) });
  });

  app.delete("/api/photo-standards/:id", authRequired, managerOrAdminRequired, (req, res) => {
    db.prepare("UPDATE photo_standards SET active = 0 WHERE id = ?").run(Number(req.params.id));
    res.json({ ok: true });
  });

  // ── Checklist photos ──
  app.get("/api/checklists/:id/photos", authRequired, (req, res) => {
    const shiftDate = /^\d{4}-\d{2}-\d{2}$/.test(req.query.date || "") ? req.query.date : todayDate();
    const rows = db.prepare(`
      SELECT cp.*, u.name AS author_name
      FROM checklist_photos cp
      LEFT JOIN users u ON u.id = cp.user_id
      WHERE cp.checklist_id = ? AND cp.shift_date = ?
      ORDER BY cp.created_at DESC
    `).all(req.params.id, shiftDate);
    res.json({ shiftDate, photos: rows });
  });

  app.post("/api/checklists/:id/photos", authRequired, (req, res) => {
    const shiftDate = /^\d{4}-\d{2}-\d{2}$/.test(req.body.shiftDate || "") ? req.body.shiftDate : todayDate();
    const taskId = String(req.body.taskId || "").trim();
    const photoUrl = String(req.body.photoUrl || "").trim();
    if (!taskId || !photoUrl) return res.status(400).json({ error: "taskId and photo required." });
    const result = db.prepare(`
      INSERT INTO checklist_photos (checklist_id, task_id, shift_date, user_id, photo_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(req.params.id, taskId, shiftDate, req.user.id, photoUrl);

    // Closing/opening streak when attaching proof on those lists
    if (/closing|opening/i.test(req.params.id)) {
      const key = /closing/i.test(req.params.id) ? "perfect_close_photos" : "opening_photos";
      bumpStreak(db, req.user.id, key, shiftDate);
    }

    res.json({ ok: true, id: result.lastInsertRowid });
  });

  // ── Achievements + streaks ──
  app.get("/api/achievements/me", authRequired, async (req, res) => {
    try {
      const earned = db.prepare(`
        SELECT achievement_key, earned_at FROM user_achievements WHERE user_id = ?
      `).all(req.user.id);
      const streaks = db.prepare(`
        SELECT streak_key, count, best, last_date FROM user_streaks WHERE user_id = ?
      `).all(req.user.id);
      const answerBest = streaks.find(s => s.streak_key === "answer_streak")?.best || 0;
      const newly = await runAchievementPass(req.user.id, { maxStreak: answerBest });
      const earnedRows = db.prepare(`
        SELECT achievement_key, earned_at FROM user_achievements WHERE user_id = ?
      `).all(req.user.id);
      const earnedKeys = new Set(earnedRows.map(r => r.achievement_key));

      res.json({
        header: {
          facility: "Manhattan Project Beer Co.",
          classification: "STAFF TRAINING — RESTRICTED",
          dossier: `Clearance file // ${req.user.name || "Operative"}`
        },
        catalog: SECRET_ACHIEVEMENTS.map(a => ({
          ...a,
          earned: earnedKeys.has(a.id),
          earnedAt: earnedRows.find(e => e.achievement_key === a.id)?.earned_at || null
        })),
        streaks,
        newlyEarned: newly,
        tastingCoverage: await computeTastingCoverage(req.user.id)
      });
    } catch (err) {
      res.status(500).json({ error: err.message || "Could not load achievements." });
    }
  });

  app.post("/api/achievements/check", authRequired, async (req, res) => {
    try {
      const direct = [];
      if (req.body?.query) {
        db.prepare(`
          INSERT INTO search_events (user_id, query, result_type) VALUES (?, ?, ?)
        `).run(req.user.id, String(req.body.query).slice(0, 200), String(req.body.resultType || "askmp"));
      }
      if (req.body?.event === "michelada") {
        if (awardAchievement(db, req.user.id, "classified-file")) direct.push("classified-file");
      }
      const maxStreak = Number(req.body?.maxStreak) || 0;
      if (req.body?.event === "streak5" || maxStreak >= 5) {
        if (maxStreak > 0) {
          const existing = db.prepare(`
            SELECT best, count FROM user_streaks WHERE user_id = ? AND streak_key = 'answer_streak'
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
        }
        if (awardAchievement(db, req.user.id, "critical-mass")) direct.push("critical-mass");
      }
      if (req.body?.event === "perfect") {
        if (awardAchievement(db, req.user.id, "trinity-test")) direct.push("trinity-test");
      }
      if (req.body?.event === "closing_complete") {
        if (awardAchievement(db, req.user.id, "fallout-shelter")) direct.push("fallout-shelter");
      }
      const newly = await runAchievementPass(req.user.id, {
        maxStreak,
        perfectRound: req.body?.event === "perfect"
      });
      for (const key of newly) {
        if (!direct.includes(key)) direct.push(key);
      }
      const titles = SECRET_ACHIEVEMENTS.filter(a => direct.includes(a.id)).map(a => a.title);
      res.json({ ok: true, newlyEarned: direct, titles });
    } catch (err) {
      res.status(500).json({ error: err.message || "Achievement check failed." });
    }
  });

  app.post("/api/streaks/checklist-complete", authRequired, (req, res) => {
    const checklistId = String(req.body.checklistId || "");
    const shiftDate = /^\d{4}-\d{2}-\d{2}$/.test(req.body.shiftDate || "") ? req.body.shiftDate : todayDate();
    let key = "checklist_days";
    if (/closing/i.test(checklistId)) key = "closing_days";
    if (/opening/i.test(checklistId)) key = "opening_days";
    const result = bumpStreak(db, req.user.id, key, shiftDate);
    if (key === "closing_days") {
      awardAchievement(db, req.user.id, "fallout-shelter");
      if (result.count >= 10) awardAchievement(db, req.user.id, "ten-perfect-closes");
    }
    if (result.count >= 30) {
      awardAchievement(db, req.user.id, "thirty-checklists");
    }
    res.json({ ok: true, streak: result, key });
  });

  // ── Tap change mode ──
  app.get("/api/tap-changes", optionalAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT * FROM tap_changes WHERE active = 1 ORDER BY created_at DESC LIMIT 20
    `).all();
    res.json({ changes: rows });
  });

  app.post("/api/tap-changes", authRequired, managerOrAdminRequired, (req, res) => {
    const newBeer = String(req.body.newBeer || "").trim().slice(0, 120);
    if (!newBeer) return res.status(400).json({ error: "New beer name required." });
    const tapNumber = String(req.body.tapNumber || "").trim().slice(0, 20);
    const oldBeer = String(req.body.oldBeer || "").trim().slice(0, 120);
    const talkingPoints = String(req.body.talkingPoints || "").trim().slice(0, 800);
    const flavorNotes = String(req.body.flavorNotes || "").trim().slice(0, 800);
    const briefingKey = `tap-change:${tapNumber || "x"}:${newBeer}:${todayDate()}`.toLowerCase();

    // Deactivate older active change for same tap
    if (tapNumber) {
      db.prepare(`UPDATE tap_changes SET active = 0 WHERE tap_number = ? AND active = 1`).run(tapNumber);
    }

    const result = db.prepare(`
      INSERT INTO tap_changes (tap_number, old_beer, new_beer, talking_points, flavor_notes, created_by, briefing_key)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(tapNumber, oldBeer, newBeer, talkingPoints, flavorNotes, req.user.id, briefingKey);

    // Also set Sell This Today to the new tap beer
    try {
      db.prepare("UPDATE sell_this_today SET active = 0 WHERE active = 1").run();
      db.prepare(`
        INSERT INTO sell_this_today (item_type, item_name, talking_points, starts_on, created_by)
        VALUES ('beer', ?, ?, ?, ?)
      `).run(newBeer, talkingPoints || `New on tap ${tapNumber ? `#${tapNumber}` : ""} — ${flavorNotes}`.trim(), todayDate(), req.user.id);
    } catch (_) {}

    const change = db.prepare("SELECT * FROM tap_changes WHERE id = ?").get(result.lastInsertRowid);
    res.json({
      ok: true,
      change,
      package: {
        briefing: {
          key: briefingKey,
          title: tapNumber ? `New on Tap ${tapNumber}: ${newBeer}` : `New tap: ${newBeer}`,
          summary: oldBeer ? `Replaces ${oldBeer}.` : "Fresh rotation.",
          talkingPoints,
          flavorNotes
        },
        quiz: {
          question: `What just landed${tapNumber ? ` on tap ${tapNumber}` : ""}?`,
          answer: newBeer
        },
        flashcard: {
          front: tapNumber ? `Tap ${tapNumber} (new)` : "New tap beer",
          back: `${newBeer}${flavorNotes ? ` — ${flavorNotes}` : ""}`
        },
        tastingPrompt: `Log a tasting for ${newBeer} on the On Tap tab.`,
        sellThis: true
      }
    });
  });

  // ── New menu item package ──
  app.get("/api/menu-packages", optionalAuth, (req, res) => {
    const rows = db.prepare(`
      SELECT * FROM menu_packages WHERE active = 1 ORDER BY created_at DESC LIMIT 30
    `).all();
    res.json({ packages: rows });
  });

  app.post("/api/menu-packages", authRequired, managerOrAdminRequired, (req, res) => {
    const itemName = String(req.body.itemName || "").trim().slice(0, 160);
    if (!itemName) return res.status(400).json({ error: "Item name required." });
    const itemType = String(req.body.itemType || "food").trim().slice(0, 40);
    const ingredients = String(req.body.ingredients || "").trim().slice(0, 1000);
    const allergens = String(req.body.allergens || "").trim().slice(0, 400);
    const talkingPoints = String(req.body.talkingPoints || "").trim().slice(0, 800);
    const pairingNotes = String(req.body.pairingNotes || "").trim().slice(0, 800);
    const quizQuestion = String(req.body.quizQuestion || `What are the key allergens or ingredients in ${itemName}?`).trim().slice(0, 300);
    const quizAnswer = String(req.body.quizAnswer || allergens || ingredients || talkingPoints).trim().slice(0, 300);
    const flashFront = String(req.body.flashFront || itemName).trim().slice(0, 160);
    const flashBack = String(req.body.flashBack || `${talkingPoints} ${allergens}`.trim()).trim().slice(0, 400);

    const result = db.prepare(`
      INSERT INTO menu_packages (
        item_type, item_name, ingredients, allergens, talking_points, pairing_notes,
        quiz_question, quiz_answer, flash_front, flash_back, created_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      itemType, itemName, ingredients, allergens, talkingPoints, pairingNotes,
      quizQuestion, quizAnswer, flashFront, flashBack, req.user.id
    );

    res.json({
      ok: true,
      package: db.prepare("SELECT * FROM menu_packages WHERE id = ?").get(result.lastInsertRowid),
      generated: {
        briefingAnnouncement: `New ${itemType}: ${itemName}. ${talkingPoints}`,
        flashcard: { front: flashFront, back: flashBack },
        quiz: { question: quizQuestion, answer: quizAnswer },
        pairingNotes,
        allergensDisclaimer: "Confirm allergens with kitchen — portal notes are informational only."
      }
    });
  });

  // ── Weekly training pack ──
  app.get("/api/manager/weekly-training", authRequired, managerOrAdminRequired, (req, res) => {
    const gaps = db.prepare(`
      SELECT activity_type,
             COUNT(*) AS attempts,
             ROUND(AVG(score * 100.0 / total), 1) AS avg_accuracy
      FROM progress_sessions
      WHERE completed_at >= datetime('now', '-7 days') AND total > 0
      GROUP BY activity_type
      ORDER BY avg_accuracy ASC
      LIMIT 5
    `).all();

    const tapChanges = db.prepare(`
      SELECT new_beer, tap_number, talking_points FROM tap_changes
      WHERE created_at >= datetime('now', '-7 days')
      ORDER BY created_at DESC LIMIT 5
    `).all();

    const packages = db.prepare(`
      SELECT item_name, item_type, talking_points FROM menu_packages
      WHERE created_at >= datetime('now', '-7 days') AND active = 1
      ORDER BY created_at DESC LIMIT 5
    `).all();

    const searches = db.prepare(`
      SELECT lower(query) AS q, COUNT(*) AS hits
      FROM search_events
      WHERE created_at >= datetime('now', '-7 days')
      GROUP BY lower(query)
      ORDER BY hits DESC
      LIMIT 8
    `).all();

    const minutes = [];
    minutes.push("1) Wins & 86s — lead reads the board (30 sec).");
    if (tapChanges[0]) {
      minutes.push(`2) New tap focus — ${tapChanges[0].new_beer}${tapChanges[0].tap_number ? ` (Tap ${tapChanges[0].tap_number})` : ""}: ${tapChanges[0].talking_points || "taste + one guest line"}.`);
    } else {
      minutes.push("2) New tap focus — no tap changes logged this week; review On Tap list.");
    }
    if (gaps[0]) {
      minutes.push(`3) Weak spot drill — ${gaps[0].activity_type} (team avg ${gaps[0].avg_accuracy}%). Do 2 quick questions.`);
    } else {
      minutes.push("3) Weak spot drill — run one Guest Scenario from Launch Pad.");
    }
    if (packages[0]) {
      minutes.push(`4) New menu talking points — ${packages[0].item_name}: ${packages[0].talking_points || "ingredients + allergens confirm with kitchen"}.`);
    } else {
      minutes.push("4) Upsell — Sell This Today item + one pairing line.");
    }
    minutes.push("5) Close with Ask MP challenge — everyone asks one real floor question.");

    res.json({
      weekOf: todayDate(),
      duration: "5 minutes",
      agenda: minutes,
      gaps,
      tapChanges,
      newMenuItems: packages,
      topSearches: searches
    });
  });

  // ── Deeper analytics ──
  app.get("/api/manager/deep-analytics", authRequired, managerOrAdminRequired, async (req, res) => {
    const missed = db.prepare(`
      SELECT activity_type,
             COUNT(*) AS attempts,
             ROUND(AVG(score * 100.0 / total), 1) AS avg_accuracy,
             SUM(CASE WHEN score * 1.0 / total < 0.6 THEN 1 ELSE 0 END) AS weak
      FROM progress_sessions
      WHERE completed_at >= datetime('now', '-14 days') AND total > 0
      GROUP BY activity_type
      ORDER BY weak DESC
      LIMIT 12
    `).all();

    const topSearches = db.prepare(`
      SELECT lower(query) AS q, COUNT(*) AS hits
      FROM search_events
      WHERE created_at >= datetime('now', '-14 days')
      GROUP BY lower(query)
      ORDER BY hits DESC
      LIMIT 15
    `).all();

    const feedbackThemes = db.prepare(`
      SELECT category, COUNT(*) AS count
      FROM site_feedback
      WHERE created_at >= datetime('now', '-30 days')
      GROUP BY category
      ORDER BY count DESC
    `).all();

    const checklistLeaders = db.prepare(`
      SELECT u.name, COUNT(DISTINCT c.shift_date || ':' || c.checklist_id) AS completions
      FROM checklist_completions c
      JOIN users u ON u.id = c.user_id
      WHERE c.shift_date >= date('now', '-30 days')
      GROUP BY u.id
      ORDER BY completions DESC
      LIMIT 8
    `).all();

    const streakLeaders = db.prepare(`
      SELECT u.name, s.streak_key, s.best, s.count
      FROM user_streaks s
      JOIN users u ON u.id = s.user_id
      ORDER BY s.best DESC
      LIMIT 10
    `).all();

    res.json({
      missedQuestions: missed,
      topSearches,
      feedbackThemes,
      checklistLeaders,
      streakLeaders
    });
  });

  // Enhance who-knows with on-shift filter
  app.get("/api/skills/who-knows-now", authRequired, (req, res) => {
    const skillKey = String(req.query.skill || "").trim();
    if (!skillKey) return res.status(400).json({ error: "skill required" });
    const trained = db.prepare(`
      SELECT u.id, u.name, u.email, s.level
      FROM staff_skills s
      JOIN users u ON u.id = s.user_id
      WHERE s.skill_key = ? AND s.level IN ('learning','proficient')
      ORDER BY CASE s.level WHEN 'proficient' THEN 0 ELSE 1 END, u.name ASC
    `).all(skillKey);

    let workingIds = new Set();
    try {
      if (typeof getWorkingStaff === "function") {
        const staff = getWorkingStaff(db, localDateKey());
        const now = Date.now();
        for (const row of staff) {
          if (!row.user_id) continue;
          const start = Date.parse(row.start_at);
          const end = Date.parse(row.end_at);
          if (Number.isFinite(start) && Number.isFinite(end) && start - 30 * 60000 <= now && end + 15 * 60000 >= now) {
            workingIds.add(row.user_id);
          }
        }
      }
    } catch (_) {}

    res.json({
      skillKey,
      onShiftFilterActive: workingIds.size > 0,
      people: trained.map(p => ({
        ...p,
        onShiftNow: workingIds.has(p.id)
      })).sort((a, b) => Number(b.onShiftNow) - Number(a.onShiftNow) || a.name.localeCompare(b.name))
    });
  });

  app.post("/api/search/log", optionalAuth, (req, res) => {
    const query = String(req.body.query || "").trim().slice(0, 200);
    if (!query) return res.json({ ok: true });
    db.prepare(`
      INSERT INTO search_events (user_id, query, result_type)
      VALUES (?, ?, ?)
    `).run(req.user?.id || null, query, String(req.body.resultType || "search").slice(0, 40));
    if (req.user?.id && /michelada|mich\s*mix/i.test(query)) {
      awardAchievement(db, req.user.id, "classified-file");
    }
    res.json({ ok: true });
  });
}

module.exports = {
  ensurePolishTables,
  registerPortalPolishApi,
  bumpStreak,
  awardAchievement,
  evaluateSecretAchievements
};
