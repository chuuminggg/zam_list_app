import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import * as auth from '../../api/auth.js';
import * as kakao from '../../api/kakao.js';
import { ensureSchema } from './db.js';
import { createTestDb } from './testDb.js';

let db: ReturnType<typeof createTestDb> | null = null;
const PW = 'zam-pass1';

vi.mock('./db.js', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./db.js')>();
  return {
    ...actual,
    requireDb: async (env: NodeJS.ProcessEnv = process.env) => (db ? actual.ensureSchema(db) : actual.requireDb(env)),
  };
});

const METHOD = new Map<unknown, string>([
  [auth.GET, 'GET'],
  [auth.POST, 'POST'],
  [kakao.GET, 'GET'],
  [kakao.POST, 'POST'],
  [kakao.DELETE, 'DELETE'],
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

async function login(username = 'zam', password = PW): Promise<string> {
  const res = await call(auth.POST, 'auth', { body: { username, password, create: true } });
  return res.json.data.token;
}

/** 카카오 서버 흉내: 인가 코드 'code-<회원번호>'를 그 회원번호로 바꿔 준다. */
function stubKakao() {
  const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
    if (url.startsWith('https://kauth.kakao.com/oauth/token')) {
      const code = new URLSearchParams(init?.body as URLSearchParams).get('code') ?? '';
      if (!code.startsWith('code-')) return new Response('{"error":"invalid_grant"}', { status: 400 });
      return Response.json({ access_token: `at-${code.slice(5)}` });
    }
    if (url === 'https://kapi.kakao.com/v2/user/me') {
      const token = new Headers(init?.headers).get('authorization')!.slice('Bearer at-'.length);
      return Response.json({ id: Number(token), kakao_account: { profile: { nickname: `닉${token}` } } });
    }
    return new Response('not found', { status: 404 });
  });
  vi.stubGlobal('fetch', fetchMock);
  return fetchMock;
}

/** 카카오 로그인을 시작하고 카카오에서 돌아온 것처럼 콜백을 부른다. */
async function kakaoRound(kakaoId: number, { mode = 'login', token }: { mode?: 'login' | 'link'; token?: string } = {}) {
  const started = await call(kakao.POST, 'kakao?action=start', { body: { mode }, token });
  expect(started.status).toBe(200);
  const authorize = new URL(started.json.data.url);
  expect(authorize.searchParams.get('redirect_uri')).toBe('http://localhost/auth/kakao');
  const state = authorize.searchParams.get('state');
  return call(kakao.POST, 'kakao?action=callback', { body: { code: `code-${kakaoId}`, state }, token });
}

beforeEach(async () => {
  db = createTestDb();
  await ensureSchema(db);
  vi.stubEnv('KAKAO_REST_API_KEY', 'rest-key');
  stubKakao();
});

