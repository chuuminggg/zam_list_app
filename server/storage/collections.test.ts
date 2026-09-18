import { afterEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../shared/data.js';
import { GET, POST, PUT, DELETE } from '../../api/data.js';

/** Upstash REST API를 흉내 내는 메모리 Redis (해시 명령만) */
function fakeUpstash() {
  const hashes = new Map<string, Map<string, string>>();
  const run = ([cmd, key, ...args]: string[]): unknown => {
    const hash = hashes.get(key) ?? new Map<string, string>();
    hashes.set(key, hash);
    switch (cmd) {
      case 'HGETALL':
        return [...hash].flat();
      case 'HLEN':
        return hash.size;
      case 'HMGET':
        return args.map((f) => hash.get(f) ?? null);
      case 'HSET':
        for (let i = 0; i < args.length; i += 2) hash.set(args[i], args[i + 1]);
        return args.length / 2;
      case 'HDEL':
        return args.filter((f) => hash.delete(f)).length;
      case 'DEL':
        return hashes.delete(key) ? 1 : 0;
      default:
        return { error: `unknown ${cmd}` };
    }
  };
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const body = JSON.parse(String(init?.body));
    const path = new URL(String(input)).pathname;
    if (path === '/pipeline' || path === '/multi-exec') {
      return Response.json(body.map((c: string[]) => ({ result: run(c) })));
    }
    return Response.json({ result: run(body) });
  });
  return hashes;
}

const KEY = 'k'.repeat(43);
const todo = (id: string, createdAt: string): Todo => ({
  id,
  title: `할 일 ${id}`,
  done: false,
  priority: 'medium',
  category: '기본',
  createdAt,
});

const METHOD = new Map<unknown, string>([[GET, 'GET'], [POST, 'POST'], [PUT, 'PUT'], [DELETE, 'DELETE']]);

function call(
  handler: (r: Request) => Promise<Response>,
  qs: string,
  { body, key = KEY }: { body?: unknown; key?: string | null } = {},
) {
  const headers: Record<string, string> = key ? { Authorization: `Bearer ${key}` } : {};
  return handler(
    new Request(`http://localhost/api/data?${qs}`, {
      method: METHOD.get(handler),
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 테스트에서 응답 본문을 자유롭게 검사
  ).then(async (res) => ({ status: res.status, json: (await res.json()) as any }));
}

afterEach(() => {
  vi.restoreAllMocks();
  vi.unstubAllEnvs();
});

describe('/api/data', () => {
  const setup = () => {
    vi.stubEnv('KV_REST_API_URL', 'https://redis.test');
    vi.stubEnv('KV_REST_API_TOKEN', 'token');
    return fakeUpstash();
  };

  it('추가·수정·삭제한 항목을 createdAt 순으로 돌려준다', async () => {
    setup();
    const second = todo('b', '2026-09-02T00:00:00Z');
    const first = todo('a', '2026-09-01T00:00:00Z');
    expect((await call(POST, 'collection=todos', { body: { items: [second, first] } })).status).toBe(200);
    await call(POST, 'collection=todos', { body: { items: [{ ...first, done: true }] } });
    await call(DELETE, 'collection=todos&id=b');

    const res = await call(GET, 'collection=todos');
    expect(res.json).toEqual({ ok: true, data: { items: [{ ...first, done: true }] } });
  });

  it('동기화 키별로 데이터가 분리되고 키 원문은 저장하지 않는다', async () => {
    const hashes = setup();
    await call(POST, 'collection=todos', { body: { items: [todo('a', '2026-09-01')] } });
    const other = await call(GET, 'collection=todos', { key: 'o'.repeat(43) });
    expect(other.json.data.items).toEqual([]);
    expect([...hashes.keys()].some((k) => k.includes(KEY))).toBe(false);
  });

  it('PUT은 컬렉션 전체를 교체한다', async () => {
    setup();
    await call(POST, 'collection=wishlist', {
      body: { items: [{ id: 'w1', name: '가방', status: 'want', category: '패션', createdAt: '2026-09-01' }] },
    });
    await call(PUT, 'collection=wishlist', {
      body: {
        items: [
          {
            id: 'w2',
            name: '수납함',
            price: 2000,
            status: 'want',
            category: '생활',
            createdAt: '2026-09-02',
            source: { provider: 'daiso', externalId: '1047618' },
            extra: '무시됨',
          },
        ],
      },
    });
    const res = await call(GET, 'collection=wishlist');
    expect(res.json.data.items).toEqual([
      {
        id: 'w2',
        name: '수납함',
        price: 2000,
        status: 'want',
        category: '생활',
        createdAt: '2026-09-02',
        source: { provider: 'daiso', externalId: '1047618' },
      },
    ]);
  });

  it('카테고리를 저장하고 형식이 틀린 색상은 거부한다', async () => {
    setup();
    const category = { id: 'c1', name: '공부', color: '#3b82f6', order: 0, createdAt: '2026-09-19' };
    expect((await call(POST, 'collection=categories', { body: { items: [category] } })).status).toBe(200);
    expect((await call(GET, 'collection=categories')).json.data.items).toEqual([category]);

    const bad = await call(POST, 'collection=categories', { body: { items: [{ ...category, color: 'red' }] } });
    expect(bad.status).toBe(400);
  });

  it('할 일의 날짜·카테고리 id를 저장하고, 예전 형식 항목도 받는다', async () => {
    setup();
    const current = { ...todo('a', '2026-09-01T00:00:00Z'), date: '2026-09-20', categoryId: 'c1', category: '' };
    const legacy = { id: 'b', title: '예전', done: false, createdAt: '2026-09-02T00:00:00Z' };
    await call(POST, 'collection=todos', { body: { items: [current, legacy] } });
    const res = await call(GET, 'collection=todos');
    expect(res.json.data.items).toEqual([
      current,
      { ...legacy, priority: 'medium', category: '' },
    ]);

    const bad = await call(POST, 'collection=todos', { body: { items: [{ ...current, date: '9/20' }] } });
    expect(bad.status).toBe(400);
  });

  it('키가 없으면 401, 형식이 틀린 항목은 400', async () => {
    setup();
    expect((await call(GET, 'collection=todos', { key: null })).status).toBe(401);
    expect((await call(GET, 'collection=todos', { key: 'short' })).status).toBe(401);
    const bad = await call(POST, 'collection=todos', { body: { items: [{ id: 'a', title: '' }] } });
    expect(bad.status).toBe(400);
    expect((await call(GET, 'collection=nope')).status).toBe(400);
  });

  it('저장소 환경변수가 없으면 NOT_CONFIGURED', async () => {
    vi.stubEnv('KV_REST_API_URL', '');
    vi.stubEnv('UPSTASH_REDIS_REST_URL', '');
    const res = await call(GET, 'collection=todos');
    expect(res.status).toBe(503);
    expect(res.json.error.code).toBe('NOT_CONFIGURED');
  });
});
