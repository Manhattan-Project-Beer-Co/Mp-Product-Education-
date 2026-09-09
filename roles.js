/**
 * Staff roles and permissions — keep in sync with Team tab options and site-features.js.
 *
 * Roles:
 * - admin: full access
 * - manager: view everything (team, shift reports, all tabs)
 * - merch: edit merch inventory, ideas, and votes
 * - inventory_admin: edit ops inventory counts/orders
 * - shift_lead: shift reports & digest when scheduled on duty; can update taps (+ extra role on merch staff)
 * - event_lead: private events — all reference tabs, training, briefing, feedback
 * - bartender: floor staff — menus, training, end-of-shift survey
 * - trainee: same floor access as bartender while learning; lands on Training after login
 */

const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  MERCH: "merch",
  INVENTORY_ADMIN: "inventory_admin",
  SHIFT_LEAD: "shift_lead",
  EVENT_LEAD: "event_lead",
  BARTENDER: "bartender",
  TRAINEE: "trainee"
};

const ALL_ROLES = Object.values(ROLES);

const LEGACY_ROLE_MAP = {
  employee: ROLES.BARTENDER
};

const ROLE_LABELS = {
  admin: "Admin",
  manager: "Manager",
  merch: "Merch",
  inventory_admin: "Inventory Admin",
  shift_lead: "Shift Lead",
  event_lead: "Event Lead",
  bartender: "Bartender",
  trainee: "Trainee",
  employee: "Bartender"
};

const FLOOR_STAFF_ROLES = new Set([ROLES.BARTENDER, ROLES.TRAINEE, "employee"]);

function normalizeRole(role) {
  const value = String(role || "").trim();
  return LEGACY_ROLE_MAP[value] || value;
}

