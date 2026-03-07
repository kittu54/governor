import Redis from "ioredis";

export function createRedisClient(redisUrl: string) {
  return new Redis(redisUrl, {
    maxRetriesPerRequest: 3,
    lazyConnect: false
  });
}
