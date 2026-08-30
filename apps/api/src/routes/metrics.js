export async function registerMetricsRoutes(app, options) {
  const metricsRecorder = options.metricsRecorder;

  app.get("/v1/metrics", async () => ({
    data: metricsRecorder.snapshot()
  }));
}
