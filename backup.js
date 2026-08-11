const fs = require("fs");
const path = require("path");

const { DB_PATH } = require("./db-path");

// Backups live beside the database, which means on the Railway volume. That
// protects against the likely failures — a bad migration, a mistaken delete, a
// corrupted file — but NOT against losing the volume itself, since both copies
// share a disk. Copying these snapshots off-box is the follow-up.
const BACKUP_DIR = process.env.BACKUP_DIR || path.join(path.dirname(DB_PATH), "backups");
const RETENTION_DAYS = Number(process.env.BACKUP_RETENTION_DAYS || 14);

// Checked hourly rather than fired once a day: the filename is the date, so a
// run is a no-op when today's snapshot already exists. That makes it
// self-healing — a deploy, restart or crash cannot cause a day to be skipped,
// which a fixed 03:00 timer would.
const CHECK_INTERVAL_MS = 60 * 60 * 1000;

const BACKUP_FILE = /^training-(\d{4}-\d{2}-\d{2})\.db$/;

function todayStamp() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

function listBackups() {
  if (!fs.existsSync(BACKUP_DIR)) return [];
  return fs
    .readdirSync(BACKUP_DIR)
    .filter((name) => BACKUP_FILE.test(name))
    .sort(); // ISO dates sort chronologically as strings.
}

function pruneOldBackups() {
  const existing = listBackups();
  const excess = existing.slice(0, Math.max(0, existing.length - RETENTION_DAYS));
  for (const name of excess) {
    try {
      fs.unlinkSync(path.join(BACKUP_DIR, name));
    } catch (err) {
      console.warn(`Could not remove old backup ${name}:`, err.message);
    }
  }
  return excess;
}

/**
 * Take a snapshot of the live database.
 *
 * Uses SQLite's online backup API, so it produces a consistent copy without
 * blocking writers and without stopping the app. Writes to a .partial file and
 * renames on success, so an interrupted run can never leave a truncated file
 * sitting there under a name that looks like a good backup.
 *
 * Returns the path written, or null when today's snapshot already exists.
 */
async function runBackup(db, { force = false } = {}) {
  fs.mkdirSync(BACKUP_DIR, { recursive: true });

  const destination = path.join(BACKUP_DIR, `training-${todayStamp()}.db`);
  if (!force && fs.existsSync(destination)) return null;

  const partial = `${destination}.partial`;
  try {
    await db.backup(partial);
    fs.renameSync(partial, destination);
  } catch (err) {
    try {
      fs.unlinkSync(partial);
    } catch {
      // Nothing to clean up.
    }
    throw err;
  }

  const sizeKb = Math.max(1, Math.round(fs.statSync(destination).size / 1024));
  const removed = pruneOldBackups();
  console.log(
    `Backup written: ${destination} (${sizeKb} KB). ` +
      `${listBackups().length} kept${removed.length ? `, ${removed.length} pruned` : ""}.`
  );

  return destination;
}

/**
 * Run a backup now, then keep checking hourly. A failure is logged and never
 * propagates: losing a backup is bad, but taking the app down over it is worse.
 */
function startBackupSchedule(db) {
  const attempt = () => {
    runBackup(db).catch((err) => console.warn("Backup failed:", err.message));
  };

  attempt();
  const timer = setInterval(attempt, CHECK_INTERVAL_MS);
  if (typeof timer.unref === "function") timer.unref();
  return timer;
}

module.exports = { BACKUP_DIR, RETENTION_DAYS, runBackup, startBackupSchedule, listBackups };
