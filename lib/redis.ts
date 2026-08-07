import { Redis } from "@upstash/redis";

let client: Redis | null = null;

function getClient(): Redis {
  if (!client) {
    client = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  }
  return client;
}

export async function redisGet<T>(key: string): Promise<T | null> {
  return getClient().get<T>(key);
}

export async function redisSet(key: string, value: unknown): Promise<void> {
  await getClient().set(key, value);
}

export function redisConfigured(): boolean {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

/** Fixed-window counter. Returns true if the caller is still within `limit` requests per `windowSeconds`. */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const count = await getClient().incr(key);
  if (count === 1) {
    await getClient().expire(key, windowSeconds);
  }
  return count <= limit;
}
