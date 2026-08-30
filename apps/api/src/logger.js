const sensitiveHeaderNames = Object.freeze([
  "authorization",
  "cookie",
  "set-cookie",
  "x-api-key",
  "x-support-user-email",
  "x-support-user-id",
  "x-support-user-name"
]);

export function createLoggerOptions() {
  return {
    redact: {
      paths: [
        "req.headers.authorization",
        "req.headers.cookie",
        "req.headers.set-cookie",
        "req.headers.x-api-key",
        "req.headers.x-support-user-email",
        "req.headers.x-support-user-id",
        "req.headers.x-support-user-name",
        "headers.authorization",
        "headers.cookie",
        "headers.set-cookie",
        "headers.x-api-key",
        "headers.x-support-user-email",
        "headers.x-support-user-id",
        "headers.x-support-user-name",
        "OPENAI_API_KEY",
        "ANTHROPIC_API_KEY",
        "DATABASE_URL",
        "REDIS_URL"
      ],
      censor: "[REDACTED]"
    },
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          host: request.host,
          remoteAddress: request.remoteAddress,
          headers: redactHeaders(request.headers)
        };
      }
    }
  };
}

export function redactHeaders(headers = {}) {
  return Object.fromEntries(
    Object.entries(headers).map(([key, value]) => [
      key,
      sensitiveHeaderNames.includes(key.toLowerCase()) ? "[REDACTED]" : value
    ])
  );
}
