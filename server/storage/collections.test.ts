import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../shared/data.js';
import * as auth from '../../api/auth.js';
import { GET, POST, PUT, DELETE } from '../../api/data.js';
import { ensureSchema } from './db.js';
import { createTestDb } from './testDb.js';

let db: ReturnType<typeof createTestDb> | null = null;

// 테스트에서는 Neon 대신 메모리 Postgres(PGlite)를 쓴다. db가 null이면 원래 동작(환경변수 확인).
vi.mock('./db.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db.js')>();
  return {
    ...actual,
    requireDb: async (env: NodeJS.ProcessEnv = process.env) => (db ? actual.ensureSchema(db) : actual.requireDb(env)),
  };
});

const todo = (id: string, createdAt: string): Todo => ({
  id,
  title: `할 일 ${id}`,
  done: false,
  priority: 'medium',
  category: '기본',
  createdAt,
});

const METHOD = new Map<unknown, string>([
  [GET, 'GET'],
  [POST, 'POST'],
  [PUT, 'PUT'],
  [DELETE, 'DELETE'],
  [auth.GET, 'GET'],
  [auth.POST, 'POST'],
  [auth.DELETE, 'DELETE'],
]);

function call(
  handler: (r: Request) => Promise<Response>,
  path: string,
  { body, token }: { body?: unknown; token?: string } = {},
) {
  const headers: Record<string, string> = token ? { Authorization: `Bearer ${token}` } : {};
  return handler(
    new Request(`http://localhost/api/${path}`, {
      method: METHOD.get(handler),
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
    }),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any -- 테스트에서 응답 본문을 자유롭게 검사
  ).then(async (res) => ({ status: res.status, json: (await res.json()) as any }));
}

async function login(username = 'zam', password = '1234'): Promise<string> {
  const res = await call(auth.POST, 'auth', { body: { username, password, create: true } });
  expect(res.status).toBe(200);
  return res.json.data.token;
}

beforeEach(async () => {
  db = createTestDb();
  await ensureSchema(db);
});

afterEach(async () => {
  await db?.pg.close();
  db = null;
  vi.unstubAllEnvs();
});

describe('/api/auth', () => {
  it('없는 아이디는 확인 전까지 계정을 만들지 않는다', async () => {
    const asked = await call(auth.POST, 'auth', { body: { username: 'zam', password: '1234' } });
    expect(asked.json.data).toEqual({ status: 'new', username: 'zam' });
    expect(await db!.query('SELECT username FROM users')).toEqual([]);
  });

  it('확인하면 계정을 만들고, 같은 비밀번호로 다시 로그인된다', async () => {
    const first = await call(auth.POST, 'auth', { body: { username: 'Zam', password: '1234', create: true } });
    expect(first.json.data).toMatchObject({ status: 'signedIn', created: true, user: { username: 'zam' } });

    const again = await call(auth.POST, 'auth', { body: { username: 'zam', password: '1234' } });
    expect(again.json.data).toMatchObject({ created: false, user: { id: first.json.data.user.id } });

    const me = await call(auth.GET, 'auth', { token: again.json.data.token });
    expect(me.json.data.user).toEqual(first.json.data.user);
  });

  it('비밀번호가 틀리면 401, 형식이 틀리면 400', async () => {
    await login('zam', '1234');
    expect((await call(auth.POST, 'auth', { body: { username: 'zam', password: '9999' } })).status).toBe(401);
    expect((await call(auth.POST, 'auth', { body: { username: 'z', password: '1234' } })).status).toBe(400);
    expect((await call(auth.POST, 'auth', { body: { username: 'zam', password: '12' } })).status).toBe(400);
  });

  it('비밀번호와 세션 토큰 원문은 저장하지 않는다', async () => {
    const token = await login('zam', 'secret-pw');
    const dump = JSON.stringify([
      ...(await db!.query('SELECT * FROM users')),
      ...(await db!.query('SELECT * FROM sessions')),
    ]);
    expect(dump).not.toContain('secret-pw');
    expect(dump).not.toContain(token);
  });

  it('로그아웃하면 그 토큰은 더 쓸 수 없다', async () => {
    const token = await login();
    await call(auth.DELETE, 'auth', { token });
    expect((await call(auth.GET, 'auth', { token })).status).toBe(401);
  });
});

