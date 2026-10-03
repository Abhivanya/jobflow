import { app } from "./app";
import { connectDb } from "./config/db";
import { connectRedis } from "./config/redis";
import { env } from "./config/env";
import { startSchedulers } from "./jobs/reminders";
import { requeuePendingResumes } from "./services/resume.service";
import { logger } from "./utils/logger";

async function main() {
  await connectDb();
  await connectRedis();
  await requeuePendingResumes();
  startSchedulers();
  app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, "server listening");
  });
}

main().catch((err) => {
  logger.error({ err }, "server failed to start");
  process.exit(1);
});
