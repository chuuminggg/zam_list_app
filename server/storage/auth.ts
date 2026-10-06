import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PASSWORD_MAX, USERNAME_PATTERN, passwordPolicyError, type AuthUser } from '../../shared/data.js';
import { ApiException } from '../errors.js';
import type { Db } from './db.js';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** 로그인 세션 유효 기간 */
const SESSION_DAYS = 180;
const KEY_LENGTH = 32;
/** 연속으로 이만큼 틀리면 아이디를 잠근다. */
const MAX_LOGIN_FAILURES = 5;
const LOCK_MINUTES = 15;
const LOCKED_MESSAGE = `로그인에 ${MAX_LOGIN_FAILURES}번 실패해서 ${LOCK_MINUTES}분 동안 잠겼어요. 잠시 뒤에 다시 시도하세요.`;

/** `scrypt$<salt>$<hash>` (base64url) */
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16);
  const hash = await scryptAsync(password, salt, KEY_LENGTH);
  return `scrypt$${salt.toString('base64url')}$${hash.toString('base64url')}`;
}

async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const [scheme, salt, hash] = stored.split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'base64url');
  const actual = await scryptAsync(password, Buffer.from(salt, 'base64url'), expected.length);
  return timingSafeEqual(actual, expected);
}

/** 세션 토큰은 원문 대신 해시만 저장한다. */
const hashToken = (token: string) => createHash('sha256').update(token).digest('hex');

export function normalizeUsername(value: unknown): string {
  const username = typeof value === 'string' ? value.trim().toLowerCase() : '';
  if (!USERNAME_PATTERN.test(username)) {
    throw new ApiException('BAD_REQUEST', '아이디는 2~20자의 한글·영문·숫자·_·-만 쓸 수 있어요.');
  }
  return username;
}

/** 로그인용 형식 검사. 새 계정 규칙(passwordPolicyError)은 계정을 만들 때만 적용한다. */
export function checkPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < 1 || value.length > PASSWORD_MAX) {
    throw new ApiException('BAD_REQUEST', `비밀번호는 1~${PASSWORD_MAX}자여야 해요.`);
  }
  return value;
}

async function isLocked(db: Db, username: string): Promise<boolean> {
  const rows = await db.query('SELECT 1 FROM login_attempts WHERE username = $1 AND locked_until > now()', [username]);
  return rows.length > 0;
}

/** 실패 횟수를 늘리고, 한도에 닿으면 횟수를 비우고 잠근다. 이번 실패로 잠겼으면 true. */
async function recordFailure(db: Db, username: string): Promise<boolean> {
  const [row] = await db.query<{ locked: boolean }>(
    `INSERT INTO login_attempts (username, failures) VALUES ($1, 1)
     ON CONFLICT (username) DO UPDATE SET
       failures = CASE WHEN login_attempts.failures + 1 >= $2 THEN 0 ELSE login_attempts.failures + 1 END,
       locked_until = CASE WHEN login_attempts.failures + 1 >= $2
         THEN now() + make_interval(mins => $3) ELSE login_attempts.locked_until END
     RETURNING coalesce(locked_until > now(), false) AS locked`,
    [username, MAX_LOGIN_FAILURES, LOCK_MINUTES],
  );
  return row?.locked ?? false;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
  must_change_password: boolean;
}

/** 초기화된 비밀번호: 한국 시간 기준 오늘 날짜 (YYYYMMDD) */
export function temporaryPassword(now = new Date()): string {
  return new Date(now.getTime() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10).replace(/-/g, '');
}

/**
 * 비밀번호를 오늘 날짜로 초기화한다. 다음 로그인 때 새 비밀번호를 정해야 하고,
 * 다른 기기의 세션은 모두 끊는다.
 */
export async function resetPassword(db: Db, username: string): Promise<void> {
  const [user] = await db.query<{ id: string }>('SELECT id FROM users WHERE username = $1', [username]);
  if (!user) throw new ApiException('NOT_FOUND', '없는 아이디예요.');
  await db.transaction([
    {
      text: 'UPDATE users SET password_hash = $2, must_change_password = true WHERE id = $1',
      params: [user.id, await hashPassword(temporaryPassword())],
    },
    { text: 'DELETE FROM sessions WHERE user_id = $1', params: [user.id] },
    { text: 'DELETE FROM login_attempts WHERE username = $1', params: [username] },
  ]);
}

