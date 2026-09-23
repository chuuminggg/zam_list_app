import { createHash, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { promisify } from 'node:util';
import { PASSWORD_MAX, PASSWORD_MIN, USERNAME_PATTERN, type AuthUser } from '../../shared/data.js';
import { ApiException } from '../errors.js';
import type { Db } from './db.js';

const scryptAsync = promisify(scrypt) as (password: string, salt: Buffer, keylen: number) => Promise<Buffer>;

/** 로그인 세션 유효 기간 */
const SESSION_DAYS = 180;
const KEY_LENGTH = 32;

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

export function checkPassword(value: unknown): string {
  if (typeof value !== 'string' || value.length < PASSWORD_MIN || value.length > PASSWORD_MAX) {
    throw new ApiException('BAD_REQUEST', `비밀번호는 ${PASSWORD_MIN}~${PASSWORD_MAX}자여야 해요.`);
  }
  return value;
}

interface UserRow {
  id: string;
  username: string;
  password_hash: string;
}

/**
 * 아이디·비밀번호로 로그인한다. 처음 보는 아이디면 계정을 만든다.
 * 새 세션 토큰을 돌려준다.
 */
export async function signIn(
  db: Db,
  username: string,
  password: string,
): Promise<{ token: string; user: AuthUser; created: boolean }> {
  let [user] = await db.query<UserRow>('SELECT id, username, password_hash FROM users WHERE username = $1', [username]);
  let created = false;

  if (user) {
    if (!(await verifyPassword(password, user.password_hash))) {
      throw new ApiException('UNAUTHORIZED', '비밀번호가 맞지 않아요.');
    }
  } else {
    const inserted = await db.query<UserRow>(
      `INSERT INTO users (id, username, password_hash) VALUES ($1, $2, $3)
       ON CONFLICT (username) DO NOTHING
       RETURNING id, username, password_hash`,
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
  return { token, user: { id: user.id, username: user.username }, created };
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
