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
