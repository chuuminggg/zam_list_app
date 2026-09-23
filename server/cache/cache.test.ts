import { afterEach, describe, expect, it, vi } from 'vitest';
import { cached } from './cache.js';

/** Upstash REST API를 흉내 내는 메모리 Redis (GET/SET만) */
function fakeUpstash() {
  const store = new Map<string, string>();
  const commands: unknown[][] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (_input, init) => {
    const [cmd, key, value] = JSON.parse(String(init?.body)) as string[];
    commands.push([cmd, key, value]);
    if (cmd === 'GET') return Response.json({ result: store.get(key) ?? null });
    store.set(key, value);
    return Response.json({ result: 'OK' });
  });
  return commands;
}

const env = { KV_REST_API_URL: 'https://redis.test', KV_REST_API_TOKEN: 't' } as NodeJS.ProcessEnv;

afterEach(() => vi.restoreAllMocks());

describe('cached', () => {
  it('처음엔 load 결과를 저장하고, 다음엔 캐시에서 돌려준다', async () => {
    const commands = fakeUpstash();
    const load = vi.fn(async () => ({ stores: [1] }));
    expect(await cached('stock:a', 300, load, env)).toEqual({ stores: [1] });
    expect(await cached('stock:a', 300, load, env)).toEqual({ stores: [1] });
    expect(load).toHaveBeenCalledTimes(1);
    expect(commands).toContainEqual(['SET', 'zam:cache:v1:stock:a', JSON.stringify({ stores: [1] })]);
  });

  it('Redis가 없거나 실패하면 캐시 없이 load를 쓰고, load 실패는 저장하지 않는다', async () => {
    const load = vi.fn(async () => 'fresh');
    expect(await cached('k', 60, load, {} as NodeJS.ProcessEnv)).toBe('fresh');

    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('down'));
    vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await cached('k', 60, load, env)).toBe('fresh');

    const commands = fakeUpstash();
    const failing = vi.fn(async () => {
      throw new Error('upstream');
    });
    await expect(cached('k2', 60, failing, env)).rejects.toThrow('upstream');
    expect(commands.filter(([cmd]) => cmd === 'SET')).toEqual([]);
  });
});