/**
 * 로그인 결과. status가 'new'면 아직 없는 아이디라 계정을 만들지 않고 돌아온 것,
 * 'mustChange'면 임시 비밀번호가 맞았지만 새 비밀번호를 정해야 해서 세션을 주지 않은 것.
 */
export type SignInResult =
  | { status: 'signedIn'; token: string; user: AuthUser; created: boolean }
  | { status: 'new'; username: string }
  | { status: 'mustChange'; username: string };

/**
 * 아이디·비밀번호로 로그인한다.
 * 처음 보는 아이디는 오타로 계정이 갈라지지 않도록 create: true로 다시 요청해야 만든다.
 * 초기화된 계정은 newPassword를 함께 보내야 비밀번호를 바꾸고 로그인한다.
 */
export async function signIn(
  db: Db,
  username: string,
  password: string,
  { create = false, newPassword }: { create?: boolean; newPassword?: string } = {},
): Promise<SignInResult> {
  let [user] = await db.query<UserRow>(
    'SELECT id, username, password_hash, must_change_password FROM users WHERE username = $1',
    [username],
  );
  let created = false;

  if (user) {
    // 잠긴 동안에는 비밀번호를 확인하지 않아 추측 시도가 쌓이지 않게 한다.
    if (await isLocked(db, username)) throw new ApiException('RATE_LIMITED', LOCKED_MESSAGE);
    if (!(await verifyPassword(password, user.password_hash))) {
      if (await recordFailure(db, username)) throw new ApiException('RATE_LIMITED', LOCKED_MESSAGE);
      throw new ApiException('UNAUTHORIZED', '비밀번호가 맞지 않아요.');
    }
    await db.query('DELETE FROM login_attempts WHERE username = $1', [username]);
    if (user.must_change_password) {
      if (newPassword === undefined) return { status: 'mustChange', username };
      const policyError = passwordPolicyError(newPassword);
      if (policyError) throw new ApiException('BAD_REQUEST', policyError);
      if (newPassword === password) throw new ApiException('BAD_REQUEST', '임시 비밀번호와 다른 비밀번호를 정하세요.');
      await db.query('UPDATE users SET password_hash = $2, must_change_password = false WHERE id = $1', [
        user.id,
        await hashPassword(newPassword),
      ]);
    }
  } else {
    if (!create) return { status: 'new', username };
    const policyError = passwordPolicyError(password);
    if (policyError) throw new ApiException('BAD_REQUEST', policyError);
    const inserted = await db.query<UserRow>(
      `INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, username, password_hash, must_change_password`,
      [randomUUID(), username, await hashPassword(password)],
    );
    // 같은 아이디가 동시에 만들어졌으면 이번 요청은 로그인 실패로 처리한다.
    if (!inserted[0]) throw new ApiException('UNAUTHORIZED', '비밀번호가 맞지 않아요.');
    user = inserted[0];
    created = true;
  }

  const token = randomBytes(32).toString('base64url');
  await db.query(
    `INSERT INTO sessions (token_hash, user_id, expires_at) VALUES ($1, $2, now() + make_interval(days => $3))`,
    [hashToken(token), user.id, SESSION_DAYS],
  );
  return { status: 'signedIn', token, user: { id: user.id, username: user.username }, created };
}

function bearerToken(request: Request): string {
  const header = request.headers.get('authorization') ?? '';
  return header.startsWith('Bearer ') ? header.slice(7).trim() : '';
}

/** 요청의 세션 토큰으로 사용자를 찾는다. 없거나 만료됐으면 UNAUTHORIZED. */
export async function requireUser(db: Db, request: Request): Promise<AuthUser> {
  const token = bearerToken(request);
  if (token) {
    const [user] = await db.query<AuthUser>(
      `SELECT u.id, u.username FROM sessions s JOIN users u ON u.id = s.user_id
       WHERE s.token_hash = $1 AND s.expires_at > now()`,
      [hashToken(token)],
    );
    if (user) return user;
  }
  throw new ApiException('UNAUTHORIZED', '로그인이 필요해요.');
}

export async function signOut(db: Db, request: Request): Promise<void> {
  const token = bearerToken(request);
  if (token) await db.query('DELETE FROM sessions WHERE token_hash = $1', [hashToken(token)]);
}
