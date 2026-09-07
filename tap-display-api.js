/**
 * Local display overlays for On Tap beers (pour size + print category).
 * Nucleus remains the source of truth for beer identity; these fields are
 * Launch Pad print/menu display properties keyed by nucleus product id.
 */

const PRINT_CATEGORIES = ["CORE", "LIMITED", "HOPPY", "BOLDER", "OTHER / NITRO"];

function ensureTapDisplayTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS tap_display_meta (
      product_id TEXT PRIMARY KEY,
      pour_size TEXT NOT NULL DEFAULT '12/16 oz',
      print_category TEXT NOT NULL DEFAULT 'CORE',
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_by INTEGER,
      FOREIGN KEY (updated_by) REFERENCES users(id)
    );
  `);
}

function normalizeCategory(value) {
  const raw = String(value || "").trim().toUpperCase();
  if (PRINT_CATEGORIES.includes(raw)) return raw;
  if (raw === "OTHER" || raw === "NITRO" || raw === "OTHER/NITRO") return "OTHER / NITRO";
  return "CORE";
}

function mapMetaRow(row) {
  return {
    productId: row.product_id,
    pourSize: row.pour_size || "12/16 oz",
    printCategory: normalizeCategory(row.print_category),
    updatedAt: row.updated_at || null
  };
}

function registerTapDisplayApi(app, {
  db,
  authRequired,
  optionalAuth,
  tapManagerRequired
}) {
  ensureTapDisplayTables(db);

  app.get("/api/tap-display-meta", optionalAuth, (req, res) => {
    const rows = db.prepare("SELECT * FROM tap_display_meta").all();
    const meta = {};
    for (const row of rows) {
      meta[row.product_id] = mapMetaRow(row);
    }
    res.json({ meta, categories: PRINT_CATEGORIES });
  });

  app.put("/api/tap-display-meta/:productId", authRequired, tapManagerRequired, (req, res) => {
    const productId = String(req.params.productId || "").trim();
    if (!productId) return res.status(400).json({ error: "productId required." });

    const pourSize = String(req.body?.pourSize ?? "12/16 oz").trim().slice(0, 40) || "12/16 oz";
    const printCategory = normalizeCategory(req.body?.printCategory);

    db.prepare(`
      INSERT INTO tap_display_meta (product_id, pour_size, print_category, updated_at, updated_by)
      VALUES (?, ?, ?, datetime('now'), ?)
      ON CONFLICT(product_id) DO UPDATE SET
        pour_size = excluded.pour_size,
        print_category = excluded.print_category,
        updated_at = datetime('now'),
        updated_by = excluded.updated_by
    `).run(productId, pourSize, printCategory, req.user.id);

    const row = db.prepare("SELECT * FROM tap_display_meta WHERE product_id = ?").get(productId);
    res.json({ item: mapMetaRow(row) });
  });
}

module.exports = {
  ensureTapDisplayTables,
  registerTapDisplayApi,
  PRINT_CATEGORIES,
  normalizeCategory
};
