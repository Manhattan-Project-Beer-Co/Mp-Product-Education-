#!/usr/bin/env node
// Resolve the beer names already stored in this database to Nucleus product ids.
//
// Two tables reference a beer by name: `beer_checkins.beer_name` (a staff
// tasting note) and `users.favorite_beer` (which was a free-text box, so some
// values are not beers at all — "Still deciding" is a real one). Both gain a
// Nucleus id here, and both keep their text.
//
// **Reports by default; writes only with --apply.** Run it dry against a copy of
// the production database first: the output is the list of values the catalog
// cannot account for, which is exactly what has to be looked at by a human
// before anything is written. Anything unresolved is left alone — never blanked,
// never deleted. Someone's tasting note is not the migration's to discard.
//
// Usage:
//   node scripts/backfill-beer-uuids.js                 # report only
//   node scripts/backfill-beer-uuids.js --apply         # write the ids
//   DB_PATH=/path/to/training.db node scripts/backfill-beer-uuids.js

require("dotenv").config();

const Database = require("better-sqlite3");
const { DB_PATH } = require("../db-path");
const nucleus = require("../nucleus");

const APPLY = process.argv.includes("--apply");

//: Hand-written equivalences for names the catalog cannot match on its own.
//: The first entry is real: the taproom list called MP0142 by its number for
//: long enough that it reached the database that way, while Nucleus knows it as
//: Easy Run. Add a line here when the report turns up something a human can
//: identify; leave it out when they cannot.
const ALIASES = new Map([
  ["mp0142", "Easy Run"]
]);

const norm = (value) => String(value || "").toLowerCase().replace(/[^a-z0-9]/g, "");

function buildIndex(products) {
  const byName = new Map();
  const byNumber = new Map();
  for (const product of products) {
    const nameKey = norm(product.name);
    if (!byName.has(nameKey)) byName.set(nameKey, []);
    byName.get(nameKey).push(product);

    const numberKey = norm(product.mp_number);
    if (!byNumber.has(numberKey)) byNumber.set(numberKey, []);
    byNumber.get(numberKey).push(product);
  }
  return { byName, byNumber };
}

/**
 * The product a stored name means, or null.
 *
 * Same ladder the Nucleus tap seed uses, so the two agree: alias, then exact
 * name, then MP number, and where a number matches a whole family, the base
 * variant `00`. Anything still ambiguous resolves to nothing rather than
 * guessing — a wrong id is worse than a null, because a null is visible.
 */
function resolve(value, index) {
  const alias = ALIASES.get(norm(value));
  const target = alias ? norm(alias) : norm(value);
  if (!target) return null;

  let candidates = index.byName.get(target) || index.byNumber.get(target) || [];
  if (candidates.length === 1) return candidates[0];
  if (candidates.length > 1) {
    const base = candidates.filter((p) => p.variant === "00");
    if (base.length === 1) return base[0];
  }
  return null;
}

function report(label, rows, index) {
  const unresolved = new Map();
  let resolved = 0;

  for (const row of rows) {
    if (resolve(row.value, index)) resolved += 1;
    else unresolved.set(row.value, (unresolved.get(row.value) || 0) + 1);
  }

  console.log(`\n${label}: ${resolved} resolved, ${unresolved.size} distinct values unresolved`);
  if (unresolved.size) {
    const sorted = [...unresolved.entries()].sort((a, b) => b[1] - a[1]);
    for (const [value, count] of sorted) {
      console.log(`  ${String(count).padStart(4)}x  ${JSON.stringify(value)}`);
    }
  }
  return resolved;
}

async function main() {
  if (!nucleus.configured()) {
    console.error("NUCLEUS_BASE_URL and NUCLEUS_API_KEY must be set.");
    process.exit(1);
  }

  console.log(`database: ${DB_PATH}`);
  console.log(APPLY ? "mode: APPLY (writing ids)" : "mode: report only (pass --apply to write)");

  const products = await nucleus.getProducts();
  const index = buildIndex(products);
  console.log(`catalog: ${products.length} products (inactive included)`);

  const db = new Database(DB_PATH);

  const checkins = db
    .prepare("SELECT id, beer_name AS value FROM beer_checkins WHERE nucleus_product_id IS NULL")
    .all();
  const favorites = db
    .prepare(
      "SELECT id, favorite_beer AS value FROM users " +
        "WHERE favorite_beer <> '' AND favorite_beer_product_id = ''"
    )
    .all();

  report("beer_checkins", checkins, index);
  report("users.favorite_beer", favorites, index);

  if (!APPLY) {
    console.log("\nNothing written. Re-run with --apply once the unresolved list has been read.");
    db.close();
    return;
  }

  const setCheckin = db.prepare("UPDATE beer_checkins SET nucleus_product_id = ? WHERE id = ?");
  const setFavorite = db.prepare("UPDATE users SET favorite_beer_product_id = ? WHERE id = ?");

  const write = db.transaction(() => {
    let written = 0;
    for (const row of checkins) {
      const product = resolve(row.value, index);
      if (product) {
        setCheckin.run(product.id, row.id);
        written += 1;
      }
    }
    for (const row of favorites) {
      const product = resolve(row.value, index);
      if (product) {
        setFavorite.run(product.id, row.id);
        written += 1;
      }
    }
    return written;
  });

  console.log(`\nwrote ${write()} ids. Unresolved rows keep their text and are untouched.`);
  db.close();
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
