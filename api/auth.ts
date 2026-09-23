import { ok, readJson, route } from '../server/respond.js';
import { checkPassword, normalizeUsername, requireUser, signIn, signOut } from '../server/storage/auth.js';
import { requireDb } from '../server/storage/db.js';

/** GET /api/auth — 현재 로그인한 사용자 */
export const GET = route(async (_url, request) => {
  const db = await requireDb();
  return ok({ user: await requireUser(db, request) });
});

/**
 * POST /api/auth  body: { username, password } — 로그인.
 * 처음 쓰는 아이디면 그 비밀번호로 계정을 만든다 (created: true).
 */
export const POST = route(async (_url, request) => {
  const body = await readJson(request, 4096);
  const { username, password } = (typeof body === 'object' && body !== null ? body : {}) as Record<string, unknown>;
  const db = await requireDb();
  return ok(await signIn(db, normalizeUsername(username), checkPassword(password)));
});

/** DELETE /api/auth — 로그아웃 (현재 세션 삭제) */
export const DELETE = route(async (_url, request) => {
  await signOut(await requireDb(), request);
  return ok(null);
});
