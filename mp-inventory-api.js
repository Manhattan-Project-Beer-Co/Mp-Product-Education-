/**
 * MP Inventory (ops counting / reorder) — ported from Desktop/MP_Inventory.
 * Mounts under /api/ops-inventory.
 */
const fs = require("fs");
const path = require("path");
const {
  calcAll,
  averageUsage,
  calcWeekUsage,
  USAGE_WINDOW_WEEKS,
  formatMoney
} = require("./inventory-logic");

const SEED_PATH = path.join(__dirname, "data", "mp-inventory-seed.json");

function registerMpInventory(app, db, { authRequired, inventoryManagerRequired, optionalAuth }) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS mp_distributors (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      lead_time_days INTEGER NOT NULL DEFAULT 3
    );

    CREATE TABLE IF NOT EXISTS mp_owners (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mp_sections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      owner_id TEXT NOT NULL,
      distributor_id TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (owner_id) REFERENCES mp_owners(id),
      FOREIGN KEY (distributor_id) REFERENCES mp_distributors(id)
    );

    CREATE TABLE IF NOT EXISTS mp_items (
      id TEXT PRIMARY KEY,
      section_id TEXT NOT NULL,
      name TEXT NOT NULL,
      unit TEXT NOT NULL DEFAULT 'Each',
      in_stock REAL NOT NULL DEFAULT 0,
      sales_4wk REAL NOT NULL DEFAULT 0,
      case_size REAL NOT NULL DEFAULT 1,
      serving_size REAL NOT NULL DEFAULT 1,
      container_size REAL NOT NULL DEFAULT 1,
      cost_per_unit REAL NOT NULL DEFAULT 0,
      baseline_par REAL,
      manual_par REAL,
      vendor TEXT NOT NULL DEFAULT '',
      sort_order INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (section_id) REFERENCES mp_sections(id)
    );

    CREATE TABLE IF NOT EXISTS mp_meta (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS mp_weekly_counts (
      id TEXT PRIMARY KEY,
      week_label TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS mp_weekly_count_lines (
      count_id TEXT NOT NULL,
      item_id TEXT NOT NULL,
      in_stock REAL NOT NULL DEFAULT 0,
      received REAL NOT NULL DEFAULT 0,
      usage REAL,
      needed_at_save REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (count_id, item_id),
      FOREIGN KEY (count_id) REFERENCES mp_weekly_counts(id) ON DELETE CASCADE,
      FOREIGN KEY (item_id) REFERENCES mp_items(id)
    );

    CREATE TABLE IF NOT EXISTS mp_orders (
      id TEXT PRIMARY KEY,
      label TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      item_count INTEGER NOT NULL DEFAULT 0,
      total_cost REAL NOT NULL DEFAULT 0,
      lines_json TEXT NOT NULL DEFAULT '[]'
    );
  `);

  function ensureSeed() {
    const { count } = db.prepare("SELECT COUNT(*) AS count FROM mp_items").get();
    if (count > 0) return;
    if (!fs.existsSync(SEED_PATH)) {
      console.warn("MP inventory seed missing:", SEED_PATH);
      return;
    }
    const seed = JSON.parse(fs.readFileSync(SEED_PATH, "utf8"));
    const tx = db.transaction(() => {
      for (const d of seed.distributors || []) {
        db.prepare(`
          INSERT OR REPLACE INTO mp_distributors (id, name, lead_time_days)
          VALUES (?, ?, ?)
        `).run(d.id, d.name, d.leadTimeDays ?? 3);
      }
      for (const o of seed.owners || []) {
        db.prepare(`INSERT OR REPLACE INTO mp_owners (id, name) VALUES (?, ?)`).run(o.id, o.name);
      }
      for (const s of seed.sections || []) {
        db.prepare(`
          INSERT OR REPLACE INTO mp_sections (id, name, owner_id, distributor_id, sort_order)
          VALUES (?, ?, ?, ?, ?)
        `).run(s.id, s.name, s.ownerId, s.distributorId, s.sortOrder ?? 0);
      }
      for (const item of seed.items || []) {
        db.prepare(`
          INSERT OR REPLACE INTO mp_items (
            id, section_id, name, unit, in_stock, sales_4wk, case_size, serving_size,
            container_size, cost_per_unit, baseline_par, manual_par, vendor, sort_order
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(
          item.id,
          item.sectionId,
          item.name,
          item.unit || "Each",
          item.inStock ?? 0,
          item.sales4wk ?? 0,
          item.caseSize ?? 1,
          item.servingSize ?? 1,
          item.containerSize ?? 1,
          item.costPerUnit ?? 0,
          item.baselinePar,
          item.manualPar,
          item.vendor || "",
          item.sortOrder ?? 0
        );
      }
      db.prepare(`INSERT OR REPLACE INTO mp_meta (key, value) VALUES ('ready_section_ids', '[]')`).run();
    });
    tx();
    console.log(`Loaded MP inventory seed (${(seed.items || []).length} items).`);
  }

  ensureSeed();

  function getReadySectionIds() {
    const row = db.prepare("SELECT value FROM mp_meta WHERE key = 'ready_section_ids'").get();
    try {
      const parsed = JSON.parse(row?.value || "[]");
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function setReadySectionIds(ids) {
    db.prepare(`INSERT OR REPLACE INTO mp_meta (key, value) VALUES ('ready_section_ids', ?)`).run(
      JSON.stringify([...new Set(ids)])
    );
  }

  function usageByItemId() {
    const rows = db.prepare(`
      SELECT l.item_id, l.usage, c.created_at
      FROM mp_weekly_count_lines l
      JOIN mp_weekly_counts c ON c.id = l.count_id
      WHERE l.usage IS NOT NULL
      ORDER BY c.created_at DESC
    `).all();

    const map = {};
    for (const row of rows) {
      if (!map[row.item_id]) map[row.item_id] = [];
      if (map[row.item_id].length < USAGE_WINDOW_WEEKS) {
        map[row.item_id].push(row.usage);
      }
    }

    const out = {};
    for (const [itemId, usages] of Object.entries(map)) {
      out[itemId] = {
        avgWeeklyUsage: averageUsage(usages),
        weekCount: usages.length,
        recentUsages: usages
      };
    }
    return out;
  }

  function enrichCatalog() {
    const distributors = db.prepare("SELECT * FROM mp_distributors ORDER BY name").all();
    const owners = db.prepare("SELECT * FROM mp_owners ORDER BY name").all();
    const sections = db.prepare("SELECT * FROM mp_sections ORDER BY sort_order, name").all();
    const items = db.prepare("SELECT * FROM mp_items ORDER BY sort_order, name").all();
    const usageMap = usageByItemId();

    const distMap = Object.fromEntries(distributors.map((d) => [d.id, d]));
    const ownerMap = Object.fromEntries(owners.map((o) => [o.id, o]));
    const sectionMap = Object.fromEntries(sections.map((s) => [s.id, s]));

    const enriched = items.map((item) => {
      const section = sectionMap[item.section_id];
      const owner = section ? ownerMap[section.owner_id] : null;
      const distributor = section ? distMap[section.distributor_id] : null;
      const usage = usageMap[item.id];
      const calc = calcAll({
        sales4wk: item.sales_4wk,
        caseSize: item.case_size,
        servingSize: item.serving_size,
        containerSize: item.container_size,
        leadTimeDays: distributor?.lead_time_days ?? 0,
        inStock: item.in_stock,
        baselinePar: item.baseline_par,
        manualPar: item.manual_par,
        costPerUnit: item.cost_per_unit,
        avgWeeklyUsage: usage?.avgWeeklyUsage ?? null
      });

      return {
        id: item.id,
        sectionId: item.section_id,
        name: item.name,
        unit: item.unit,
        inStock: item.in_stock,
        sales4wk: item.sales_4wk,
        caseSize: item.case_size,
        servingSize: item.serving_size,
        containerSize: item.container_size,
        costPerUnit: item.cost_per_unit,
        baselinePar: item.baseline_par,
        manualPar: item.manual_par,
        vendor: item.vendor,
        sortOrder: item.sort_order,
        sectionName: section?.name || "—",
        ownerId: section?.owner_id || "",
        ownerName: owner?.name || "—",
        distributorId: section?.distributor_id || "",
        distributorName: distributor?.name || "—",
        leadTimeDays: distributor?.lead_time_days ?? 0,
        avgWeeklyUsage: usage?.avgWeeklyUsage ?? null,
        usageWeekCount: usage?.weekCount ?? 0,
        ...calc
      };
    });

    const readyIds = getReadySectionIds();
    const sectionSummaries = sections.map((section) => {
      const sectionItems = enriched.filter((i) => i.sectionId === section.id);
      const orderItems = sectionItems.filter((i) => i.neededForOrder > 0);
      return {
        id: section.id,
        name: section.name,
        ownerId: section.owner_id,
        ownerName: ownerMap[section.owner_id]?.name || "—",
        distributorId: section.distributor_id,
        distributorName: distMap[section.distributor_id]?.name || "—",
        leadTimeDays: distMap[section.distributor_id]?.lead_time_days ?? 0,
        sortOrder: section.sort_order,
        itemCount: sectionItems.length,
        orderCount: orderItems.length,
        weeklyCost: orderItems.reduce((sum, i) => sum + i.weeklyCost, 0),
        ready: readyIds.includes(section.id)
      };
    });

    const orderLines = enriched
      .filter((i) => i.neededForOrder > 0)
      .sort((a, b) => a.distributorName.localeCompare(b.distributorName) || a.name.localeCompare(b.name));

    const totalWeeklyCost = orderLines.reduce((sum, i) => sum + i.weeklyCost, 0);
    const lowStock = enriched.filter((i) => i.inStock <= 0 || i.neededForOrder > 0).length;

    return {
      distributors: distributors.map((d) => ({
        id: d.id,
        name: d.name,
        leadTimeDays: d.lead_time_days
      })),
      owners: owners.map((o) => ({ id: o.id, name: o.name })),
      sections: sectionSummaries,
      items: enriched,
      readySectionIds: readyIds,
      orderLines,
      stats: {
        itemCount: enriched.length,
        sectionCount: sections.length,
        orderLineCount: orderLines.length,
        totalWeeklyCost,
        lowStock,
        readyCount: readyIds.length,
        formatTotalWeeklyCost: formatMoney(totalWeeklyCost)
      }
    };
  }

  app.get("/api/ops-inventory", optionalAuth || ((req, res, next) => next()), (req, res) => {
    res.json(enrichCatalog());
  });

  app.patch("/api/ops-inventory/items/:id", authRequired, (req, res) => {
    const item = db.prepare("SELECT * FROM mp_items WHERE id = ?").get(req.params.id);
    if (!item) return res.status(404).json({ error: "Item not found." });

    const inStock = req.body.inStock != null
      ? Math.max(0, Number(req.body.inStock) || 0)
      : item.in_stock;
    const manualPar = req.body.manualPar !== undefined
      ? (req.body.manualPar == null || req.body.manualPar === "" ? null : Number(req.body.manualPar))
      : item.manual_par;

    db.prepare(`
      UPDATE mp_items SET in_stock = ?, manual_par = ? WHERE id = ?
    `).run(inStock, manualPar, item.id);

    res.json(enrichCatalog());
  });

  app.post("/api/ops-inventory/sections/:id/ready", authRequired, (req, res) => {
    const section = db.prepare("SELECT id FROM mp_sections WHERE id = ?").get(req.params.id);
    if (!section) return res.status(404).json({ error: "Section not found." });
    const ready = getReadySectionIds();
    if (!ready.includes(section.id)) ready.push(section.id);
    setReadySectionIds(ready);
    res.json(enrichCatalog());
  });

  app.delete("/api/ops-inventory/sections/:id/ready", authRequired, (req, res) => {
    const ready = getReadySectionIds().filter((id) => id !== req.params.id);
    setReadySectionIds(ready);
    res.json(enrichCatalog());
  });

  app.post("/api/ops-inventory/week", authRequired, (req, res) => {
    const catalog = enrichCatalog();
    const weekLabel = (req.body.weekLabel || "").trim() || new Date().toISOString().slice(0, 10);
    const receivedMap = req.body.received || {};
    const countId = `week-${Date.now()}`;

    const prevLines = db.prepare(`
      SELECT l.item_id, l.in_stock
      FROM mp_weekly_count_lines l
      JOIN mp_weekly_counts c ON c.id = l.count_id
      ORDER BY c.created_at DESC
    `).all();
    const prevStock = {};
    for (const row of prevLines) {
      if (prevStock[row.item_id] == null) prevStock[row.item_id] = row.in_stock;
    }

    const tx = db.transaction(() => {
      db.prepare(`INSERT INTO mp_weekly_counts (id, week_label) VALUES (?, ?)`).run(countId, weekLabel);
      const insertLine = db.prepare(`
        INSERT INTO mp_weekly_count_lines (count_id, item_id, in_stock, received, usage, needed_at_save)
        VALUES (?, ?, ?, ?, ?, ?)
      `);
      for (const item of catalog.items) {
        const received = Math.max(0, Number(receivedMap[item.id]) || 0);
        const previous = prevStock[item.id];
        const usage = previous == null ? null : calcWeekUsage(previous, received, item.inStock);
        insertLine.run(countId, item.id, item.inStock, received, usage, item.neededForOrder);
      }
    });
    tx();

    res.status(201).json({ ok: true, countId, weekLabel, catalog: enrichCatalog() });
  });

  app.post("/api/ops-inventory/orders", authRequired, inventoryManagerRequired, (req, res) => {
    const catalog = enrichCatalog();
    const lines = catalog.orderLines.map((item) => ({
      itemId: item.id,
      name: item.name,
      unit: item.unit,
      sectionName: item.sectionName,
      ownerName: item.ownerName,
      distributorName: item.distributorName,
      inStock: item.inStock,
      par: item.par,
      orderQty: item.neededForOrder,
      estCost: item.weeklyCost
    }));

    if (!lines.length) {
      return res.status(400).json({ error: "Nothing to order — all sections are at par." });
    }

    const label = (req.body.label || "").trim() || `Order ${new Date().toLocaleDateString()}`;
    const id = `order-${Date.now()}`;
    const totalCost = lines.reduce((sum, l) => sum + l.estCost, 0);

    db.prepare(`
      INSERT INTO mp_orders (id, label, item_count, total_cost, lines_json)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, label, lines.length, totalCost, JSON.stringify(lines));

    // Clear ready flags after submit
    setReadySectionIds([]);

    const shareText = lines
      .map((l) => `${l.distributorName} · ${l.name}: ${l.orderQty} ${l.unit}`)
      .join("\n");

    res.status(201).json({
      order: {
        id,
        label,
        itemCount: lines.length,
        totalCost,
        formatTotalCost: formatMoney(totalCost),
        lines,
        shareText
      },
      catalog: enrichCatalog()
    });
  });

  app.get("/api/ops-inventory/orders", authRequired, (req, res) => {
    const orders = db.prepare(`
      SELECT id, label, created_at, item_count, total_cost
      FROM mp_orders
      ORDER BY created_at DESC
      LIMIT 25
    `).all().map((o) => ({
      id: o.id,
      label: o.label,
      createdAt: o.created_at,
      itemCount: o.item_count,
      totalCost: o.total_cost,
      formatTotalCost: formatMoney(o.total_cost)
    }));
    res.json({ orders });
  });

  app.post("/api/ops-inventory/reset-seed", authRequired, inventoryManagerRequired, (req, res) => {
    const tx = db.transaction(() => {
      db.prepare("DELETE FROM mp_weekly_count_lines").run();
      db.prepare("DELETE FROM mp_weekly_counts").run();
      db.prepare("DELETE FROM mp_orders").run();
      db.prepare("DELETE FROM mp_items").run();
      db.prepare("DELETE FROM mp_sections").run();
      db.prepare("DELETE FROM mp_owners").run();
      db.prepare("DELETE FROM mp_distributors").run();
      db.prepare("DELETE FROM mp_meta").run();
    });
    tx();
    ensureSeed();
    res.json(enrichCatalog());
  });
}

module.exports = { registerMpInventory };
