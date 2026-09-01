export const userRoles = Object.freeze({
  agent: "agent",
  lead: "lead",
  admin: "admin"
});

export const permissions = Object.freeze({
  classifyTickets: "classify_tickets",
  useCopilot: "use_copilot",
  submitFeedback: "submit_feedback",
  viewKnowledge: "view_knowledge",
  viewAuditLog: "view_audit_log",
  viewMetrics: "view_metrics"
});

const rolePermissions = Object.freeze({
  [userRoles.agent]: Object.freeze([
    permissions.classifyTickets,
    permissions.useCopilot,
    permissions.submitFeedback,
    permissions.viewKnowledge
  ]),
  [userRoles.lead]: Object.freeze([
    permissions.classifyTickets,
    permissions.useCopilot,
    permissions.submitFeedback,
    permissions.viewKnowledge,
    permissions.viewAuditLog,
    permissions.viewMetrics
  ]),
  [userRoles.admin]: Object.freeze(Object.values(permissions))
});

export class AuthenticationRequiredError extends Error {
  constructor() {
    super("Authentication is required");
    this.name = "AuthenticationRequiredError";
  }
}

export class AuthorizationDeniedError extends Error {
  constructor(permission) {
    super(`Missing permission: ${permission}`);
    this.name = "AuthorizationDeniedError";
    this.permission = permission;
  }
}

export function createAuthenticatedUser(input) {
  const role = normalizeRole(input.role);

  return {
    id: input.id,
    email: input.email,
    name: input.name,
    organizationSlug: input.organizationSlug,
    role,
    permissions: rolePermissions[role]
  };
}

export function assertAuthenticated(user) {
  if (!user) {
    throw new AuthenticationRequiredError();
  }
}

export function assertPermission(user, permission) {
  assertAuthenticated(user);

  if (!user.permissions.includes(permission)) {
    throw new AuthorizationDeniedError(permission);
  }
}

export function hasPermission(user, permission) {
  return Boolean(user?.permissions?.includes(permission));
}

function normalizeRole(role) {
  if (!Object.values(userRoles).includes(role)) {
    throw new Error(`Unsupported user role: ${role}`);
  }

  return role;
}
