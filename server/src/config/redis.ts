import Redis from "ioredis";
import { env } from "./env";
import { logger } from "../utils/logger";

let client: Redis | null = null;
let ready = false;
let givenUp = false;

function attach(redis: Redis) {
  redis.on("error", (err: Error) => {
    if (!givenUp) logger.warn({ err }, "redis error");
  });
  return redis;
}

export async function connectRedis() {
  if (!env.REDIS_URL || givenUp) return;
  try {
    const redis = attach(
      new Redis(env.REDIS_URL, {
        lazyConnect: true,
        maxRetriesPerRequest: 1,
        enableOfflineQueue: false,
        connectTimeout: 2000,
      }),
    );
    await redis.connect();
    await redis.ping();
    client = redis;
    ready = true;
    logger.info("redis connected");
  } catch (err) {
    givenUp = true;
    ready = false;
    client = null;
    logger.warn({ err }, "redis unavailable, continuing without it");
  }
}

export function getRedis() {
  if (!ready || !client) return null;
  return client;
}

export async function closeRedis() {
  if (!client) return;
  await client.quit().catch(() => undefined);
  client = null;
  ready = false;
}
