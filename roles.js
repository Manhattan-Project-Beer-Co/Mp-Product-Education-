/**
 * Staff roles and permissions — keep in sync with Team tab options and site-features.js.
 *
 * A person can hold several roles at once (primary + extra_roles).
 * Today's Floor assignment is separate from these account roles.
 */

const ROLES = {
  ADMIN: "admin",
  MANAGER: "manager",
  HEAD_CHEF: "head_chef",
  MERCH: "merch",
  INVENTORY_ADMIN: "inventory_admin",
  SHIFT_LEAD: "shift_lead",
  EVENT_LEAD: "event_lead",
  TRAINER: "trainer",
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
  head_chef: "Head Chef",
  merch: "Merch",
  inventory_admin: "Inventory",
  shift_lead: "Shift Lead",
  event_lead: "Event Lead",
  trainer: "Trainer",
  bartender: "Employee / Bartender",
  trainee: "Trainee",
  employee: "Employee / Bartender"
};

const PRIMARY_ROLE_PRIORITY = [
  ROLES.TRAINEE,
  ROLES.ADMIN,
  ROLES.MANAGER,
  ROLES.HEAD_CHEF,
  ROLES.SHIFT_LEAD,
  ROLES.EVENT_LEAD,
  ROLES.TRAINER,
  ROLES.INVENTORY_ADMIN,
  ROLES.MERCH,
  ROLES.BARTENDER
];

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
  const cleaned = [...new Set((roles || []).map(normalizeRole).filter((r) => ALL_ROLES.includes(r)))];
  return JSON.stringify(cleaned);
}

function allAssignedRoles(user) {
  if (!user) return [];
  return [...new Set([
    normalizeRole(user.role),
    ...parseExtraRoles(user.extra_roles)
  ].filter((role) => ALL_ROLES.includes(role) || role === "employee"))];
}

function splitAssignedRoles(roles) {
  const unique = [...new Set((roles || []).map(normalizeRole).filter((r) => ALL_ROLES.includes(r)))];
  if (!unique.length) return { role: ROLES.BARTENDER, extra_roles: [] };
  const role = PRIMARY_ROLE_PRIORITY.find((r) => unique.includes(r)) || unique[0];
  return { role, extra_roles: unique.filter((r) => r !== role) };
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
  const assigned = allAssignedRoles(user);
  return wanted.some((role) => assigned.includes(role) || (role === ROLES.BARTENDER && assigned.includes("employee")));
}

function hasShiftLeadCapability(user) {
  return hasRole(user, ROLES.ADMIN, ROLES.MANAGER, ROLES.SHIFT_LEAD);
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

function canManageTaps(user) {
  return hasShiftLeadCapability(user);
}

function canManageWeeklySpecials(user) {
  return hasShiftLeadCapability(user) || hasRole(user, ROLES.HEAD_CHEF);
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

function canEditEventFood(user) {
  return canEditEvents(user) || hasRole(user, ROLES.HEAD_CHEF);
}

function canTrainStaff(user) {
  return hasRole(user, ROLES.ADMIN, ROLES.MANAGER, ROLES.SHIFT_LEAD, ROLES.TRAINER);
}

function canSubmitShiftSurvey(user) {
  return hasRole(
    user,
    ROLES.BARTENDER,
    ROLES.TRAINEE,
    ROLES.TRAINER,
    ROLES.EVENT_LEAD,
    ROLES.SHIFT_LEAD,
    ROLES.HEAD_CHEF,
    ROLES.MERCH,
    ROLES.ADMIN,
    ROLES.MANAGER
  );
}

function receivesDailyBriefing(user) {
  return hasRole(user, ROLES.BARTENDER, ROLES.TRAINEE, ROLES.TRAINER, ROLES.EVENT_LEAD, ROLES.HEAD_CHEF);
}

function isFloorStaffForTraining(user) {
  return hasRole(user, ROLES.BARTENDER, ROLES.TRAINEE);
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
    editEventFood: canEditEventFood(user),
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
  PRIMARY_ROLE_PRIORITY,
  normalizeRole,
  parseExtraRoles,
  serializeExtraRoles,
  allAssignedRoles,
  splitAssignedRoles,
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
  canEditEventFood,
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
