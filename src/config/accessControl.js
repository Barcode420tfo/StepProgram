export const ROLES = Object.freeze({
  ADMIN: 'admin',
  GROWTH_PARTNER: 'growth_partner',
  SUPERVISOR: 'supervisor',
  SALES_AGENT: 'sales_agent',
  UNASSIGNED: 'unassigned',
});

export const ROLE_LABELS = Object.freeze({
  [ROLES.ADMIN]: 'Administrator',
  [ROLES.GROWTH_PARTNER]: 'Growth Partner',
  [ROLES.SUPERVISOR]: 'Supervisor',
  [ROLES.SALES_AGENT]: 'Sales Agent',
  [ROLES.UNASSIGNED]: 'Access pending',
});

export const ROLE_PERMISSIONS = Object.freeze({
  [ROLES.ADMIN]: [
    'performance:view_all',
    'users:manage',
    'assignments:manage',
    'targets:manage',
    'attendance:review',
    'reports:export',
    'audit:view',
  ],
  [ROLES.GROWTH_PARTNER]: [
    'territory:view_assigned',
    'agents:view_assigned',
    'attendance:view_assigned',
    'performance:view_assigned',
    'acquisitions:view_assigned',
    'reports:view_assigned',
    'exceptions:recommend',
  ],
  [ROLES.SUPERVISOR]: [
    'territory:view_assigned',
    'agents:view_assigned',
    'attendance:view_assigned',
    'performance:view_assigned',
    'reports:view_assigned',
    'exceptions:recommend',
  ],
  [ROLES.SALES_AGENT]: [
    'profile:view_self',
    'stores:view_assigned',
    'attendance:record_self',
    'engagements:record_self',
    'sales:record_self',
    'performance:view_self',
  ],
  [ROLES.UNASSIGNED]: [],
});

// Bootstrap identities for the first production rollout. Firebase UID is the
// immutable account key; email is retained only as an Admin-facing reference.
// These entries should move to the server-managed user directory when the
// Admin user-management API is introduced.
export const BOOTSTRAP_USERS = Object.freeze({
  FjkbTH9hYQaaqrY1gmDI2Rdmx302: Object.freeze({
    email: 'olajide@sapphirevirtual.com',
    role: ROLES.ADMIN,
    profileName: 'Olajide',
  }),
  vJMImsYZeWThRPQmERfnFct0FVL2: Object.freeze({
    email: 'liltomsky@gmail.com',
    role: ROLES.ADMIN,
    profileName: 'Main Admin',
  }),
  ZJviPrASfzPg95CauDo3ORGlVSt1: Object.freeze({
    email: 'towobolaadefowokan@gmail.com',
    role: ROLES.GROWTH_PARTNER,
    profileName: 'Towobola',
  }),
  D5SAcx8YS9PpfQQ3p0NsWwBK2Ar1: Object.freeze({
    email: 'ejiogu.peace@sapphirevirtual.com',
    role: ROLES.SALES_AGENT,
    profileName: 'Peace',
  }),
});

export const EXECUTIVE_WORKSPACE_UIDS = Object.freeze([
  'FjkbTH9hYQaaqrY1gmDI2Rdmx302',
  'vJMImsYZeWThRPQmERfnFct0FVL2',
]);

export function canViewExecutiveWorkspace(uid) {
  return EXECUTIVE_WORKSPACE_UIDS.includes(String(uid || ''));
}

export function getBootstrapIdentity(uid) {
  return BOOTSTRAP_USERS[String(uid || '')] || null;
}

export const SUPERVISOR_PORTFOLIOS = Object.freeze([
  { name: 'Jessica', territory: 'Computer Village', agent: 'Peace', stores: 34 },
  { name: 'Towobola', territory: 'Computer Village', agent: 'Queen', stores: 35 },
  { name: 'Chile Nwaiwu', territory: 'Lawanson Phone Village', agent: 'Ifeoma', stores: 69 },
  { name: 'Mohammed', territory: 'UNILAG / Akoka', agent: null, stores: 30 },
  { name: 'Sarah', territory: 'Sango', agent: null, stores: 29 },
  { name: 'Esther', territory: 'Ikorodu', agent: null, stores: 18 },
]);

export const CLUSTER_SUPERVISOR_PORTFOLIOS = Object.freeze([
  { name: 'Babatunde', territory: 'Saka Tinubu', agent: null, stores: 0 },
]);

export const SALES_AGENT_PORTFOLIOS = Object.freeze([
  { name: 'Peace', territory: 'Pending reassignment', supervisor: 'Jessica', stores: 0 },
  { name: 'Queen', territory: 'Pending reassignment', supervisor: 'Towobola', stores: 0 },
  { name: 'Ifeoma', territory: 'Pending reassignment', supervisor: 'Chile Nwaiwu', stores: 0 },
]);

export function normalizeRole(value) {
  const role = String(value || '').trim().toLowerCase().replace(/[ -]+/g, '_');
  if (role === 'supervisor' || role === 'territory_supervisor') return ROLES.SUPERVISOR;
  if (role === 'growth_partner') return ROLES.GROWTH_PARTNER;
  if (role === 'agent' || role === 'sales_agent') return ROLES.SALES_AGENT;
  if (role === 'admin' || role === 'administrator' || role === 'operations_admin' || role === 'system_admin') {
    return ROLES.ADMIN;
  }
  return ROLES.UNASSIGNED;
}

export function getPortfolioForUser(role, user, claims = {}) {
  const claimedName = claims.agent_name || claims.profile_name || claims.name;
  const displayName = claimedName || user?.displayName || '';
  const list = role === ROLES.GROWTH_PARTNER ? SUPERVISOR_PORTFOLIOS : role === ROLES.SUPERVISOR ? CLUSTER_SUPERVISOR_PORTFOLIOS : SALES_AGENT_PORTFOLIOS;
  const match = list.find((item) => item.name.toLowerCase() === String(displayName).trim().toLowerCase());
  if (match) return match;

  // Sample portfolios are used only by the local role preview. Production
  // accounts without an exact server-issued scope receive no portfolio.
  if (import.meta.env.DEV && role === ROLES.GROWTH_PARTNER) return SUPERVISOR_PORTFOLIOS[0];
  if (import.meta.env.DEV && role === ROLES.SUPERVISOR) return CLUSTER_SUPERVISOR_PORTFOLIOS[0];
  if (import.meta.env.DEV && role === ROLES.SALES_AGENT) return SALES_AGENT_PORTFOLIOS[0];
  return null;
}
