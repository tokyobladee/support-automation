import { permissions } from "@support/auth";
import { requirePermission } from "../auth.js";

export async function registerMetricsRoutes(app, options) {
  const metricsRecorder = options.metricsRecorder;
  const authContext = options.authContext;

  app.get("/v1/metrics", async (request, reply) => {
    const user = await requirePermission({
      authContext,
      request,
      reply,
      permission: permissions.viewMetrics
    });

    if (!user) {
      return;
    }

    return {
      data: metricsRecorder.snapshot()
    };
  });
}
