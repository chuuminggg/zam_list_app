import { getRedisConfig, Redis } from './redis.js';

let client: { url: string; redis: Redis } | null = null;

function getRedis(env: NodeJS.ProcessEnv): Redis | null {
  const config = getRedisConfig(env);
  if (!config) return null;
  if (client?.url !== config.url) client = { url: config.url, redis: new Redis(config) };
  return client.redis;
}

/**
 * Redis에 ttlSeconds 동안 결과를 캐시한다. Redis가 없거나 실패하면 캐시 없이 load()를 그대로 쓴다.
 * 실패한 load()는 캐시하지 않는다.
 */
export async function cached<T>(
  key: string,
  ttlSeconds: number,
  load: () => Promise<T>,
  env: NodeJS.ProcessEnv = process.env,
): Promise<T> {
  const redis = getRedis(env);
  if (!redis) return load();

  const fullKey = `zam:cache:v1:${key}`;
  try {
    const hit = await redis.exec<string | null>(['GET', fullKey]);
    if (hit !== null) return JSON.parse(hit) as T;
  } catch (error) {
    console.warn('[cache] 읽기 실패', error);
  }

  const value = await load();
  try {
    await redis.exec(['SET', fullKey, JSON.stringify(value), 'EX', ttlSeconds]);
  } catch (error) {
    console.warn('[cache] 쓰기 실패', error);
  }
  return value;
}
