#!/usr/bin/env node
// Takes an immediate database snapshot, outside the nightly schedule.
//
// Run this before anything that rewrites data in bulk — a migration, a manual
// correction, a deploy you are unsure about. It forces a snapshot even when
// today's already exists, so it does not silently do nothing when you most
// want it to work.
//
//   npm run backup

require("dotenv").config();

const Database = require("better-sqlite3");
const { DB_PATH } = require("./../db-path");
const { runBackup, listBackups, BACKUP_DIR, RETENTION_DAYS } = require("./../backup");

const db = new Database(DB_PATH, { readonly: true });

runBackup(db, { force: true })
  .then((written) => {
    console.log(`\nSource:    ${DB_PATH}`);
    console.log(`Backup:    ${written}`);
    console.log(`Directory: ${BACKUP_DIR} (keeping ${RETENTION_DAYS})`);
    console.log(`On disk:   ${listBackups().join(", ") || "none"}`);
    db.close();
  })
  .catch((err) => {
    console.error(`Backup failed: ${err.message}`);
    db.close();
    process.exit(1);
  });
