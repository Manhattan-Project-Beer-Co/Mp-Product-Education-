/**
 * Weekly specials + "This Week at MP" board.
 * Shift leads, managers, and admins can edit; everyone signed in can read.
 */

const DEFAULT_SPECIALS = [
  {
    id: "monday-lunch",
    day: "monday",
    day_label: "Monday",
    meal: "Lunch",
    schedule: "11 am until sold out",
    name: "Italian Meatball Sub",
    price: "$19",
    description: "Fresh homemade meatballs served in a hoagie with marinara sauce, mozzarella, fresh basil, and truffle shoestring potatoes.",
    build: "Hoagie · homemade meatballs · marinara sauce · mozzarella · fresh basil · truffle shoestring potatoes",
    training: "Describe it as a hearty Italian meatball sub with crisp truffle potatoes on the side.",
    notes: "Not gluten-free.",
    gluten_free: 0,
    dairy: 1,
    nuts: null,
    active: 1,
    sort_order: 1
  },
  {
    id: "taco-tuesday",
    day: "tuesday",
    day_label: "Tuesday",
    meal: "Lunch",
    schedule: "11 am until sold out",
    name: "Pork Belly Tacos",
    price: "",
    description: "Pork belly tacos served with caramelized onions, grilled pineapple, BBQ sauce, lemon rice, and black beans.",
    build: "Pork belly tacos · caramelized onions · grilled pineapple · BBQ sauce · lemon rice · black beans",
    training: "Lead with the sweet-savory combination of pork belly, grilled pineapple, and caramelized onions.",
    notes: "Gluten-free.",
    gluten_free: 1,
    dairy: null,
    nuts: null,
    active: 1,
    sort_order: 2
  },
  {
    id: "wednesday-dinner",
    day: "wednesday",
    day_label: "Wednesday",
    meal: "Dinner",
    schedule: "4 pm until sold out",
    name: "Chicken Parmesan",
    price: "$20",
    description: "Chicken Parmesan served with fettuccine Alfredo primavera, Parmesan, and fresh basil.",
    build: "Chicken Parmesan · fettuccine Alfredo primavera · Parmesan · fresh basil",
    training: "A classic chicken Parmesan dinner with creamy primavera pasta.",
    notes: "Not gluten-free.",
    gluten_free: 0,
    dairy: 1,
    nuts: null,
    active: 1,
    sort_order: 3
  }
];

const DEFAULT_COFFEE_SPECIALS = [
  {
    id: "seasonal-latte",
    kind: "latte",
    season: "Seasonal",
    name: "Pumpkin Spice Latte",
    price: "$5 / $6",
    description: "Seasonal pumpkin spice latte, available hot or iced with whole or oat milk.",
    build: "",
    training: "",
    available: 1,
    is_new: 1,
    sort_order: 1
  },
  {
    id: "seasonal-matcha",
    kind: "matcha",
    season: "Seasonal",
    name: "Apple Pie Matcha",
    price: "$5 / $6",
    description: "Seasonal apple pie matcha, available hot or iced with whole or oat milk.",
    build: "",
    training: "",
    available: 1,
    is_new: 1,
    sort_order: 2
  }
];

const COFFEE_SPECIAL_KINDS = ["latte", "matcha", "cocktail", "other"];
const WEEKDAY_LABELS = {
  monday: "Monday",
  tuesday: "Tuesday",
  wednesday: "Wednesday",
  thursday: "Thursday",
  friday: "Friday",
  saturday: "Saturday",
  sunday: "Sunday",
  other: "Special"
};

function slugId(prefix, value) {
  const base = String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 40);
  return `${prefix}-${base || Date.now()}`;
}

function mondayOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const day = d.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  d.setDate(d.getDate() + diff);
  return d;
}

function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

function toDateKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function parseDateKey(key) {
  const m = String(key || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
}

function parseStamp(value) {
  const raw = String(value || "").trim();
  if (!raw) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) return new Date(`${raw}T00:00:00`);
  const normalized = raw.includes("T") ? raw : raw.replace(" ", "T");
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
}

