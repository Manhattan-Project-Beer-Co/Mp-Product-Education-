/**
 * Published event records for the Events destination.
 * Authorized roles create/edit; staff see live published windows.
 */

const { contentStatus, parseStamp, stampToStorage } = require("./weekly-specials-api");

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
    status
  };
}

function registerPublishedEventsApi(app, {
  db,
  authRequired,
  eventsManagerRequired,
  loadAuthedUser,
  canEditEvents
}) {
  ensurePublishedEventsTable(db);

  app.get("/api/events", authRequired, (req, res) => {
    const user = typeof loadAuthedUser === "function" ? loadAuthedUser(req) : null;
    const canEdit = Boolean(user && canEditEvents?.(user));
    const now = new Date();
    const rows = db.prepare(`
      SELECT * FROM published_events
      ORDER BY CASE WHEN starts_at = '' THEN 1 ELSE 0 END, starts_at ASC, id DESC
    `).all();
    const events = rows
      .map((row) => mapEventRow(row, { now }))
      .filter((row) => canEdit || (row.published && row.status !== "expired"));
    res.json({ events, canEdit });
  });

  app.post("/api/events", authRequired, eventsManagerRequired, (req, res) => {
    const body = req.body || {};
    const title = String(body.title || "").trim().slice(0, 160);
    if (!title) return res.status(400).json({ error: "Title is required." });
    const result = db.prepare(`
      INSERT INTO published_events (title, summary, location, starts_at, ends_at, notes, published, updated_by)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title,
      String(body.summary || "").trim().slice(0, 2000),
      String(body.location || "").trim().slice(0, 160),
      stampToStorage(body.startsAt),
      stampToStorage(body.endsAt),
      String(body.notes || "").trim().slice(0, 2000),
      body.published === false ? 0 : 1,
      req.user.id
    );
    const row = db.prepare("SELECT * FROM published_events WHERE id = ?").get(result.lastInsertRowid);
    res.json({ event: mapEventRow(row) });
  });

  app.put("/api/events/:id", authRequired, eventsManagerRequired, (req, res) => {
    const id = Number(req.params.id);
    const existing = db.prepare("SELECT * FROM published_events WHERE id = ?").get(id);
    if (!existing) return res.status(404).json({ error: "Event not found." });
    const body = req.body || {};
    const title = String(body.title ?? existing.title).trim().slice(0, 160);
    if (!title) return res.status(400).json({ error: "Title is required." });
    db.prepare(`
      UPDATE published_events
      SET title = ?, summary = ?, location = ?, starts_at = ?, ends_at = ?, notes = ?,
          published = ?, updated_at = datetime('now'), updated_by = ?
      WHERE id = ?
    `).run(
      title,
      String(body.summary ?? existing.summary).trim().slice(0, 2000),
      String(body.location ?? existing.location).trim().slice(0, 160),
      body.startsAt !== undefined ? stampToStorage(body.startsAt) : existing.starts_at,
      body.endsAt !== undefined ? stampToStorage(body.endsAt) : existing.ends_at,
      String(body.notes ?? existing.notes).trim().slice(0, 2000),
      body.published !== undefined ? (body.published ? 1 : 0) : existing.published,
      req.user.id,
      id
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
  mapEventRow
};
