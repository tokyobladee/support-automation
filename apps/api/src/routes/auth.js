export async function registerAuthRoutes(app, options) {
  const authContext = options.authContext;

  app.get("/v1/auth/session", async (request) => ({
    data: authContext.authenticate(request)
  }));
}