function stampToStorage(value) {
  const date = parseStamp(value);
  if (!date) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function contentStatus(row, { now = new Date() } = {}) {
  if (row.archived === 1 || row.archived === true || row.active === 0 || row.active === false) {
    return "archived";
  }
  const start = parseStamp(row.publish_at || row.publishAt);
  const end = parseStamp(row.expire_at || row.expireAt);
  if (start && now < start) return "scheduled";
  if (end && now >= end) return "expired";
  return "live";
}

function isContentLive(row, opts) {
  return contentStatus(row, opts) === "live";
}

function tableColumns(db, table) {
  return new Set(db.prepare(`PRAGMA table_info(${table})`).all().map((col) => col.name));
}

function ensureColumn(db, table, column, ddl) {
  if (tableColumns(db, table).has(column)) return;
  db.exec(`ALTER TABLE ${table} ADD COLUMN ${ddl}`);
}

function triStateFromDb(value) {
  if (value === null || value === undefined) return null;
  return Boolean(value);
}

function triStateToDb(value) {
  if (value === true || value === "true" || value === 1 || value === "1") return 1;
  if (value === false || value === "false" || value === 0 || value === "0") return 0;
  return null;
}

function mapSpecialRow(row, { now = new Date() } = {}) {
  if (!row) return null;
  const status = contentStatus(row, { now });
  return {
    id: row.id,
    day: row.day,
    dayLabel: row.day_label,
    meal: row.meal,
    schedule: row.schedule,
    name: row.name,
    price: row.price,
    description: row.description,
    build: row.build || "",
    training: row.training || "",
    notes: row.notes || "",
    glutenFree: triStateFromDb(row.gluten_free),
    dairy: triStateFromDb(row.dairy),
    nuts: triStateFromDb(row.nuts),
    active: Boolean(row.active),
    publishAt: row.publish_at || "",
    expireAt: row.expire_at || "",
    sortOrder: row.sort_order,
    updatedAt: row.updated_at || null,
    status
  };
}

function mapCoffeeSpecialRow(row, { now = new Date() } = {}) {
  if (!row) return null;
  const status = contentStatus(row, { now });
  return {
    id: row.id,
    kind: row.kind,
    menu: row.menu || "coffee",
    season: row.season,
    name: row.name,
    price: row.price,
    description: row.description,
    build: row.build || "",
    training: row.training || "",
    available: Boolean(row.available),
    archived: Boolean(row.archived),
    isNew: Boolean(row.is_new),
    publishAt: row.publish_at || "",
    expireAt: row.expire_at || "",
    sortOrder: row.sort_order,
    updatedAt: row.updated_at || null,
    status
  };
}

function ensureWeeklySpecialsTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS weekly_specials (
      id TEXT PRIMARY KEY,
      day TEXT NOT NULL,
      day_label TEXT NOT NULL,
      meal TEXT NOT NULL DEFAULT '',
      schedule TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL,
      price TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      build TEXT NOT NULL DEFAULT '',
      training TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      gluten_free INTEGER,
      dairy INTEGER,
      nuts INTEGER,
      active INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS weekly_specials_board (
      id INTEGER PRIMARY KEY CHECK (id = 1),
      chef_notes TEXT NOT NULL DEFAULT '',
      menu_changes TEXT NOT NULL DEFAULT '',
      eighty_six_notes TEXT NOT NULL DEFAULT '',
      wait_notes TEXT NOT NULL DEFAULT '',
      limited_items TEXT NOT NULL DEFAULT '',
      service_notes TEXT NOT NULL DEFAULT '',
      allergen_notes TEXT NOT NULL DEFAULT '',
      content_week_start TEXT NOT NULL DEFAULT '',
      deadline_dow INTEGER NOT NULL DEFAULT 6,
      deadline_hour INTEGER NOT NULL DEFAULT 18,
      updated_at TEXT,
      updated_by INTEGER,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );

    CREATE TABLE IF NOT EXISTS coffee_specials (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL DEFAULT 'latte',
      season TEXT NOT NULL DEFAULT 'Seasonal',
      name TEXT NOT NULL,
      price TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      build TEXT NOT NULL DEFAULT '',
      training TEXT NOT NULL DEFAULT '',
      available INTEGER NOT NULL DEFAULT 1,
      is_new INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS specials_content_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL
    );
  `);

  ensureColumn(db, "weekly_specials", "publish_at", "publish_at TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "weekly_specials", "expire_at", "expire_at TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "coffee_specials", "menu", "menu TEXT NOT NULL DEFAULT 'coffee'");
  ensureColumn(db, "coffee_specials", "archived", "archived INTEGER NOT NULL DEFAULT 0");
  ensureColumn(db, "coffee_specials", "publish_at", "publish_at TEXT NOT NULL DEFAULT ''");
  ensureColumn(db, "coffee_specials", "expire_at", "expire_at TEXT NOT NULL DEFAULT ''");

  const count = db.prepare("SELECT COUNT(*) AS c FROM weekly_specials").get().c;
  if (!count) {
    const insert = db.prepare(`
      INSERT INTO weekly_specials (
        id, day, day_label, meal, schedule, name, price, description, build, training, notes,
        gluten_free, dairy, nuts, active, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction(() => {
      for (const s of DEFAULT_SPECIALS) {
        insert.run(
          s.id, s.day, s.day_label, s.meal, s.schedule, s.name, s.price, s.description,
          s.build, s.training, s.notes, s.gluten_free, s.dairy, s.nuts, s.active, s.sort_order
        );
      }
    });
    tx();
  }

  const board = db.prepare("SELECT id FROM weekly_specials_board WHERE id = 1").get();
  if (!board) {
    const thisMonday = toDateKey(mondayOf(new Date()));
    db.prepare(`
      INSERT INTO weekly_specials_board (id, content_week_start, deadline_dow, deadline_hour)
      VALUES (1, ?, 5, 0)
    `).run(thisMonday);
  }

  const coffeeCount = db.prepare("SELECT COUNT(*) AS c FROM coffee_specials").get().c;
  if (!coffeeCount) {
    const insertCoffee = db.prepare(`
      INSERT INTO coffee_specials (
        id, kind, season, name, price, description, build, training, available, is_new, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const tx = db.transaction(() => {
      for (const item of DEFAULT_COFFEE_SPECIALS) {
        insertCoffee.run(
          item.id, item.kind, item.season, item.name, item.price, item.description,
          item.build, item.training, item.available, item.is_new, item.sort_order
        );
      }
    });
    tx();
  }

  const contentRevision = "2026-09-07-specials-v2";
  const applied = db.prepare("SELECT 1 FROM specials_content_meta WHERE key = ?").get(contentRevision);
  if (!applied) {
    const updateSpecial = db.prepare(`
      UPDATE weekly_specials
      SET name = ?, price = ?, description = ?, build = ?, training = ?, notes = ?,
          gluten_free = ?, dairy = ?, nuts = ?, active = ?, updated_at = datetime('now')
      WHERE id = ?
    `);
    const upsertCoffee = db.prepare(`
      INSERT INTO coffee_specials (
        id, kind, season, name, price, description, build, training, available, is_new, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(id) DO UPDATE SET
        kind = excluded.kind,
        season = excluded.season,
        name = excluded.name,
        price = excluded.price,
        description = excluded.description,
        build = excluded.build,
        training = excluded.training,
        available = excluded.available,
        is_new = excluded.is_new,
        sort_order = excluded.sort_order,
        updated_at = datetime('now')
    `);
    const tx = db.transaction(() => {
      for (const item of DEFAULT_SPECIALS) {
        updateSpecial.run(
          item.name, item.price, item.description, item.build, item.training, item.notes,
          item.gluten_free, item.dairy, item.nuts, item.active, item.id
        );
      }
      for (const item of DEFAULT_COFFEE_SPECIALS) {
        upsertCoffee.run(
          item.id, item.kind, item.season, item.name, item.price, item.description,
          item.build, item.training, item.available, item.is_new, item.sort_order
        );
      }
      db.prepare(`
        UPDATE weekly_specials_board
        SET deadline_dow = 5,
            deadline_hour = 0,
            content_week_start = ?,
            updated_at = datetime('now')
        WHERE id = 1
      `).run(toDateKey(mondayOf(new Date())));
      db.prepare("INSERT INTO specials_content_meta (key, value) VALUES (?, ?)").run(contentRevision, new Date().toISOString());
    });
    tx();
  }
}

function getBoardRow(db) {
  return db.prepare(`
    SELECT b.*, u.name AS updated_by_name
    FROM weekly_specials_board b
    LEFT JOIN users u ON u.id = b.updated_by
    WHERE b.id = 1
  `).get();
}

function expectedContentWeekStart(board, now = new Date()) {
  const deadlineDow = Number.isFinite(Number(board?.deadline_dow)) ? Number(board.deadline_dow) : 5;
  const deadlineHour = Number.isFinite(Number(board?.deadline_hour)) ? Number(board.deadline_hour) : 0;
  const thisMonday = mondayOf(now);
  const day = now.getDay();
  const hour = now.getHours();
  const pastDeadline = (day === deadlineDow && hour >= deadlineHour) || day === 0;
  return toDateKey(pastDeadline ? addDays(thisMonday, 7) : thisMonday);
}

function boardNeedsReview(board, now = new Date()) {
  if (!board) return true;
  const expected = expectedContentWeekStart(board, now);
  const current = String(board.content_week_start || "").trim();
  if (!current) return true;
  return current < expected;
}

function mapBoard(board, { canEdit = false } = {}) {
  if (!board) {
    return {
      chefNotes: "",
      menuChanges: "",
      eightySixNotes: "",
      waitNotes: "",
      limitedItems: "",
      serviceNotes: "",
      allergenNotes: "",
      contentWeekStart: "",
      deadlineDow: 5,
      deadlineHour: 0,
      updatedAt: null,
      updatedByName: null,
      needsReview: canEdit,
      expectedContentWeekStart: expectedContentWeekStart(null)
    };
  }
  return {
    chefNotes: board.chef_notes || "",
    menuChanges: board.menu_changes || "",
    eightySixNotes: board.eighty_six_notes || "",
    waitNotes: board.wait_notes || "",
    limitedItems: board.limited_items || "",
    serviceNotes: board.service_notes || "",
    allergenNotes: board.allergen_notes || "",
    contentWeekStart: board.content_week_start || "",
    deadlineDow: board.deadline_dow ?? 6,
    deadlineHour: board.deadline_hour ?? 18,
    updatedAt: board.updated_at || null,
    updatedByName: board.updated_by_name || null,
    needsReview: canEdit ? boardNeedsReview(board) : false,
    expectedContentWeekStart: expectedContentWeekStart(board)
  };
}

function touchBoard(db, userId, { contentWeekStart } = {}) {
  const week = contentWeekStart || expectedContentWeekStart(getBoardRow(db));
  db.prepare(`
    UPDATE weekly_specials_board
    SET content_week_start = ?,
        updated_at = datetime('now'),
        updated_by = ?
    WHERE id = 1
  `).run(week, userId);
}

function registerWeeklySpecialsApi(app, {
  db,
  authRequired,
  optionalAuth,
  weeklySpecialsManagerRequired,
  loadAuthedUser,
  canManageWeeklySpecials
}) {
  ensureWeeklySpecialsTables(db);

  app.get("/api/weekly-specials", optionalAuth, (req, res) => {
    const user = req.user?.id && typeof loadAuthedUser === "function" ? loadAuthedUser(req) : null;
    const canEdit = Boolean(user && canManageWeeklySpecials?.(user));
    const now = new Date();
    const specialRows = db.prepare(`
      SELECT * FROM weekly_specials
      ORDER BY sort_order ASC, day ASC
    `).all();
    const coffeeRows = db.prepare(`
      SELECT * FROM coffee_specials
      ORDER BY sort_order ASC, name ASC
    `).all();
    const specials = specialRows
      .map((row) => mapSpecialRow(row, { now }))
      .filter((row) => canEdit || row.status === "live");
    const coffeeSpecials = coffeeRows
      .map((row) => mapCoffeeSpecialRow(row, { now }))
      .filter((row) => canEdit || row.status === "live");
    const board = getBoardRow(db);
    res.json({
      specials,
      coffeeSpecials,
      board: mapBoard(board, { canEdit }),
      canEdit
    });
  });

  app.put("/api/weekly-specials/board", authRequired, weeklySpecialsManagerRequired, (req, res) => {
    const body = req.body || {};
    const fields = {
      chef_notes: String(body.chefNotes ?? "").slice(0, 2000),
      menu_changes: String(body.menuChanges ?? "").slice(0, 2000),
      eighty_six_notes: String(body.eightySixNotes ?? "").slice(0, 2000),
      wait_notes: String(body.waitNotes ?? "").slice(0, 2000),
      limited_items: String(body.limitedItems ?? "").slice(0, 2000),
      service_notes: String(body.serviceNotes ?? "").slice(0, 2000),
      allergen_notes: String(body.allergenNotes ?? "").slice(0, 2000)
    };

    let contentWeekStart = String(body.contentWeekStart || "").trim();
    if (contentWeekStart && !parseDateKey(contentWeekStart)) {
      return res.status(400).json({ error: "contentWeekStart must be YYYY-MM-DD." });
    }
    if (!contentWeekStart) {
      contentWeekStart = expectedContentWeekStart(getBoardRow(db));
    }

    let deadlineDow = Number(body.deadlineDow);
    let deadlineHour = Number(body.deadlineHour);
    if (!Number.isFinite(deadlineDow)) deadlineDow = getBoardRow(db)?.deadline_dow ?? 5;
    if (!Number.isFinite(deadlineHour)) deadlineHour = getBoardRow(db)?.deadline_hour ?? 0;
    deadlineDow = Math.max(0, Math.min(6, Math.round(deadlineDow)));
    deadlineHour = Math.max(0, Math.min(23, Math.round(deadlineHour)));

    db.prepare(`
      UPDATE weekly_specials_board
      SET chef_notes = ?,
          menu_changes = ?,
          eighty_six_notes = ?,
          wait_notes = ?,
          limited_items = ?,
          service_notes = ?,
          allergen_notes = ?,
          content_week_start = ?,
          deadline_dow = ?,
          deadline_hour = ?,
          updated_at = datetime('now'),
          updated_by = ?
      WHERE id = 1
    `).run(
      fields.chef_notes,
      fields.menu_changes,
      fields.eighty_six_notes,
      fields.wait_notes,
      fields.limited_items,
      fields.service_notes,
      fields.allergen_notes,
      contentWeekStart,
      deadlineDow,
      deadlineHour,
      req.user.id
    );

    const board = getBoardRow(db);
    res.json({ board: mapBoard(board, { canEdit: true }) });
  });

  app.put("/api/weekly-specials/:id", authRequired, weeklySpecialsManagerRequired, (req, res) => {
    const id = String(req.params.id || "").trim();
    const existing = db.prepare("SELECT * FROM weekly_specials WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Weekly special not found." });

    const body = req.body || {};
    const name = String(body.name ?? existing.name).trim().slice(0, 160);
    if (!name) return res.status(400).json({ error: "Name is required." });

    const next = {
      name,
      price: String(body.price ?? existing.price).trim().slice(0, 80),
      description: String(body.description ?? existing.description).trim().slice(0, 2000),
      build: String(body.build ?? existing.build).trim().slice(0, 2000),
      training: String(body.training ?? existing.training).trim().slice(0, 2000),
      notes: String(body.notes ?? existing.notes).trim().slice(0, 2000),
      schedule: String(body.schedule ?? existing.schedule).trim().slice(0, 120),
      meal: String(body.meal ?? existing.meal).trim().slice(0, 80),
      day: String(body.day ?? existing.day).trim().toLowerCase().slice(0, 20) || existing.day,
      day_label: String(body.dayLabel ?? existing.day_label).trim().slice(0, 40) || existing.day_label,
      gluten_free: body.glutenFree !== undefined ? triStateToDb(body.glutenFree) : existing.gluten_free,
      dairy: body.dairy !== undefined ? triStateToDb(body.dairy) : existing.dairy,
      nuts: body.nuts !== undefined ? triStateToDb(body.nuts) : existing.nuts,
      active: body.active !== undefined ? (body.active ? 1 : 0) : existing.active,
      publish_at: body.publishAt !== undefined ? stampToStorage(body.publishAt) : (existing.publish_at || ""),
      expire_at: body.expireAt !== undefined ? stampToStorage(body.expireAt) : (existing.expire_at || "")
    };

    db.prepare(`
      UPDATE weekly_specials
      SET name = ?, price = ?, description = ?, build = ?, training = ?, notes = ?,
          schedule = ?, meal = ?, day = ?, day_label = ?, gluten_free = ?, dairy = ?, nuts = ?, active = ?,
          publish_at = ?, expire_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      next.name, next.price, next.description, next.build, next.training, next.notes,
      next.schedule, next.meal, next.day, next.day_label, next.gluten_free, next.dairy, next.nuts, next.active,
      next.publish_at, next.expire_at, id
    );

    const markWeek = body.markWeekUpdated !== false;
    if (markWeek) {
      const week = String(body.contentWeekStart || "").trim() || expectedContentWeekStart(getBoardRow(db));
      touchBoard(db, req.user.id, { contentWeekStart: week });
    }

    const row = db.prepare("SELECT * FROM weekly_specials WHERE id = ?").get(id);
    const board = getBoardRow(db);
    res.json({
      special: mapSpecialRow(row),
      board: mapBoard(board, { canEdit: true })
    });
  });

  app.put("/api/coffee-specials/:id", authRequired, weeklySpecialsManagerRequired, (req, res) => {
    const id = String(req.params.id || "").trim();
    const existing = db.prepare("SELECT * FROM coffee_specials WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Coffee special not found." });

    const body = req.body || {};
    const name = String(body.name ?? existing.name).trim().slice(0, 160);
    if (!name) return res.status(400).json({ error: "Name is required." });
    const kind = String(body.kind ?? existing.kind).trim().toLowerCase();
    if (!COFFEE_SPECIAL_KINDS.includes(kind)) {
      return res.status(400).json({ error: "Drink type must be latte, matcha, cocktail, or other." });
    }
    const menu = String(body.menu ?? existing.menu ?? "coffee").trim().toLowerCase();
    if (!["coffee", "bar"].includes(menu)) {
      return res.status(400).json({ error: "Menu must be coffee or bar." });
    }

    db.prepare(`
      UPDATE coffee_specials
      SET kind = ?, menu = ?, season = ?, name = ?, price = ?, description = ?, build = ?, training = ?,
          available = ?, is_new = ?, archived = ?, publish_at = ?, expire_at = ?, updated_at = datetime('now')
      WHERE id = ?
    `).run(
      kind,
      menu,
      String(body.season ?? existing.season).trim().slice(0, 80),
      name,
      String(body.price ?? existing.price).trim().slice(0, 80),
      String(body.description ?? existing.description).trim().slice(0, 2000),
      String(body.build ?? existing.build).trim().slice(0, 2000),
      String(body.training ?? existing.training).trim().slice(0, 2000),
      body.available !== undefined ? (body.available ? 1 : 0) : existing.available,
      body.isNew !== undefined ? (body.isNew ? 1 : 0) : existing.is_new,
      body.archived !== undefined ? (body.archived ? 1 : 0) : (existing.archived || 0),
      body.publishAt !== undefined ? stampToStorage(body.publishAt) : (existing.publish_at || ""),
      body.expireAt !== undefined ? stampToStorage(body.expireAt) : (existing.expire_at || ""),
      id
    );

    const row = db.prepare("SELECT * FROM coffee_specials WHERE id = ?").get(id);
    res.json({ coffeeSpecial: mapCoffeeSpecialRow(row), canEdit: true });
  });

  app.post("/api/weekly-specials", authRequired, weeklySpecialsManagerRequired, (req, res) => {
    const body = req.body || {};
    const name = String(body.name || "").trim().slice(0, 160);
    if (!name) return res.status(400).json({ error: "Name is required." });
    const day = String(body.day || "other").trim().toLowerCase();
    if (!WEEKDAY_LABELS[day]) return res.status(400).json({ error: "Choose a valid day." });
    const id = slugId("special", `${day}-${name}`);
    if (db.prepare("SELECT id FROM weekly_specials WHERE id = ?").get(id)) {
      return res.status(409).json({ error: "A special with that name already exists." });
    }
    const maxSort = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS n FROM weekly_specials").get().n;
    db.prepare(`
      INSERT INTO weekly_specials (
        id, day, day_label, meal, schedule, name, price, description, build, training, notes,
        gluten_free, dairy, nuts, active, publish_at, expire_at, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      day,
      body.dayLabel || WEEKDAY_LABELS[day],
      String(body.meal || "").trim().slice(0, 80),
      String(body.schedule || "").trim().slice(0, 120),
      name,
      String(body.price || "").trim().slice(0, 80),
      String(body.description || "").trim().slice(0, 2000),
      String(body.build || "").trim().slice(0, 2000),
      String(body.training || "").trim().slice(0, 2000),
      String(body.notes || "").trim().slice(0, 2000),
      triStateToDb(body.glutenFree),
      triStateToDb(body.dairy),
      triStateToDb(body.nuts),
      body.active === false ? 0 : 1,
      stampToStorage(body.publishAt),
      stampToStorage(body.expireAt),
      maxSort + 1
    );
    const row = db.prepare("SELECT * FROM weekly_specials WHERE id = ?").get(id);
    res.json({ special: mapSpecialRow(row) });
  });

  app.post("/api/coffee-specials", authRequired, weeklySpecialsManagerRequired, (req, res) => {
    const body = req.body || {};
    const name = String(body.name || "").trim().slice(0, 160);
    if (!name) return res.status(400).json({ error: "Name is required." });
    const kind = String(body.kind || "latte").trim().toLowerCase();
    if (!COFFEE_SPECIAL_KINDS.includes(kind)) {
      return res.status(400).json({ error: "Drink type must be latte, matcha, cocktail, or other." });
    }
    const menu = String(body.menu || (kind === "cocktail" ? "bar" : "coffee")).trim().toLowerCase();
    if (!["coffee", "bar"].includes(menu)) {
      return res.status(400).json({ error: "Menu must be coffee or bar." });
    }
    const id = slugId("drink", name);
    if (db.prepare("SELECT id FROM coffee_specials WHERE id = ?").get(id)) {
      return res.status(409).json({ error: "A drink with that name already exists." });
    }
    const maxSort = db.prepare("SELECT COALESCE(MAX(sort_order), 0) AS n FROM coffee_specials").get().n;
    db.prepare(`
      INSERT INTO coffee_specials (
        id, kind, menu, season, name, price, description, build, training,
        available, is_new, archived, publish_at, expire_at, sort_order
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      kind,
      menu,
      String(body.season || "Seasonal").trim().slice(0, 80),
      name,
      String(body.price || "").trim().slice(0, 80),
      String(body.description || "").trim().slice(0, 2000),
      String(body.build || "").trim().slice(0, 2000),
      String(body.training || "").trim().slice(0, 2000),
      body.available === false ? 0 : 1,
      body.isNew ? 1 : 0,
      0,
      stampToStorage(body.publishAt),
      stampToStorage(body.expireAt),
      maxSort + 1
    );
    const row = db.prepare("SELECT * FROM coffee_specials WHERE id = ?").get(id);
    res.json({ coffeeSpecial: mapCoffeeSpecialRow(row), canEdit: true });
  });
}

module.exports = {
  ensureWeeklySpecialsTables,
  registerWeeklySpecialsApi,
  DEFAULT_SPECIALS,
  DEFAULT_COFFEE_SPECIALS,
  expectedContentWeekStart,
  boardNeedsReview,
  contentStatus,
  isContentLive,
  parseStamp,
  stampToStorage
};
