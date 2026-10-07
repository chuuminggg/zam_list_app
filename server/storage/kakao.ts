import { randomBytes } from 'node:crypto';
import type { AuthUser } from '../../shared/data.js';
import type { KakaoCallbackResult, KakaoLink, KakaoMode } from '../../shared/kakao.js';
import { ApiException } from '../errors.js';
import { createPasswordlessUser, createSession, hasPassword, hashToken, signIn } from './auth.js';
import type { Db } from './db.js';

const AUTHORIZE_URL = 'https://kauth.kakao.com/oauth/authorize';
const TOKEN_URL = 'https://kauth.kakao.com/oauth/token';
const USER_URL = 'https://kapi.kakao.com/v2/user/me';
/** 카카오 화면에서 돌아올 때까지, 그리고 돌아와서 가입·연결을 고를 때까지 기다리는 시간 */
const STATE_MINUTES = 10;
const TIMEOUT_MS = 8000;

export interface KakaoConfig {
  /** 카카오 개발자 콘솔 → 앱 키 → REST API 키 */
  restApiKey: string;
  /** 카카오 로그인 → 보안 → Client Secret (사용 설정했을 때만) */
  clientSecret: string | null;
  /** 고정 Redirect URI. 비우면 요청이 들어온 주소의 /auth/kakao를 쓴다. */
  redirectUri: string | null;
}

export function getKakaoConfig(env: NodeJS.ProcessEnv = process.env): KakaoConfig | null {
  if (!env.KAKAO_REST_API_KEY) return null;
  return {
    restApiKey: env.KAKAO_REST_API_KEY,
    clientSecret: env.KAKAO_CLIENT_SECRET || null,
    redirectUri: env.KAKAO_REDIRECT_URI || null,
  };
}

export function requireKakaoConfig(env: NodeJS.ProcessEnv = process.env): KakaoConfig {
  const config = getKakaoConfig(env);
  if (!config) {
    throw new ApiException('NOT_CONFIGURED', '카카오 로그인이 설정되지 않았어요. (환경변수 필요: KAKAO_REST_API_KEY)');
  }
  return config;
}

export interface KakaoProfile {
  kakaoId: string;
  nickname: string | null;
}

/** 인가 코드를 카카오 회원번호로 바꾼다. 테스트에서는 가짜로 바꿔 끼운다. */
export type KakaoExchange = (code: string, redirectUri: string) => Promise<KakaoProfile>;

async function kakaoFetch<T>(url: string, init: RequestInit, failMessage: string): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, { ...init, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch {
    throw new ApiException('UPSTREAM_ERROR', '카카오에 연결할 수 없어요.');
  }
  if (!response.ok) {
    console.error('[kakao]', url, response.status, await response.text().catch(() => ''));
    // 인가 코드는 한 번만 쓸 수 있고 금방 만료돼서, 실패하면 처음부터 다시 해야 한다.
    throw new ApiException(response.status < 500 ? 'BAD_REQUEST' : 'UPSTREAM_ERROR', failMessage);
  }
  return (await response.json()) as T;
}

export function kakaoExchange(config: KakaoConfig): KakaoExchange {
  return async (code, redirectUri) => {
    const form = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.restApiKey,
      redirect_uri: redirectUri,
      code,
    });
    if (config.clientSecret) form.set('client_secret', config.clientSecret);
    const { access_token } = await kakaoFetch<{ access_token: string }>(
      TOKEN_URL,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=utf-8' },
        body: form,
      },
      '카카오 인증이 만료됐어요. 처음부터 다시 시도하세요.',
    );
    const me = await kakaoFetch<{ id: number; kakao_account?: { profile?: { nickname?: string } } }>(
      USER_URL,
      { headers: { Authorization: `Bearer ${access_token}` } },
      '카카오 계정 정보를 가져오지 못했어요.',
    );
    return { kakaoId: String(me.id), nickname: me.kakao_account?.profile?.nickname ?? null };
  };
}

