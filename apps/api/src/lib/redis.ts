import { Redis } from "ioredis";

export function createRedisClient(redisUrl: string) {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: false
  });
}

/**
 * In-memory Redis stub for environments without Redis.
 * Supports rate limiting (incr/expire/get) and health check (ping).
 * Not suitable for multi-instance deployments — use real Redis there.
 */
export class NullRedis {
  private store = new Map<string, { value: number; expiresAt?: number }>();

  async incr(key: string) {
    const entry = this.store.get(key);
    const now = Date.now();
    if (entry && entry.expiresAt && entry.expiresAt < now) {
      this.store.delete(key);
    }
    const current = this.store.get(key);
    const next = (current?.value ?? 0) + 1;
    this.store.set(key, { value: next, expiresAt: current?.expiresAt });
    return next;
  }

  async expire(key: string, seconds: number) {
    const entry = this.store.get(key);
    if (entry) {
      entry.expiresAt = Date.now() + seconds * 1000;
    }
    return 1;
  }

  async get(key: string) {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.store.delete(key);
      return null;
    }
    return String(entry.value);
  }

  async ping() { return "PONG"; }
  async quit() { return "OK"; }
}
