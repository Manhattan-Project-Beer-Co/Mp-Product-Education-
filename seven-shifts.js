/**
 * 7shifts API client — schedule awareness only (no schedule UI).
 * Docs: https://developers.7shifts.com/
 *
 * Auth: company Access Token from Company Settings → Developer Tools
 * (OAuth clients are for vetted partners only.)
 */

const SEVEN_API = "https://api.7shifts.com";
const API_VERSION = process.env.SEVEN_SHIFTS_API_VERSION || "2026-01-01";

function envInt(name, fallback = null) {
  const raw = process.env[name];
  if (raw == null || String(raw).trim() === "") return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? n : fallback;
}

function isConfigured() {
  return Boolean(process.env.SEVEN_SHIFTS_ACCESS_TOKEN && process.env.SEVEN_SHIFTS_COMPANY_ID);
}

function config() {
  return {
    token: process.env.SEVEN_SHIFTS_ACCESS_TOKEN || "",
    companyId: envInt("SEVEN_SHIFTS_COMPANY_ID"),
    locationId: envInt("SEVEN_SHIFTS_LOCATION_ID", 204356),
    departmentId: envInt("SEVEN_SHIFTS_DEPARTMENT_ID", 287810),
    shiftLeadRoleIds: String(process.env.SEVEN_SHIFTS_SHIFT_LEAD_ROLE_IDS || "")
      .split(",")
      .map(s => s.trim())
      .filter(Boolean)
      .map(Number)
      .filter(n => Number.isFinite(n)),
    shiftLeadRoleNames: String(process.env.SEVEN_SHIFTS_SHIFT_LEAD_ROLE_NAMES || "shift lead,shiftlead,lead")
      .split(",")
      .map(s => s.trim().toLowerCase())
      .filter(Boolean)
  };
}

async function sevenFetch(path, { query } = {}) {
  const { token } = config();
  if (!token) throw new Error("SEVEN_SHIFTS_ACCESS_TOKEN is not set.");

  const url = new URL(`${SEVEN_API}${path}`);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value == null || value === "") continue;
      url.searchParams.set(key, String(value));
    }
  }

  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      "x-api-version": API_VERSION,
      Accept: "application/json"
    }
  });

  const text = await res.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text };
  }

  if (!res.ok) {
    const message = body?.message || body?.error || `7shifts ${res.status}`;
    const err = new Error(message);
    err.status = res.status;
    err.body = body;
    throw err;
  }

  return body;
}

async function listAllPages(path, query = {}) {
  const rows = [];
  let cursor = null;
  do {
    const page = await sevenFetch(path, {
      query: {
        ...query,
        limit: 250,
        ...(cursor ? { cursor } : {})
      }
    });
    const data = Array.isArray(page?.data) ? page.data : [];
    rows.push(...data);
    cursor = page?.meta?.cursor?.next || null;
  } while (cursor);
  return rows;
}

async function whoAmI() {
  return sevenFetch("/v2/whoami");
}

async function listCompanies() {
  return listAllPages("/v2/companies");
}

async function listUsers(companyId) {
  return listAllPages(`/v2/company/${companyId}/users`, { limit: 250 });
}

async function listRoles(companyId) {
  return listAllPages(`/v2/company/${companyId}/roles`, { limit: 250 });
}

/**
 * Published shifts for a UTC window.
 * startGte / startLte should be ISO 8601 UTC strings.
 */
async function listShifts({ companyId, locationId, departmentId, startGte, startLte }) {
  return listAllPages(`/v2/company/${companyId}/shifts`, {
    "start[gte]": startGte,
    "start[lte]": startLte,
    ...(locationId ? { location_id: locationId } : {}),
    ...(departmentId ? { department_id: departmentId } : {})
  });
}

function isShiftLeadRole(role, cfg = config()) {
  if (!role) return false;
  if (cfg.shiftLeadRoleIds.includes(Number(role.id))) return true;
  const name = String(role.name || "").toLowerCase();
  return cfg.shiftLeadRoleNames.some(needle => name.includes(needle));
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

module.exports = {
  isConfigured,
  config,
  sevenFetch,
  whoAmI,
  listCompanies,
  listUsers,
  listRoles,
  listShifts,
  isShiftLeadRole,
  normalizeEmail
};
