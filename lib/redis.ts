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

/**
 * Fixed-window counter built from GET/SET only (some Upstash tokens are scoped to
 * disallow INCR/EXPIRE). Not atomic — a lightweight best-effort limiter is fine here.
 * The expiry is set only when the window starts and preserved (keepTtl) on every
 * later write, so steady traffic can't keep pushing the window's end forward.
 */
export async function checkRateLimit(key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const client = getClient();
  const current = (await client.get<number>(key)) ?? 0;
  if (current >= limit) return false;
  if (current === 0) {
    await client.set(key, 1, { ex: windowSeconds });
  } else {
    await client.set(key, current + 1, { keepTtl: true });
  }
  return true;
}