function parseExtraRoles(value) {
  if (Array.isArray(value)) return value.map(normalizeRole).filter(Boolean);
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(normalizeRole).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function serializeExtraRoles(roles) {
  const cleaned = [...new Set((roles || []).map(normalizeRole).filter(r => ALL_ROLES.includes(r)))];
  return JSON.stringify(cleaned);
}

function roleLabel(role) {
  return ROLE_LABELS[normalizeRole(role)] || role || "Staff";
}

function hasPrimaryRole(user, role) {
  return normalizeRole(user?.role) === normalizeRole(role);
}

function hasExtraRole(user, role) {
  return parseExtraRoles(user?.extra_roles).includes(normalizeRole(role));
}

function hasRole(user, ...roles) {
  if (!user) return false;
  const wanted = roles.map(normalizeRole);
  const primary = normalizeRole(user.role);
  const extras = parseExtraRoles(user.extra_roles);
  return wanted.some(role => role === primary || extras.includes(role));
}

function hasShiftLeadCapability(user) {
  return hasRole(user, ROLES.ADMIN, ROLES.MANAGER, ROLES.SHIFT_LEAD)
    || hasExtraRole(user, ROLES.SHIFT_LEAD);
}

function canViewAllSite(user) {
  return hasRole(user, ROLES.ADMIN, ROLES.MANAGER, ROLES.EVENT_LEAD);
}

function canManageTeam(user) {
  return hasRole(user, ROLES.ADMIN, ROLES.MANAGER);
}

function canManageApprovedEmails(user) {
  return hasRole(user, ROLES.ADMIN);
}

function canManageMerch(user) {
  return hasRole(user, ROLES.ADMIN, ROLES.MERCH);
}

function canManageOpsInventory(user) {
  return hasRole(user, ROLES.ADMIN, ROLES.INVENTORY_ADMIN);
}

function canViewShiftReports(user, onShiftLeadDuty = false) {
  if (hasRole(user, ROLES.ADMIN, ROLES.MANAGER)) return true;
  if (!onShiftLeadDuty) return false;
  return hasShiftLeadCapability(user);
}

/** Who can change what’s pouring on the live tap wall (writes to Nucleus). */
function canManageTaps(user) {
  return hasShiftLeadCapability(user);
}

/** Who can update weekly food specials / This Week at MP board. */
function canManageWeeklySpecials(user) {
  return hasShiftLeadCapability(user);
}

function canEditSpecials(user) {
  return canManageWeeklySpecials(user);
}

function canEditDrinks(user) {
  return canManageWeeklySpecials(user);
}

function canEditMerch(user) {
  return canManageMerch(user);
}

function canEditInventory(user) {
  return canManageOpsInventory(user);
}

function canEditSOP(user) {
  return canManageSops(user);
}

function canEditBeer(user) {
  return canManageTaps(user);
}

function canEditEvents(user) {
  return hasRole(user, ROLES.ADMIN, ROLES.MANAGER, ROLES.EVENT_LEAD);
}

function canTrainStaff(user) {
  return hasShiftLeadCapability(user);
}

function canSubmitShiftSurvey(user) {
  return hasRole(
    user,
    ROLES.BARTENDER,
    ROLES.TRAINEE,
    ROLES.EVENT_LEAD,
    ROLES.SHIFT_LEAD,
    ROLES.MERCH,
    ROLES.ADMIN,
    ROLES.MANAGER
  );
}

function receivesDailyBriefing(user) {
  return hasRole(user, ROLES.BARTENDER, ROLES.TRAINEE, ROLES.EVENT_LEAD);
}

function isFloorStaffForTraining(user) {
  return FLOOR_STAFF_ROLES.has(normalizeRole(user?.role));
}

function canManageSops(user) {
  return hasRole(user, ROLES.ADMIN);
}

function canManageSiteFeedback(user) {
  return hasRole(user, ROLES.ADMIN, ROLES.MANAGER);
}

function canRefreshReviews(user) {
  return hasRole(user, ROLES.ADMIN);
}

function buildPermissions(user, onShiftLeadDuty = false) {
  return {
    viewAllSite: canViewAllSite(user),
    manageTeam: canManageTeam(user),
    manageApprovedEmails: canManageApprovedEmails(user),
    manageMerch: canManageMerch(user),
    manageOpsInventory: canManageOpsInventory(user),
    manageTaps: canManageTaps(user),
    manageWeeklySpecials: canManageWeeklySpecials(user),
    editSpecials: canEditSpecials(user),
    editDrinks: canEditDrinks(user),
    editMerch: canEditMerch(user),
    editInventory: canEditInventory(user),
    editSop: canEditSOP(user),
    editBeer: canEditBeer(user),
    editEvents: canEditEvents(user),
    trainStaff: canTrainStaff(user),
    viewShiftReports: canViewShiftReports(user, onShiftLeadDuty),
    submitShiftSurvey: canSubmitShiftSurvey(user),
    manageSops: canManageSops(user),
    manageSiteFeedback: canManageSiteFeedback(user),
    refreshReviews: canRefreshReviews(user),
    shiftLeadCapability: hasShiftLeadCapability(user),
    onShiftLeadDuty: Boolean(onShiftLeadDuty)
  };
}

const api = {
  ROLES,
  ALL_ROLES,
  ROLE_LABELS,
  LEGACY_ROLE_MAP,
  normalizeRole,
  parseExtraRoles,
  serializeExtraRoles,
  roleLabel,
  hasRole,
  hasExtraRole,
  hasShiftLeadCapability,
  canViewAllSite,
  canManageTeam,
  canManageApprovedEmails,
  canManageMerch,
  canManageOpsInventory,
  canManageTaps,
  canManageWeeklySpecials,
  canEditSpecials,
  canEditDrinks,
  canEditMerch,
  canEditInventory,
  canEditSOP,
  canEditBeer,
  canEditEvents,
  canTrainStaff,
  canViewShiftReports,
  canSubmitShiftSurvey,
  receivesDailyBriefing,
  isFloorStaffForTraining,
  canManageSops,
  canManageSiteFeedback,
  canRefreshReviews,
  buildPermissions
};

if (typeof module !== "undefined" && module.exports) {
  module.exports = api;
}

if (typeof window !== "undefined") {
  window.StaffRoles = api;
}
