/**
 * Fallback beer menu when Nucleus is not configured (no NUCLEUS_API_KEY).
 * Uses the published Google Sheet CSV that this app read before Nucleus.
 * Prefer Nucleus in production — this is for local/dev continuity.
 */

const BEER_CSV_URL =
  process.env.BEER_CSV_URL ||
  "https://docs.google.com/spreadsheets/d/e/2PACX-1vRfvDNoqxHQCc7PBCm-xetbdDiAfyfi3ECVbnRAfoCYJmdfSxFuamdGJ6THg97ErXp3hFCLG1IBcZsH/pub?gid=0&single=true&output=csv";

const CACHE_TTL_MS = 5 * 60 * 1000;
let cache = { rows: [], fetchedAt: 0 };

function parseCSV(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (ch === '"' && next === '"') {
        field += '"';
        i++;
      } else if (ch === '"') {
        inQuotes = false;
      } else {
        field += ch;
      }
      continue;
    }

    if (ch === '"') {
      inQuotes = true;
    } else if (ch === ",") {
      row.push(field);
      field = "";
    } else if (ch === "\n" || (ch === "\r" && next === "\n")) {
      row.push(field);
      if (row.some((cell) => cell.trim())) rows.push(row);
      row = [];
      field = "";
      if (ch === "\r") i++;
    } else {
      field += ch;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    if (row.some((cell) => cell.trim())) rows.push(row);
  }

  if (!rows.length) return [];
  const headers = rows[0].map((h) => h.trim());
  return rows.slice(1).map((cells) => {
    const obj = {};
    headers.forEach((header, idx) => {
      obj[header] = (cells[idx] || "").trim();
    });
    return obj;
  });
}

function normalizeSheetRow(row) {
  const name = (row.Name || row.name || "").trim();
  if (!name || name === "?") return null;

  const onTap = row["On Tap"] || row["on tap"] || "";
  const tapMatch = String(onTap).match(/\d+/);
  const recently = row["Recently Tapped"] || row["New Tap"] || "";

  return {
    ...row,
    Name: name,
    Number: row.Number || row.number || "",
    Style: row.Style || row.style || "",
    abv: row.abv || row.ABV || "",
    "Description / ingredients": row["Description / ingredients"] || "",
    "Flavor Profile": row["Flavor Profile"] || "",
    "Guest Guidance": row["Guest Guidance"] || "",
    "Gluten-Reduced": row["Gluten-Reduced"] || "",
    "On Tap": onTap,
    "New Tap": /yes|y|true|1/i.test(String(recently)) ? "Yes" : "",
    Tap: tapMatch ? String(Number(tapMatch[0])) : "",
    StaffNotes: row["Staff Notes"] || row.StaffNotes || ""
  };
}

async function getBeerRowsFromSheet() {
  const now = Date.now();
  if (cache.rows.length && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rows;
  }

  const response = await fetch(BEER_CSV_URL, { cache: "no-store", redirect: "follow" });
  if (!response.ok) {
    throw new Error(`Beer spreadsheet returned ${response.status}`);
  }
  const text = await response.text();
  if (/<html/i.test(text.slice(0, 200))) {
    throw new Error("Beer spreadsheet returned HTML instead of CSV (link may be private).");
  }

  const rows = parseCSV(text)
    .map(normalizeSheetRow)
    .filter(Boolean);

  rows.sort((a, b) => {
    const aTap = Number(a.Tap || 0);
    const bTap = Number(b.Tap || 0);
    if (aTap && bTap) return aTap - bTap;
    if (aTap) return -1;
    if (bTap) return 1;
    return a.Name.localeCompare(b.Name);
  });

  cache = { rows, fetchedAt: now };
  console.log(`Beer menu loaded from spreadsheet fallback (${rows.length} rows).`);
  return rows;
}

function getPickerOptionsFromSheet(rows) {
  return rows
    .map((row) => ({
      id: row.Number || row.Name,
      name: row.Name,
      style: row.Style || "",
      mp_number: row.Number || ""
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

module.exports = {
  BEER_CSV_URL,
  getBeerRowsFromSheet,
  getPickerOptionsFromSheet
};
