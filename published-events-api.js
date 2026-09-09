/**
 * Published event records for the Events destination.
 * Authorized roles create/edit; staff see live published windows.
 */

const { contentStatus, parseStamp, stampToStorage } = require("./weekly-specials-api");

const EVENT_COLUMNS = [
  ["event_type", "TEXT NOT NULL DEFAULT ''"],
  ["guest_count", "TEXT NOT NULL DEFAULT ''"],
  ["taproom_impact", "TEXT NOT NULL DEFAULT ''"],
  ["production_space", "TEXT NOT NULL DEFAULT ''"],
  ["patio_usage", "TEXT NOT NULL DEFAULT ''"],
  ["food_notes", "TEXT NOT NULL DEFAULT ''"],
  ["bar_notes", "TEXT NOT NULL DEFAULT ''"],
  ["setup_notes", "TEXT NOT NULL DEFAULT ''"],
  ["event_lead", "TEXT NOT NULL DEFAULT ''"],
  ["staffing_notes", "TEXT NOT NULL DEFAULT ''"],
  ["guest_notes", "TEXT NOT NULL DEFAULT ''"],
  ["checklist_link", "TEXT NOT NULL DEFAULT ''"],
  ["sop_link", "TEXT NOT NULL DEFAULT ''"]
];

function ensurePublishedEventsTable(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS published_events (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      location TEXT NOT NULL DEFAULT '',
      starts_at TEXT NOT NULL DEFAULT '',
      ends_at TEXT NOT NULL DEFAULT '',
      notes TEXT NOT NULL DEFAULT '',
      published INTEGER NOT NULL DEFAULT 1,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by INTEGER,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );
  `);
  const cols = new Set(db.prepare("PRAGMA table_info(published_events)").all().map((c) => c.name));
  EVENT_COLUMNS.forEach(([name, sql]) => {
    if (!cols.has(name)) db.exec(`ALTER TABLE published_events ADD COLUMN ${name} ${sql}`);
  });
}

function clip(value, max) {
  return String(value || "").trim().slice(0, max);
}

function eventFieldsFromBody(body, existing = {}) {
  return {
    title: clip(body.title ?? existing.title, 160),
    summary: clip(body.summary ?? existing.summary, 2000),
    location: clip(body.location ?? existing.location, 160),
    starts_at: body.startsAt !== undefined ? stampToStorage(body.startsAt) : (existing.starts_at || ""),
    ends_at: body.endsAt !== undefined ? stampToStorage(body.endsAt) : (existing.ends_at || ""),
    notes: clip(body.notes ?? existing.notes, 2000),
    published: body.published !== undefined ? (body.published ? 1 : 0) : (existing.published ?? 1),
    event_type: clip(body.eventType ?? existing.event_type, 80),
    guest_count: clip(body.guestCount ?? existing.guest_count, 40),
    taproom_impact: clip(body.taproomImpact ?? existing.taproom_impact, 400),
    production_space: clip(body.productionSpace ?? existing.production_space, 400),
    patio_usage: clip(body.patioUsage ?? existing.patio_usage, 400),
    food_notes: clip(body.foodNotes ?? existing.food_notes, 2000),
    bar_notes: clip(body.barNotes ?? existing.bar_notes, 2000),
    setup_notes: clip(body.setupNotes ?? existing.setup_notes, 2000),
    event_lead: clip(body.eventLead ?? existing.event_lead, 120),
    staffing_notes: clip(body.staffingNotes ?? existing.staffing_notes, 2000),
    guest_notes: clip(body.guestNotes ?? existing.guest_notes, 2000),
    checklist_link: clip(body.checklistLink ?? existing.checklist_link, 160),
    sop_link: clip(body.sopLink ?? existing.sop_link, 160)
  };
}

function mapEventRow(row, { now = new Date() } = {}) {
  if (!row) return null;
  const status = contentStatus({
    active: row.published ? 1 : 0,
    publish_at: row.starts_at,
    expire_at: row.ends_at
  }, { now });
  return {
    id: row.id,
    title: row.title,
    summary: row.summary || "",
    location: row.location || "",
    startsAt: row.starts_at || "",
    endsAt: row.ends_at || "",
    notes: row.notes || "",
    published: Boolean(row.published),
    updatedAt: row.updated_at || null,
    status,
    eventType: row.event_type || "",
    guestCount: row.guest_count || "",
    taproomImpact: row.taproom_impact || "",
    productionSpace: row.production_space || "",
    patioUsage: row.patio_usage || "",
    foodNotes: row.food_notes || "",
    barNotes: row.bar_notes || "",
    setupNotes: row.setup_notes || "",
    eventLead: row.event_lead || "",
    staffingNotes: row.staffing_notes || "",
    guestNotes: row.guest_notes || "",
    checklistLink: row.checklist_link || "",
    sopLink: row.sop_link || ""
  };
}

function eventIsToday(row, now = new Date()) {
  if (!row?.starts_at) return false;
  const start = parseStamp(row.starts_at);
  if (!start) return false;
  const end = parseStamp(row.ends_at) || new Date(start.getTime() + 4 * 60 * 60 * 1000);
  const dayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const dayEnd = new Date(dayStart.getTime() + 24 * 60 * 60 * 1000);
  return start < dayEnd && end >= dayStart;
}

function registerPublishedEventsApi(app, {
  db,
  authRequired,
  eventsManagerRequired,
  loadAuthedUser,
  canEditEvents,
  canEditEventFood
}) {
  ensurePublishedEventsTable(db);

  const saveSql = `
    title = ?, summary = ?, location = ?, starts_at = ?, ends_at = ?, notes = ?,
    published = ?, event_type = ?, guest_count = ?, taproom_impact = ?, production_space = ?,
    patio_usage = ?, food_notes = ?, bar_notes = ?, setup_notes = ?, event_lead = ?,
    staffing_notes = ?, guest_notes = ?, checklist_link = ?, sop_link = ?,
    updated_at = datetime('now'), updated_by = ?
  `;

  app.get("/api/events", authRequired, (req, res) => {
    const user = typeof loadAuthedUser === "function" ? loadAuthedUser(req) : null;
    const canEdit = Boolean(user && (canEditEvents?.(user) || canEditEventFood?.(user)));
    const now = new Date();
    const rows = db.prepare(`
      SELECT * FROM published_events
      ORDER BY CASE WHEN starts_at = '' THEN 1 ELSE 0 END, starts_at ASC, id DESC
    `).all();
    const events = rows
      .map((row) => mapEventRow(row, { now }))
      .filter((row) => canEdit || (row.published && row.status !== "expired"));
    res.json({ events, canEdit, canEditFood: Boolean(user && canEditEventFood?.(user)) });
  });

  app.post("/api/events", authRequired, eventsManagerRequired, (req, res) => {
    const fields = eventFieldsFromBody(req.body || {});
    if (!fields.title) return res.status(400).json({ error: "Title is required." });
    const result = db.prepare(`
      INSERT INTO published_events (
        title, summary, location, starts_at, ends_at, notes, published,
        event_type, guest_count, taproom_impact, production_space, patio_usage,
        food_notes, bar_notes, setup_notes, event_lead, staffing_notes, guest_notes,
        checklist_link, sop_link, updated_by
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      fields.title, fields.summary, fields.location, fields.starts_at, fields.ends_at,
      fields.notes, fields.published, fields.event_type, fields.guest_count, fields.taproom_impact,
      fields.production_space, fields.patio_usage, fields.food_notes, fields.bar_notes,
      fields.setup_notes, fields.event_lead, fields.staffing_notes, fields.guest_notes,
      fields.checklist_link, fields.sop_link, req.user.id
    );
    const row = db.prepare("SELECT * FROM published_events WHERE id = ?").get(result.lastInsertRowid);
    res.json({ event: mapEventRow(row) });
  });

  app.put("/api/events/:id", authRequired, (req, res) => {
    const user = typeof loadAuthedUser === "function" ? loadAuthedUser(req) : null;
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM published_events WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Event not found." });
    const full = Boolean(user && canEditEvents?.(user));
    const foodOnly = Boolean(user && canEditEventFood?.(user));
    if (!full && !foodOnly) {
      return res.status(403).json({ error: "Event lead, manager, admin, or head chef access required." });
    }
    const fields = full
      ? eventFieldsFromBody(req.body || {}, existing)
      : eventFieldsFromBody({ foodNotes: req.body?.foodNotes }, existing);
    if (!fields.title) return res.status(400).json({ error: "Title is required." });
    db.prepare(`UPDATE published_events SET ${saveSql} WHERE id = ?`).run(
      fields.title, fields.summary, fields.location, fields.starts_at, fields.ends_at,
      fields.notes, fields.published, fields.event_type, fields.guest_count, fields.taproom_impact,
      fields.production_space, fields.patio_usage, fields.food_notes, fields.bar_notes,
      fields.setup_notes, fields.event_lead, fields.staffing_notes, fields.guest_notes,
      fields.checklist_link, fields.sop_link, req.user.id, id
    );
    const row = db.prepare("SELECT * FROM published_events WHERE id = ?").get(id);
    res.json({ event: mapEventRow(row) });
  });

  app.delete("/api/events/:id", authRequired, eventsManagerRequired, (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT id FROM published_events WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Event not found." });
    db.prepare("DELETE FROM published_events WHERE id = ?").run(id);
    res.json({ ok: true });
  });
}

module.exports = {
  ensurePublishedEventsTable,
  registerPublishedEventsApi,
  mapEventRow,
  eventIsToday
};
