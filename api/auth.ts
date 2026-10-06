import { ok, readJson, route } from '../server/respond.js';
import {
  checkPassword,
  normalizeUsername,
  requireUser,
  resetPassword,
  signIn,
  signOut,
  temporaryPassword,
} from '../server/storage/auth.js';
import { requireDb } from '../server/storage/db.js';

/** GET /api/auth — 현재 로그인한 사용자 */
export const GET = route(async (_url, request) => {
  const db = await requireDb();
  return ok({ user: await requireUser(db, request) });
});

/**
 * POST /api/auth  body: { username, password, create?, newPassword? } — 로그인.
 * 처음 보는 아이디면 계정을 만들지 않고 { status: 'new' }로 답한다.
 * 화면에서 확인받은 뒤 create: true로 다시 요청하면 그때 계정을 만든다 (created: true).
 * 초기화된 계정은 { status: 'mustChange' }로 답하고, newPassword를 함께 보내야 로그인된다.
 *
 * POST /api/auth?action=reset  body: { username } — 비밀번호를 오늘 날짜(YYYYMMDD)로 초기화.
 */
export const POST = route(async (url, request) => {
  const body = await readJson(request, 4096);
  const { username, password, create, newPassword } = (typeof body === 'object' && body !== null ? body : {}) as Record<
    string,
    unknown
  >;
  const db = await requireDb();
  if (url.searchParams.get('action') === 'reset') {
    await resetPassword(db, normalizeUsername(username));
    return ok({ temporaryPassword: temporaryPassword() });
  }
  return ok(
    await signIn(db, normalizeUsername(username), checkPassword(password), {
      create: create === true,
      newPassword: newPassword === undefined ? undefined : checkPassword(newPassword),
    }),
  );
});

/** DELETE /api/auth — 로그아웃 (현재 세션 삭제) */
export const DELETE = route(async (_url, request) => {
  await signOut(await requireDb(), request);
  return ok(null);
});
