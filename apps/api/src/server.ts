import { buildApp } from "./app.js";

async function start() {
  const app = await buildApp();

  try {
    await app.listen({
      host: app.config.API_HOST,
      port: app.config.API_PORT
    });
    app.log.info(`Governor API listening on ${app.config.API_HOST}:${app.config.API_PORT}`);
  } catch (error) {
    app.log.error(error, "Failed to start API server");
    process.exit(1);
  }

  const shutdown = async () => {
    await app.close();
    process.exit(0);
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

start();