/** 카카오 로그인 화면 주소를 만든다. 연결(link)은 로그인한 사용자만 시작할 수 있다. */
export async function startKakao(
  db: Db,
  config: KakaoConfig,
  { mode, userId, origin }: { mode: KakaoMode; userId: string | null; origin: string },
): Promise<string> {
  if (mode === 'link' && !userId) throw new ApiException('UNAUTHORIZED', '로그인이 필요해요.');
  const redirectUri = config.redirectUri ?? `${origin}/auth/kakao`;
  const state = randomBytes(24).toString('base64url');
  await db.query('DELETE FROM oauth_states WHERE expires_at <= now()');
  await db.query(
    `INSERT INTO oauth_states (key_hash, kind, user_id, redirect_uri, expires_at)
     VALUES ($1, $2, $3, $4, now() + make_interval(mins => $5))`,
    [hashToken(state), mode, mode === 'link' ? userId : null, redirectUri, STATE_MINUTES],
  );
  const params = new URLSearchParams({ response_type: 'code', client_id: config.restApiKey, redirect_uri: redirectUri, state });
  return `${AUTHORIZE_URL}?${params}`;
}

interface StateRow {
  kind: string;
  user_id: string | null;
  redirect_uri: string | null;
  kakao_id: string | null;
  nickname: string | null;
}

const EXPIRED = '카카오 로그인 시간이 지났어요. 처음부터 다시 시도하세요.';

/** state는 한 번만 쓸 수 있도록 꺼내면서 지운다. */
async function takeState(db: Db, state: string): Promise<StateRow> {
  const [row] = await db.query<StateRow>(
    `DELETE FROM oauth_states WHERE key_hash = $1 AND kind IN ('login', 'link') AND expires_at > now()
     RETURNING kind, user_id, redirect_uri, kakao_id, nickname`,
    [hashToken(state)],
  );
  if (!row) throw new ApiException('BAD_REQUEST', EXPIRED);
  return row;
}

/** 카카오 계정을 ZAM 계정에 연결한다. 이미 같은 쌍이면 그대로 둔다. */
async function linkKakao(db: Db, userId: string, profile: KakaoProfile): Promise<void> {
  const inserted = await db.query(
    `INSERT INTO kakao_links (user_id, kakao_id, nickname) VALUES ($1, $2, $3)
     ON CONFLICT DO NOTHING RETURNING user_id`,
    [userId, profile.kakaoId, profile.nickname],
  );
  if (inserted.length > 0) return;

  const [owner] = await db.query<{ user_id: string; username: string }>(
    'SELECT k.user_id, u.username FROM kakao_links k JOIN users u ON u.id = k.user_id WHERE k.kakao_id = $1',
    [profile.kakaoId],
  );
  if (owner?.user_id === userId) return;
  if (owner) {
    // 카카오 계정 주인에게만 보이는 정보라 아이디를 알려줘도 된다 (아이디 찾기와 같다).
    throw new ApiException('BAD_REQUEST', `이 카카오 계정은 이미 '${owner.username}' 아이디에 연결돼 있어요.`);
  }
  throw new ApiException('BAD_REQUEST', '이 아이디에는 이미 다른 카카오 계정이 연결돼 있어요. 연결을 끊고 다시 시도하세요.');
}

async function findLinkedUser(db: Db, kakaoId: string): Promise<AuthUser | null> {
  const [user] = await db.query<AuthUser>(
    'SELECT u.id, u.username FROM kakao_links k JOIN users u ON u.id = k.user_id WHERE k.kakao_id = $1',
    [kakaoId],
  );
  return user ?? null;
}

/**
 * 카카오에서 돌아온 인가 코드를 처리한다.
 * link는 시작한 사용자와 지금 로그인한 사용자가 같아야 한다 (남의 계정에 내 카카오가 붙지 않도록).
 */
