import {
  AuthenticationRequiredError,
  AuthorizationDeniedError,
  assertPermission,
  createAuthenticatedUser
} from "@support/auth";

export function createAuthContext({ mode, defaultUser }) {
  return {
    authenticate(request) {
      if (mode === "disabled") {
        return createAuthenticatedUser(defaultUser);
      }

      return authenticateFromHeaders(request.headers);
    }
  };
}

export async function requirePermission({ authContext, request, reply, permission }) {
  try {
    const user = authContext.authenticate(request);
    assertPermission(user, permission);

    return user;
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      reply.code(401).send({
        error: {
          code: "AUTHENTICATION_REQUIRED",
          message: "Authentication is required"
        }
      });

      return undefined;
    }

    if (error instanceof AuthorizationDeniedError) {
      reply.code(403).send({
        error: {
          code: "AUTHORIZATION_DENIED",
          message: "You do not have permission to perform this action"
        }
      });

      return undefined;
    }

    throw error;
  }
}

function authenticateFromHeaders(headers) {
  const role = readHeader(headers, "x-support-role");
  const email = readHeader(headers, "x-support-user-email");

  if (!role || !email) {
    throw new AuthenticationRequiredError();
  }

  return createAuthenticatedUser({
    id: readHeader(headers, "x-support-user-id") ?? email,
    email,
    name: readHeader(headers, "x-support-user-name") ?? email,
    organizationSlug: readHeader(headers, "x-support-organization") ?? "default-support",
    role
  });
}

function readHeader(headers, name) {
  const value = headers[name];

  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
}
