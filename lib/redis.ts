import { Redis } from "@upstash/redis";

let redis: Redis | null = null;

function getRedis(): Redis {
  if (!redis) {
    redis = Redis.fromEnv();
  }
  return redis;
}

// --- Generic sorted set helpers ---

export async function sortedSetAdd(
  key: string,
  score: number,
  member: string
): Promise<void> {
  await getRedis().zadd(key, { score, member });
}

export async function sortedSetRemove(
  key: string,
  member: string
): Promise<void> {
  await getRedis().zrem(key, member);
}

export async function sortedSetTopK(
  key: string,
  k: number
): Promise<{ member: string; score: number }[]> {
  const results = await getRedis().zrange<string[]>(key, 0, k - 1, {
    rev: true,
    withScores: true,
  });

  // Upstash returns a flat array: [member1, score1, member2, score2, ...]
  const entries: { member: string; score: number }[] = [];
  for (let i = 0; i < results.length; i += 2) {
    entries.push({
      member: String(results[i]),
      score: Number(results[i + 1]),
    });
  }
  return entries;
}

export async function sortedSetSize(key: string): Promise<number> {
  return await getRedis().zcard(key);
}

export async function keyExists(key: string): Promise<boolean> {
  const result = await getRedis().exists(key);
  return result === 1;
}

export async function setKeyExpiry(
  key: string,
  seconds: number
): Promise<void> {
  await getRedis().expire(key, seconds);
}

// --- Hash helpers ---

export async function hashSet(
  key: string,
  field: string,
  value: string
): Promise<void> {
  await getRedis().hset(key, { [field]: value });
}

export async function hashGetMultiple(
  key: string,
  fields: string[]
): Promise<(string | null)[]> {
  if (fields.length === 0) return [];
  return (await getRedis().hmget<(string | null)[]>(key, ...fields)) ?? [];
}

export async function hashDel(key: string, field: string): Promise<void> {
  await getRedis().hdel(key, field);
}
