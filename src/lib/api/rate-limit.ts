import { Redis } from "@upstash/redis";
import { hasUpstashRedis, getUpstashRedisToken, getUpstashRedisUrl } from "./env";
import { rateLimitPerHour } from "./tier-policy";

let redisSingleton: Redis | null = null;

function getRedis(): Redis | null {
  if (!hasUpstashRedis()) {
    return null;
  }
  if (!redisSingleton) {
    redisSingleton = new Redis({
      url: getUpstashRedisUrl(),
      token: getUpstashRedisToken(),
    });
  }
  return redisSingleton;
}

/**
 * Fixed window per UTC hour. Returns { allowed: false, remaining: 0 } when over limit.
 */
export async function checkRateLimit(
  keyId: string,
  tier: string
): Promise<{ allowed: boolean; remaining: number; limit: number }> {
  const limit = rateLimitPerHour(tier);
  const redis = getRedis();
  if (!redis) {
    return { allowed: true, remaining: limit, limit };
  }

  const now = new Date();
  const bucket = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-${String(now.getUTCDate()).padStart(2, "0")}-${String(now.getUTCHours()).padStart(2, "0")}`;
  const rk = `mazra:api:rl:${keyId}:${bucket}`;

  const count = await redis.incr(rk);
  if (count === 1) {
    await redis.expire(rk, 7200);
  }

  const remaining = Math.max(0, limit - count);
  if (count > limit) {
    return { allowed: false, remaining: 0, limit };
  }
  return { allowed: true, remaining, limit };
}
