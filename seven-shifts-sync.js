/**
 * Sync published 7shifts shifts into SQLite for shift-awareness
 * (notifications, end-of-shift prompts, auto shift-lead duty).
 * Does not expose a schedule UI.
 */

const seven = require("./seven-shifts");

const DEFAULT_TZ = process.env.SEVEN_SHIFTS_TIMEZONE || "America/Chicago";

const FLOOR_STATIONS = [
  { key: "shift_lead", label: "Shift Lead" },
  { key: "bartender", label: "Bartender" },
  { key: "float", label: "Float" },
  { key: "run_bus", label: "Run / Bus" }
];

const FLOOR_STATION_KEYS = new Set(FLOOR_STATIONS.map(s => s.key));

function floorStationLabel(key) {
  return FLOOR_STATIONS.find(s => s.key === key)?.label || key || "";
}

function personKeyFromRow(row) {
  if (row?.user_id != null) return `user:${Number(row.user_id)}`;
  if (row?.seven_user_id != null) return `seven:${Number(row.seven_user_id)}`;
  if (row?.seven_shift_id != null) return `shift:${Number(row.seven_shift_id)}`;
  return null;
}

function parsePersonKey(personKey) {
  const raw = String(personKey || "").trim();
  const match = /^(user|seven|shift):(\d+)$/.exec(raw);
  if (!match) return null;
  return { kind: match[1], id: Number(match[2]), personKey: raw };
}

function localDateKey(date = new Date(), timeZone = DEFAULT_TZ) {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(date);
}

