import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  AuthorizationDeniedError,
  assertPermission,
  createAuthenticatedUser,
  permissions
} from "./index.js";

describe("auth policies", () => {
  it("allows agents to use the daily support workflow", () => {
    const user = createAuthenticatedUser({
      id: "user-1",
      email: "agent@example.com",
      name: "Agent",
      organizationSlug: "default-support",
      role: "agent"
    });

    assert.doesNotThrow(() => assertPermission(user, permissions.classifyTickets));
    assert.doesNotThrow(() => assertPermission(user, permissions.useCopilot));
    assert.doesNotThrow(() => assertPermission(user, permissions.viewKnowledge));
  });

  it("keeps audit and metrics restricted to leads and admins", () => {
    const user = createAuthenticatedUser({
      id: "user-1",
      email: "agent@example.com",
      name: "Agent",
      organizationSlug: "default-support",
      role: "agent"
    });

    assert.throws(() => assertPermission(user, permissions.viewAuditLog), AuthorizationDeniedError);
    assert.throws(() => assertPermission(user, permissions.viewMetrics), AuthorizationDeniedError);
  });
});