describe('/api/data', () => {
  it('추가·수정·삭제한 항목을 createdAt 순으로 돌려준다', async () => {
    const token = await login();
    const second = todo('b', '2026-09-02T00:00:00Z');
    const first = todo('a', '2026-09-01T00:00:00Z');
    expect((await call(POST, 'data?collection=todos', { token, body: { items: [second, first] } })).status).toBe(200);
    await call(POST, 'data?collection=todos', { token, body: { items: [{ ...first, done: true }] } });
    await call(DELETE, 'data?collection=todos&id=b', { token });

    const res = await call(GET, 'data?collection=todos', { token });
    expect(res.json).toEqual({ ok: true, data: { items: [{ ...first, done: true }] } });
  });

  it('사용자별로 데이터가 나뉘고, 같은 계정이면 다른 기기에서도 같은 데이터를 본다', async () => {
    const mine = await login('zam', '1234');
    await call(POST, 'data?collection=todos', { token: mine, body: { items: [todo('a', '2026-09-01')] } });

    const other = await login('other', '1234');
    expect((await call(GET, 'data?collection=todos', { token: other })).json.data.items).toEqual([]);

    const otherDevice = await login('zam', '1234');
    expect((await call(GET, 'data?collection=todos', { token: otherDevice })).json.data.items).toHaveLength(1);
  });

  it('재조회로 생긴 가격 이력·품절 정보를 저장한다', async () => {
    const token = await login();
    await call(POST, 'data?collection=wishlist', {
      token,
      body: {
        items: [
          {
            id: 'w9',
            name: '우유',
            price: 4000,
            status: 'want',
            category: '마켓컬리',
            createdAt: '2026-09-01',
            soldOut: true,
            lastCheckedAt: '2026-09-24T06:00:00.000Z',
            priceHistory: [
              { at: '2026-09-01', price: 5000 },
              { at: '2026-09-24T06:00:00.000Z', price: 4000 },
            ],
          },
        ],
      },
    });

    const [saved] = (await call(GET, 'data?collection=wishlist', { token })).json.data.items;
    expect(saved).toMatchObject({
      price: 4000,
      soldOut: true,
      lastCheckedAt: '2026-09-24T06:00:00.000Z',
      priceHistory: [
        { at: '2026-09-01', price: 5000 },
        { at: '2026-09-24T06:00:00.000Z', price: 4000 },
      ],
    });
  });

  it('가격 이력 형식이 틀리면 거부한다', async () => {
    const token = await login();
    const res = await call(POST, 'data?collection=wishlist', {
      token,
      body: {
        items: [
          {
            id: 'w10',
            name: '우유',
            status: 'want',
            category: '마켓컬리',
            createdAt: '2026-09-01',
            priceHistory: [{ at: '2026-09-01', price: -1 }],
          },
        ],
      },
    });

    expect(res.json.error.code).toBe('BAD_REQUEST');
  });

  it('PUT은 컬렉션 전체를 교체한다', async () => {
    const token = await login();
    await call(POST, 'data?collection=wishlist', {
      token,
      body: { items: [{ id: 'w1', name: '가방', status: 'want', category: '패션', createdAt: '2026-09-01' }] },
    });
    await call(PUT, 'data?collection=wishlist', {
      token,
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
    const res = await call(GET, 'data?collection=wishlist', { token });
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
    const token = await login();
    const category = { id: 'c1', name: '공부', color: '#3b82f6', order: 0, createdAt: '2026-09-19' };
    expect((await call(POST, 'data?collection=categories', { token, body: { items: [category] } })).status).toBe(200);
    expect((await call(GET, 'data?collection=categories', { token })).json.data.items).toEqual([category]);

    const bad = await call(POST, 'data?collection=categories', {
      token,
      body: { items: [{ ...category, color: 'red' }] },
    });
    expect(bad.status).toBe(400);
  });

  it('할 일의 날짜·카테고리 id를 저장하고, 예전 형식 항목도 받는다', async () => {
    const token = await login();
    const current = { ...todo('a', '2026-09-01T00:00:00Z'), date: '2026-09-20', categoryId: 'c1', category: '' };
    const legacy = { id: 'b', title: '예전', done: false, createdAt: '2026-09-02T00:00:00Z' };
    await call(POST, 'data?collection=todos', { token, body: { items: [current, legacy] } });
    const res = await call(GET, 'data?collection=todos', { token });
    expect(res.json.data.items).toEqual([current, { ...legacy, priority: 'medium', category: '' }]);

    const bad = await call(POST, 'data?collection=todos', { token, body: { items: [{ ...current, date: '9/20' }] } });
    expect(bad.status).toBe(400);
  });

  it('로그인하지 않으면 401, 형식이 틀린 항목은 400', async () => {
    const token = await login();
    expect((await call(GET, 'data?collection=todos')).status).toBe(401);
    expect((await call(GET, 'data?collection=todos', { token: 'nope' })).status).toBe(401);
    const bad = await call(POST, 'data?collection=todos', { token, body: { items: [{ id: 'a', title: '' }] } });
    expect(bad.status).toBe(400);
    expect((await call(GET, 'data?collection=nope', { token })).status).toBe(400);
  });

  it('데이터베이스 환경변수가 없으면 NOT_CONFIGURED', async () => {
    await db?.pg.close();
    db = null;
    vi.stubEnv('DATABASE_URL', '');
    vi.stubEnv('POSTGRES_URL', '');
    const res = await call(GET, 'data?collection=todos', { token: 'x' });
    expect(res.status).toBe(503);
    expect(res.json.error.code).toBe('NOT_CONFIGURED');
  });
});

describe('/api/data 가계부', () => {
  const transaction = {
    id: 't1',
    type: 'expense',
    amount: 12000,
    category: 'food',
    date: '2026-09-24',
    memo: '점심',
    createdAt: '2026-09-24T03:00:00Z',
  };
  const fixed = {
    id: 'f1',
    type: 'income',
    name: '월급',
    amount: 3000000,
    category: 'salary',
    day: 25,
    startMonth: '2026-01',
    createdAt: '2026-09-01T00:00:00Z',
  };

  it('내역과 고정 항목을 저장하고 그대로 돌려준다', async () => {
    const token = await login();
    await call(POST, 'data?collection=transactions', { token, body: { items: [transaction] } });
    await call(POST, 'data?collection=fixedItems', { token, body: { items: [fixed] } });

    expect((await call(GET, 'data?collection=transactions', { token })).json.data.items).toEqual([transaction]);
    expect((await call(GET, 'data?collection=fixedItems', { token })).json.data.items).toEqual([fixed]);
  });

  it('금액·날짜·고정 날짜가 올바르지 않으면 400', async () => {
    const token = await login();
    const bad = [
      ['transactions', { ...transaction, amount: -1 }],
      ['transactions', { ...transaction, amount: 10.5 }],
      ['transactions', { ...transaction, date: '2026-9-24' }],
      ['fixedItems', { ...fixed, day: 32 }],
      ['fixedItems', { ...fixed, endMonth: '2025-12' }],
    ] as const;
    for (const [collection, item] of bad) {
      const res = await call(POST, `data?collection=${collection}`, { token, body: { items: [item] } });
      expect(res.status, JSON.stringify(item)).toBe(400);
    }
  });
});