function ensureTables(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS scheduled_shifts (
      seven_shift_id INTEGER PRIMARY KEY,
      seven_user_id INTEGER,
      user_id INTEGER,
      location_id INTEGER,
      department_id INTEGER,
      role_id INTEGER,
      role_name TEXT NOT NULL DEFAULT '',
      station_name TEXT NOT NULL DEFAULT '',
      start_at TEXT NOT NULL,
      end_at TEXT NOT NULL,
      shift_date TEXT NOT NULL,
      is_shift_lead INTEGER NOT NULL DEFAULT 0,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_user_date
      ON scheduled_shifts(user_id, shift_date);
    CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_date
      ON scheduled_shifts(shift_date);
    CREATE INDEX IF NOT EXISTS idx_scheduled_shifts_end
      ON scheduled_shifts(end_at);

    CREATE TABLE IF NOT EXISTS seven_shifts_users (
      seven_user_id INTEGER PRIMARY KEY,
      email TEXT NOT NULL DEFAULT '',
      name TEXT NOT NULL DEFAULT '',
      user_id INTEGER,
      synced_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (user_id) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_seven_shifts_users_email
      ON seven_shifts_users(email);

    CREATE TABLE IF NOT EXISTS floor_station_assignments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      shift_date TEXT NOT NULL,
      station_key TEXT NOT NULL,
      person_key TEXT NOT NULL,
      user_id INTEGER,
      seven_user_id INTEGER,
      display_name TEXT NOT NULL DEFAULT '',
      assigned_by INTEGER,
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(shift_date, person_key),
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (assigned_by) REFERENCES users(id)
    );
    CREATE INDEX IF NOT EXISTS idx_floor_station_assignments_date
      ON floor_station_assignments(shift_date);
    CREATE INDEX IF NOT EXISTS idx_floor_station_assignments_station
      ON floor_station_assignments(shift_date, station_key);
  `);

  const userCols = new Set(db.prepare("PRAGMA table_info(users)").all().map(c => c.name));
  if (!userCols.has("seven_shifts_user_id")) {
    db.exec("ALTER TABLE users ADD COLUMN seven_shifts_user_id INTEGER");
  }
}

function windowIsoRange(daysBack = 1, daysForward = 2, timeZone = DEFAULT_TZ) {
  const now = new Date();
  const startLocal = new Date(now.getTime() - daysBack * 24 * 60 * 60 * 1000);
  const endLocal = new Date(now.getTime() + daysForward * 24 * 60 * 60 * 1000);
  // Broad UTC envelope around local business days
  const startGte = new Date(Date.UTC(
    startLocal.getUTCFullYear(),
    startLocal.getUTCMonth(),
    startLocal.getUTCDate() - 1,
    0, 0, 0
  )).toISOString().replace(/\.\d{3}Z$/, "Z");
  const startLte = new Date(Date.UTC(
    endLocal.getUTCFullYear(),
    endLocal.getUTCMonth(),
    endLocal.getUTCDate() + 1,
    23, 59, 59
  )).toISOString().replace(/\.\d{3}Z$/, "Z");
  return { startGte, startLte, timeZone };
}

function extractEmail(user) {
  return seven.normalizeEmail(
    user?.email ||
    user?.work_email ||
    user?.home_email ||
    user?.user?.email ||
    ""
  );
}

function extractName(user) {
  const first = user?.firstname || user?.first_name || "";
  const last = user?.lastname || user?.last_name || "";
  const combined = `${first} ${last}`.trim();
  return combined || user?.name || user?.preferred_name || "";
}

async function syncSevenShifts(db, options = {}) {
  if (!seven.isConfigured()) {
    return { ok: false, skipped: true, reason: "not_configured" };
  }

  ensureTables(db);
  const cfg = seven.config();
  const { startGte, startLte, timeZone } = windowIsoRange(
    options.daysBack ?? 1,
    options.daysForward ?? 2
  );

  const [users, roles, shifts] = await Promise.all([
    seven.listUsers(cfg.companyId),
    seven.listRoles(cfg.companyId),
    seven.listShifts({
      companyId: cfg.companyId,
      locationId: cfg.locationId,
      departmentId: cfg.departmentId,
      startGte,
      startLte
    })
  ]);

  const roleById = new Map(roles.map(role => [Number(role.id), role]));
  const portalByEmail = new Map(
    db.prepare("SELECT id, email, seven_shifts_user_id FROM users").all()
      .map(row => [seven.normalizeEmail(row.email), row])
  );

  const upsertSevenUser = db.prepare(`
    INSERT INTO seven_shifts_users (seven_user_id, email, name, user_id, synced_at)
    VALUES (?, ?, ?, ?, datetime('now'))
    ON CONFLICT(seven_user_id) DO UPDATE SET
      email = excluded.email,
      name = excluded.name,
      user_id = excluded.user_id,
      synced_at = excluded.synced_at
  `);
  const linkPortalUser = db.prepare(`
    UPDATE users SET seven_shifts_user_id = ? WHERE id = ? AND (seven_shifts_user_id IS NULL OR seven_shifts_user_id != ?)
  `);

  const userMap = new Map();
  for (const user of users) {
    const sevenUserId = Number(user.id);
    if (!Number.isFinite(sevenUserId)) continue;
    const email = extractEmail(user);
    const portal = email ? portalByEmail.get(email) : null;
    const portalId = portal?.id || null;
    upsertSevenUser.run(sevenUserId, email, extractName(user), portalId);
    if (portalId) {
      linkPortalUser.run(sevenUserId, portalId, sevenUserId);
    }
    userMap.set(sevenUserId, { email, portalId, name: extractName(user) });
  }

  const clearWindow = db.prepare(`
    DELETE FROM scheduled_shifts
    WHERE start_at >= ? AND start_at <= ?
      AND (? IS NULL OR location_id = ?)
      AND (? IS NULL OR department_id = ?)
  `);
  const insertShift = db.prepare(`
    INSERT INTO scheduled_shifts (
      seven_shift_id, seven_user_id, user_id, location_id, department_id,
      role_id, role_name, station_name, start_at, end_at, shift_date, is_shift_lead, synced_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(seven_shift_id) DO UPDATE SET
      seven_user_id = excluded.seven_user_id,
      user_id = excluded.user_id,
      location_id = excluded.location_id,
      department_id = excluded.department_id,
      role_id = excluded.role_id,
      role_name = excluded.role_name,
      station_name = excluded.station_name,
      start_at = excluded.start_at,
      end_at = excluded.end_at,
      shift_date = excluded.shift_date,
      is_shift_lead = excluded.is_shift_lead,
      synced_at = excluded.synced_at
  `);

  const apply = db.transaction(() => {
    clearWindow.run(
      startGte,
      startLte,
      cfg.locationId,
      cfg.locationId,
      cfg.departmentId,
      cfg.departmentId
    );

    let kept = 0;
    for (const shift of shifts) {
      if (shift.deleted || shift.draft || shift.open || shift.unassigned) continue;
      const sevenUserId = Number(shift.user_id);
      if (!Number.isFinite(sevenUserId)) continue;
      const role = roleById.get(Number(shift.role_id)) || null;
      const mapped = userMap.get(sevenUserId);
      const portalId = mapped?.portalId || null;
      const startAt = shift.start;
      const endAt = shift.end;
      if (!startAt || !endAt) continue;
      const shiftDate = localDateKey(new Date(startAt), timeZone);
      const lead = seven.isShiftLeadRole(role, cfg) ? 1 : 0;

      insertShift.run(
        Number(shift.id),
        sevenUserId,
        portalId,
        Number(shift.location_id) || cfg.locationId || null,
        Number(shift.department_id) || cfg.departmentId || null,
        Number(shift.role_id) || null,
        role?.name || "",
        shift.station_name || "",
        startAt,
        endAt,
        shiftDate,
        lead
      );
      kept += 1;
    }

    // Auto-assign shift lead duty for today (and tomorrow) from 7shifts roles
    const dates = [...new Set(
      db.prepare(`
        SELECT DISTINCT shift_date FROM scheduled_shifts
        WHERE shift_date >= ? AND is_shift_lead = 1 AND user_id IS NOT NULL
      `).all(localDateKey(new Date(Date.now() - 24 * 60 * 60 * 1000), timeZone))
        .map(r => r.shift_date)
    )];

    const clearAutoDuty = db.prepare(`
      DELETE FROM shift_lead_duty
      WHERE shift_date = ? AND assigned_by IS NULL
    `);
    const insertDuty = db.prepare(`
      INSERT OR IGNORE INTO shift_lead_duty (user_id, shift_date, assigned_by)
      VALUES (?, ?, NULL)
    `);

    for (const date of dates) {
      clearAutoDuty.run(date);
      const leads = db.prepare(`
        SELECT DISTINCT user_id FROM scheduled_shifts
        WHERE shift_date = ? AND is_shift_lead = 1 AND user_id IS NOT NULL
      `).all(date);
      for (const row of leads) {
        insertDuty.run(row.user_id, date);
      }
    }

    return { kept, users: users.length, roles: roles.length, dates: dates.length };
  });

  const result = apply();
  return {
    ok: true,
    skipped: false,
    syncedAt: new Date().toISOString(),
    window: { startGte, startLte },
    ...result
  };
}

function getUserShiftContext(db, userId, now = new Date()) {
  ensureTables(db);
  const today = localDateKey(now);
  const soonStart = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const recentEnd = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const endingWindow = new Date(now.getTime() + 90 * 60 * 1000).toISOString();

  const active = db.prepare(`
    SELECT * FROM scheduled_shifts
    WHERE user_id = ?
      AND start_at <= ?
      AND end_at >= ?
    ORDER BY end_at ASC
    LIMIT 1
  `).get(userId, soonStart, recentEnd);

  const endingSoon = db.prepare(`
    SELECT * FROM scheduled_shifts
    WHERE user_id = ?
      AND end_at >= ?
      AND end_at <= ?
    ORDER BY end_at ASC
    LIMIT 1
  `).get(userId, now.toISOString(), endingWindow);

  const todayShifts = db.prepare(`
    SELECT * FROM scheduled_shifts
    WHERE user_id = ? AND shift_date = ?
    ORDER BY start_at ASC
  `).all(userId, today);

  const currentLeads = db.prepare(`
    SELECT DISTINCT u.id, u.name, u.email, s.role_name, s.start_at, s.end_at
    FROM scheduled_shifts s
    JOIN users u ON u.id = s.user_id
    WHERE s.shift_date = ?
      AND s.is_shift_lead = 1
      AND s.start_at <= ?
      AND s.end_at >= ?
    ORDER BY u.name ASC
  `).all(today, soonStart, recentEnd);

  const shift = active || endingSoon || todayShifts[todayShifts.length - 1] || null;
  const endMs = shift ? Date.parse(shift.end_at) : NaN;
  const minutesToEnd = Number.isFinite(endMs) ? Math.round((endMs - now.getTime()) / 60000) : null;

  const lastRow = db.prepare(`
    SELECT * FROM scheduled_shifts
    WHERE user_id = ?
      AND end_at < ?
    ORDER BY end_at DESC
    LIMIT 1
  `).get(userId, now.toISOString());

  return {
    synced: Boolean(db.prepare("SELECT 1 FROM scheduled_shifts LIMIT 1").get()),
    source: seven.isConfigured() ? "7shifts" : "none",
    today,
    onShift: Boolean(active),
    isShiftLeadNow: Boolean(active?.is_shift_lead) || currentLeads.some(l => l.id === userId),
    minutesToEnd,
    promptEndOfShift: minutesToEnd != null && minutesToEnd <= 60 && minutesToEnd >= -30,
    promptClosingChecklist: minutesToEnd != null && minutesToEnd <= 90 && minutesToEnd >= -15,
    currentShift: shift ? {
      startAt: shift.start_at,
      endAt: shift.end_at,
      roleName: shift.role_name,
      stationName: shift.station_name,
      isShiftLead: Boolean(shift.is_shift_lead),
      shiftDate: shift.shift_date
    } : null,
    todayShifts: todayShifts.map(row => ({
      startAt: row.start_at,
      endAt: row.end_at,
      roleName: row.role_name,
      stationName: row.station_name,
      isShiftLead: Boolean(row.is_shift_lead)
    })),
    currentShiftLeads: currentLeads.map(row => ({
      id: row.id,
      name: row.name,
      email: row.email,
      roleName: row.role_name,
      startAt: row.start_at,
      endAt: row.end_at
    })),
    lastShift: lastRow ? {
      startAt: lastRow.start_at,
      endAt: lastRow.end_at,
      roleName: lastRow.role_name,
      stationName: lastRow.station_name,
      isShiftLead: Boolean(lastRow.is_shift_lead),
      shiftDate: lastRow.shift_date
    } : null
  };
}

function getWorkingStaff(db, shiftDate = localDateKey()) {
  ensureTables(db);
  return db.prepare(`
    SELECT s.*,
      u.name AS portal_name,
      u.email AS portal_email,
      su.name AS seven_name,
      su.email AS seven_email
    FROM scheduled_shifts s
    LEFT JOIN users u ON u.id = s.user_id
    LEFT JOIN seven_shifts_users su ON su.seven_user_id = s.seven_user_id
    WHERE s.shift_date = ?
    ORDER BY s.start_at ASC, s.role_name ASC
  `).all(shiftDate);
}

function buildCoverageAlerts(staff, { isToday = true } = {}) {
  const alerts = [];
  const leads = staff.filter(s => s.isShiftLead);
  if (!leads.length) {
    alerts.push({
      level: "warn",
      code: "no_lead",
      roleName: "Shift Lead",
      message: "No shift lead scheduled",
      nextAt: null
    });
  } else if (isToday && !leads.some(s => s.status === "now")) {
    const next = leads
      .filter(s => s.status === "upcoming")
      .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt))[0];
    alerts.push({
      level: "warn",
      code: "no_lead_now",
      roleName: "Shift Lead",
      message: "No shift lead on the floor now",
      nextAt: next?.startAt || null
    });
  }

  const byRole = new Map();
  for (const person of staff) {
    const role = String(person.roleName || "").trim() || "Unassigned";
    if (/lead/i.test(role)) continue;
    if (!byRole.has(role)) byRole.set(role, []);
    byRole.get(role).push(person);
  }

  for (const [role, list] of byRole) {
    if (isToday) {
      const onNow = list.filter(s => s.status === "now");
      const upcoming = list
        .filter(s => s.status === "upcoming")
        .sort((a, b) => Date.parse(a.startAt) - Date.parse(b.startAt));
      if (onNow.length === 0 && upcoming.length > 0) {
        alerts.push({
          level: "info",
          code: "gap_now",
          roleName: role,
          message: `No ${role} on now`,
          nextAt: upcoming[0].startAt
        });
      }
    } else if (list.length === 1) {
      alerts.push({
        level: "info",
        code: "thin",
        roleName: role,
        message: `Only one ${role} scheduled`,
        nextAt: list[0].startAt
      });
    }
  }

  return alerts.slice(0, 8);
}

function getFloorStationAssignments(db, shiftDate = localDateKey()) {
  ensureTables(db);
  return db.prepare(`
    SELECT shift_date, station_key, person_key, user_id, seven_user_id, display_name, assigned_by, updated_at
    FROM floor_station_assignments
    WHERE shift_date = ?
    ORDER BY station_key ASC, display_name ASC
  `).all(shiftDate).map(row => ({
    shiftDate: row.shift_date,
    stationKey: row.station_key,
    stationLabel: floorStationLabel(row.station_key),
    personKey: row.person_key,
    userId: row.user_id,
    sevenUserId: row.seven_user_id,
    displayName: row.display_name,
    assignedBy: row.assigned_by,
    updatedAt: row.updated_at
  }));
}

function setFloorStationAssignment(db, {
  shiftDate,
  personKey,
  stationKey,
  displayName = "",
  assignedBy = null
} = {}) {
  ensureTables(db);
  const parsed = parsePersonKey(personKey);
  if (!parsed) {
    const err = new Error("Invalid person key.");
    err.status = 400;
    throw err;
  }
  if (!isValidShiftDateLike(shiftDate)) {
    const err = new Error("Invalid shift date.");
    err.status = 400;
    throw err;
  }
  if (!FLOOR_STATION_KEYS.has(stationKey)) {
    const err = new Error("Invalid floor station.");
    err.status = 400;
    throw err;
  }

  const userId = parsed.kind === "user" ? parsed.id : null;
  const sevenUserId = parsed.kind === "seven" ? parsed.id : null;

  db.prepare(`
    INSERT INTO floor_station_assignments (
      shift_date, station_key, person_key, user_id, seven_user_id, display_name, assigned_by, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(shift_date, person_key) DO UPDATE SET
      station_key = excluded.station_key,
      user_id = excluded.user_id,
      seven_user_id = excluded.seven_user_id,
      display_name = excluded.display_name,
      assigned_by = excluded.assigned_by,
      updated_at = datetime('now')
  `).run(
    shiftDate,
    stationKey,
    parsed.personKey,
    userId,
    sevenUserId,
    String(displayName || "").trim(),
    assignedBy
  );

  return getFloorStationAssignments(db, shiftDate)
    .find(row => row.personKey === parsed.personKey) || null;
}

function clearFloorStationAssignment(db, { shiftDate, personKey } = {}) {
  ensureTables(db);
  const parsed = parsePersonKey(personKey);
  if (!parsed || !isValidShiftDateLike(shiftDate)) {
    const err = new Error("Invalid assignment target.");
    err.status = 400;
    throw err;
  }
  db.prepare(`
    DELETE FROM floor_station_assignments
    WHERE shift_date = ? AND person_key = ?
  `).run(shiftDate, parsed.personKey);
  return { ok: true, shiftDate, personKey: parsed.personKey };
}

function isValidShiftDateLike(value) {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function getTodayFloorBoard(db, {
  shiftDate = localDateKey(),
  viewerUserId = null,
  now = new Date(),
  privileged = false
} = {}) {
  ensureTables(db);
  const soonStart = new Date(now.getTime() + 30 * 60 * 1000).toISOString();
  const recentEnd = new Date(now.getTime() - 15 * 60 * 1000).toISOString();
  const soonMs = Date.parse(soonStart);
  const recentMs = Date.parse(recentEnd);
  const nowMs = now.getTime();
  const isToday = shiftDate === localDateKey(now);

  const rows = getWorkingStaff(db, shiftDate);
  const assignmentByPerson = new Map(
    getFloorStationAssignments(db, shiftDate).map(row => [row.personKey, row])
  );

  const staff = rows.map(row => {
    const startMs = Date.parse(row.start_at);
    const endMs = Date.parse(row.end_at);
    const onNow = Number.isFinite(startMs) && Number.isFinite(endMs)
      && startMs <= soonMs
      && endMs >= recentMs;
    let status = "done";
    if (onNow) status = "now";
    else if (Number.isFinite(startMs) && startMs > nowMs) status = "upcoming";

    const personKey = personKeyFromRow(row);
    const assignment = personKey ? assignmentByPerson.get(personKey) : null;

    const entry = {
      personKey,
      name: String(row.portal_name || row.seven_name || "").trim() || "Staff",
      roleName: row.role_name || "",
      stationName: row.station_name || "",
      startAt: row.start_at,
      endAt: row.end_at,
      isShiftLead: Boolean(row.is_shift_lead),
      onNow,
      status,
      isYou: viewerUserId != null && row.user_id === viewerUserId,
      floorStation: assignment?.stationKey || null,
      floorStationLabel: assignment?.stationLabel || null
    };

    if (privileged) {
      entry.email = String(row.portal_email || row.seven_email || "").trim() || null;
      entry.mapped = Boolean(row.user_id);
    }

    return entry;
  });

  const statusOrder = { now: 0, upcoming: 1, done: 2 };
  staff.sort((a, b) => {
    const byStatus = statusOrder[a.status] - statusOrder[b.status];
    if (byStatus) return byStatus;
    if (a.isShiftLead !== b.isShiftLead) return a.isShiftLead ? -1 : 1;
    return Date.parse(a.startAt) - Date.parse(b.startAt);
  });

  const synced = Boolean(db.prepare("SELECT 1 FROM scheduled_shifts LIMIT 1").get());
  const latest = db.prepare(`SELECT MAX(synced_at) AS synced_at FROM scheduled_shifts`).get();
  const unmappedCount = rows.filter(row => !row.user_id).length;
  const leadsNow = staff.filter(s => s.status === "now" && s.isShiftLead).map(s => s.name);
  const roles = [...new Set(staff.map(s => String(s.roleName || "").trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b));

  const seenPeople = new Set();
  const uniquePeople = [];
  for (const person of staff) {
    const key = person.personKey || `${person.name}:${person.startAt}`;
    if (seenPeople.has(key)) continue;
    seenPeople.add(key);
    uniquePeople.push(person);
  }

  const stationBoard = FLOOR_STATIONS.map(station => ({
    key: station.key,
    label: station.label,
    people: uniquePeople
      .filter(person => person.floorStation === station.key)
      .map(person => ({
        personKey: person.personKey,
        name: person.name,
        roleName: person.roleName,
        status: person.status,
        isShiftLead: person.isShiftLead
      }))
  }));

  const result = {
    shiftDate,
    isToday,
    synced,
    count: staff.length,
    onNowCount: staff.filter(s => s.status === "now").length,
    roles,
    stations: FLOOR_STATIONS,
    stationBoard,
    staff
  };

  if (privileged) {
    result.privileged = true;
    result.lastSyncedAt = latest?.synced_at || null;
    result.unmappedCount = unmappedCount;
    result.leadsNow = leadsNow;
    result.coverageAlerts = buildCoverageAlerts(staff, { isToday });
  }

  return result;
}

module.exports = {
  ensureTables,
  syncSevenShifts,
  getUserShiftContext,
  getWorkingStaff,
  getTodayFloorBoard,
  getFloorStationAssignments,
  setFloorStationAssignment,
  clearFloorStationAssignment,
  FLOOR_STATIONS,
  FLOOR_STATION_KEYS,
  floorStationLabel,
  localDateKey,
  DEFAULT_TZ
};