afterEach(async () => {
  await db?.pg.close();
  db = null;
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe('/api/kakao', () => {
  it('키가 없으면 꺼져 있다', async () => {
    vi.stubEnv('KAKAO_REST_API_KEY', '');
    expect((await call(kakao.GET, 'kakao')).json.data).toEqual({ enabled: false, link: null, hasPassword: null });
    expect((await call(kakao.POST, 'kakao?action=start', { body: { mode: 'login' } })).status).toBe(503);
  });

  it('로그인한 계정에 카카오를 연결하면 카카오로 로그인해 아이디를 찾을 수 있다', async () => {
    const token = await login('잊은아이디');
    const linked = await kakaoRound(111, { mode: 'link', token });
    expect(linked.json.data).toMatchObject({ status: 'linked', user: { username: '잊은아이디' } });

    const state = await call(kakao.GET, 'kakao', { token });
    expect(state.json.data).toMatchObject({ enabled: true, link: { nickname: '닉111' }, hasPassword: true });

    const signedIn = await kakaoRound(111);
    expect(signedIn.json.data).toMatchObject({ status: 'signedIn', user: { username: '잊은아이디' } });
    const me = await call(auth.GET, 'auth', { token: signedIn.json.data.token });
    expect(me.json.data.user.username).toBe('잊은아이디');
  });

  it('연결은 로그인한 상태에서만 시작하고, 시작한 계정과 다른 계정으로는 끝낼 수 없다', async () => {
    expect((await call(kakao.POST, 'kakao?action=start', { body: { mode: 'link' } })).status).toBe(401);

    const mine = await login('zam');
    const other = await login('other');
    const started = await call(kakao.POST, 'kakao?action=start', { body: { mode: 'link' }, token: mine });
    const state = new URL(started.json.data.url).searchParams.get('state');
    const res = await call(kakao.POST, 'kakao?action=callback', { body: { code: 'code-1', state }, token: other });
    expect(res.status).toBe(401);
    expect(await db!.query('SELECT * FROM kakao_links')).toEqual([]);
  });

  it('state는 한 번만 쓸 수 있다', async () => {
    const started = await call(kakao.POST, 'kakao?action=start', { body: { mode: 'login' } });
    const state = new URL(started.json.data.url).searchParams.get('state');
    expect((await call(kakao.POST, 'kakao?action=callback', { body: { code: 'code-1', state } })).status).toBe(200);
    expect((await call(kakao.POST, 'kakao?action=callback', { body: { code: 'code-1', state } })).status).toBe(400);
    expect((await call(kakao.POST, 'kakao?action=callback', { body: { code: 'code-1', state: 'made-up' } })).status).toBe(400);
  });

  it('연결 안 된 카카오는 새 계정을 만들 수 있고, 그 계정은 비밀번호로 로그인되지 않는다', async () => {
    const res = await kakaoRound(222);
    expect(res.json.data).toMatchObject({ status: 'unlinked', nickname: '닉222' });

    const taken = await login('taken');
    expect(taken).toBeTruthy();
    const dup = await call(kakao.POST, 'kakao?action=signup', { body: { ticket: res.json.data.ticket, username: 'taken' } });
    expect(dup.status).toBe(400);

    const made = await call(kakao.POST, 'kakao?action=signup', { body: { ticket: res.json.data.ticket, username: 'kakaozam' } });
    expect(made.json.data).toMatchObject({ status: 'signedIn', user: { username: 'kakaozam' } });
    // 티켓은 다 쓰면 사라진다.
    const again = await call(kakao.POST, 'kakao?action=signup', { body: { ticket: res.json.data.ticket, username: 'x2' } });
    expect(again.status).toBe(400);

    const byPassword = await call(auth.POST, 'auth', { body: { username: 'kakaozam', password: 'none' } });
    expect(byPassword.status).toBe(401);
    expect((await kakaoRound(222)).json.data).toMatchObject({ status: 'signedIn', user: { username: 'kakaozam' } });

    // 비밀번호 없는 계정은 연결을 끊을 수 없다.
    expect((await call(kakao.DELETE, 'kakao', { token: made.json.data.token })).status).toBe(400);
  });

  it('연결 안 된 카카오를 기존 아이디·비밀번호 확인 후 연결한다', async () => {
    await login('zam');
    const res = await kakaoRound(333);
    const ticket = res.json.data.ticket;

    const wrong = await call(kakao.POST, 'kakao?action=attach', { body: { ticket, username: 'zam', password: 'wrong-pw-1' } });
    expect(wrong.status).toBe(401);
    // 비밀번호를 틀려도 티켓은 남아 다시 시도할 수 있다.
    const attached = await call(kakao.POST, 'kakao?action=attach', { body: { ticket, username: 'zam', password: PW } });
    expect(attached.json.data).toMatchObject({ status: 'signedIn', user: { username: 'zam' } });
    expect((await kakaoRound(333)).json.data).toMatchObject({ status: 'signedIn', user: { username: 'zam' } });
  });

  it('한 카카오 계정은 한 아이디에만 연결된다', async () => {
    const a = await login('aaa');
    const b = await login('bbb');
    await kakaoRound(444, { mode: 'link', token: a });
    const res = await kakaoRound(444, { mode: 'link', token: b });
    expect(res.status).toBe(400);
    expect(res.json.error.message).toContain("'aaa'");
  });

  it('카카오가 연결된 계정은 아이디만으로 비밀번호를 초기화할 수 없고, 끊으면 다시 된다', async () => {
    const token = await login('zam');
    await kakaoRound(555, { mode: 'link', token });
    expect((await call(auth.POST, 'auth?action=reset', { body: { username: 'zam' } })).status).toBe(400);

    expect((await call(kakao.DELETE, 'kakao', { token })).status).toBe(200);
    expect((await call(kakao.GET, 'kakao', { token })).json.data.link).toBeNull();
    expect((await call(auth.POST, 'auth?action=reset', { body: { username: 'zam' } })).status).toBe(200);
  });

  it('카카오가 인가 코드를 거절하면 400', async () => {
    const started = await call(kakao.POST, 'kakao?action=start', { body: { mode: 'login' } });
    const state = new URL(started.json.data.url).searchParams.get('state');
    const res = await call(kakao.POST, 'kakao?action=callback', { body: { code: 'bad', state } });
    expect(res.status).toBe(400);
  });
});
