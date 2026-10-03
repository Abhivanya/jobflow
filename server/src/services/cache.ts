import { getRedis } from "../config/redis";

const memory = new Map<string, { value: string; exp: number }>();

function memoryGet(key: string) {
  const hit = memory.get(key);
  if (!hit) return null;
  if (hit.exp < Date.now()) {
    memory.delete(key);
    return null;
  }
  return hit.value;
}

export async function rememberJson<T>(key: string, ttlSeconds: number, load: () => Promise<T>): Promise<T> {
  const cached = memoryGet(key);
  if (cached) return JSON.parse(cached) as T;

  const redis = getRedis();
  if (redis) {
    try {
      const fromRedis = await redis.get(key);
      if (fromRedis) {
        memory.set(key, { value: fromRedis, exp: Date.now() + ttlSeconds * 1000 });
        return JSON.parse(fromRedis) as T;
      }
    } catch {
      // cache miss is not fatal
    }
  }

  const fresh = await load();
  const encoded = JSON.stringify(fresh);
  memory.set(key, { value: encoded, exp: Date.now() + ttlSeconds * 1000 });
  if (redis) {
    try {
      await redis.set(key, encoded, "EX", ttlSeconds);
    } catch {
      // ignore
    }
  }
  return fresh;
}

export async function redisGet(key: string) {
  const redis = getRedis();
  if (!redis) return null;
  try {
    return await redis.get(key);
  } catch {
    return null;
  }
}

export async function redisSet(key: string, value: string, ttlSeconds: number) {
  const redis = getRedis();
  if (!redis) return;
  try {
    await redis.set(key, value, "EX", ttlSeconds);
  } catch {
    // ignore
  }
}

export async function withLock(key: string, ttlSeconds: number, run: () => Promise<void>) {
  const redis = getRedis();
  if (!redis) {
    await run();
    return;
  }
  const locked = await redis.set(key, "1", "EX", ttlSeconds, "NX").catch(() => null);
  if (locked !== "OK") return;
  await run();
}