export async function handleKakaoCallback(
  db: Db,
  exchange: KakaoExchange,
  { code, state, currentUserId }: { code: string; state: string; currentUserId: string | null },
): Promise<KakaoCallbackResult> {
  const row = await takeState(db, state);
  if (!row.redirect_uri) throw new ApiException('BAD_REQUEST', EXPIRED);

  if (row.kind === 'link') {
    if (!row.user_id || row.user_id !== currentUserId) {
      throw new ApiException('UNAUTHORIZED', '카카오 연결을 시작한 계정으로 로그인한 상태에서 다시 시도하세요.');
    }
    const profile = await exchange(code, row.redirect_uri);
    await linkKakao(db, row.user_id, profile);
    const [user] = await db.query<AuthUser>('SELECT id, username FROM users WHERE id = $1', [row.user_id]);
    return { status: 'linked', user: user! };
  }

  const profile = await exchange(code, row.redirect_uri);
  const user = await findLinkedUser(db, profile.kakaoId);
  if (user) return { status: 'signedIn', token: await createSession(db, user.id), user };

  const ticket = randomBytes(24).toString('base64url');
  await db.query(
    `INSERT INTO oauth_states (key_hash, kind, kakao_id, nickname, expires_at)
     VALUES ($1, 'ticket', $2, $3, now() + make_interval(mins => $4))`,
    [hashToken(ticket), profile.kakaoId, profile.nickname, STATE_MINUTES],
  );
  return { status: 'unlinked', ticket, nickname: profile.nickname };
}

async function readTicket(db: Db, ticket: string): Promise<KakaoProfile> {
  const [row] = await db.query<StateRow>(
    `SELECT kakao_id, nickname FROM oauth_states WHERE key_hash = $1 AND kind = 'ticket' AND expires_at > now()`,
    [hashToken(ticket)],
  );
  if (!row?.kakao_id) throw new ApiException('BAD_REQUEST', EXPIRED);
  return { kakaoId: row.kakao_id, nickname: row.nickname };
}

const dropTicket = (db: Db, ticket: string) =>
  db.query('DELETE FROM oauth_states WHERE key_hash = $1', [hashToken(ticket)]);

/** 연결된 계정이 없던 카카오로 새 계정을 만든다 (비밀번호 없음). */
export async function signUpWithKakao(
  db: Db,
  ticket: string,
  username: string,
): Promise<{ token: string; user: AuthUser }> {
  const profile = await readTicket(db, ticket);
  // 그 사이 다른 창에서 연결했으면 그 계정으로 로그인한다.
  const existing = await findLinkedUser(db, profile.kakaoId);
  const user = existing ?? (await createPasswordlessUser(db, username));
  if (!existing) await linkKakao(db, user.id, profile);
  await dropTicket(db, ticket);
  return { token: await createSession(db, user.id), user };
}

/** 기존 아이디·비밀번호를 확인한 뒤 그 계정에 카카오를 연결하고 로그인한다. */
export async function attachKakao(
  db: Db,
  ticket: string,
  username: string,
  password: string,
): Promise<{ token: string; user: AuthUser }> {
  const profile = await readTicket(db, ticket);
  const result = await signIn(db, username, password);
  if (result.status === 'new') throw new ApiException('NOT_FOUND', '없는 아이디예요.');
  if (result.status === 'mustChange') {
    throw new ApiException(
      'BAD_REQUEST',
      '임시 비밀번호로 초기화된 계정이에요. 먼저 아이디·비밀번호로 로그인해 새 비밀번호를 정한 뒤 연결하세요.',
    );
  }
  try {
    await linkKakao(db, result.user.id, profile);
  } catch (error) {
    await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(result.token)]);
    throw error;
  }
  await dropTicket(db, ticket);
  return { token: result.token, user: result.user };
}

export async function getKakaoLink(db: Db, userId: string): Promise<KakaoLink | null> {
  const [row] = await db.query<{ nickname: string | null; linked_at: Date | string }>(
    'SELECT nickname, linked_at FROM kakao_links WHERE user_id = $1',
    [userId],
  );
  return row ? { nickname: row.nickname, linkedAt: new Date(row.linked_at).toISOString() } : null;
}

/** 카카오 연결을 끊는다. 비밀번호 없는 계정은 끊으면 들어올 방법이 없어서 막는다. */
export async function unlinkKakao(db: Db, userId: string): Promise<void> {
  const [user] = await db.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [userId]);
  if (user && !hasPassword(user.password_hash)) {
    throw new ApiException('BAD_REQUEST', '카카오로만 로그인하는 계정이라 연결을 끊을 수 없어요.');
  }
  await db.query('DELETE FROM kakao_links WHERE user_id = $1', [userId]);
}
