import { buildApp } from "./app.js";
import { env } from "./env.js";

const app = await buildApp();

const shutdown = async () => {
  await app.close();
};

process.on("SIGINT", shutdown);
process.on("SIGTERM", shutdown);

await app.listen({
  host: env.API_HOST,
  port: env.API_PORT
});
