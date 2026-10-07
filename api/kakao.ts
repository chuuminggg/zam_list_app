import type { AuthUser } from '../shared/data.js';
import type { KakaoState } from '../shared/kakao.js';
import { ApiException } from '../server/errors.js';
import { ok, oneOf, readJson, route } from '../server/respond.js';
import { checkPassword, hasPassword, normalizeUsername, requireUser } from '../server/storage/auth.js';
import { requireDb, type Db } from '../server/storage/db.js';
import {
  attachKakao,
  getKakaoConfig,
  getKakaoLink,
  handleKakaoCallback,
  kakaoExchange,
  requireKakaoConfig,
  signUpWithKakao,
  startKakao,
  unlinkKakao,
} from '../server/storage/kakao.js';

const MAX_BODY_BYTES = 4096;
const ACTIONS = ['start', 'callback', 'signup', 'attach'] as const;

/** 로그인했으면 그 사용자, 아니면 null (토큰이 없거나 만료됐을 때) */
async function optionalUser(db: Db, request: Request): Promise<AuthUser | null> {
  if (!request.headers.get('authorization')) return null;
  return requireUser(db, request).catch(() => null);
}

function text(body: Record<string, unknown>, name: string, max = 1024): string {
  const value = body[name];
  if (typeof value !== 'string' || value.length < 1 || value.length > max) {
    throw new ApiException('BAD_REQUEST', `'${name}'이(가) 올바르지 않습니다.`);
  }
  return value;
}

/** GET /api/kakao — 카카오 로그인 사용 여부, 로그인했으면 연결 상태 */
export const GET = route(async (_url, request) => {
  const enabled = getKakaoConfig() !== null;
  if (!request.headers.get('authorization')) return ok<KakaoState>({ enabled, link: null, hasPassword: null });
  const db = await requireDb();
  const user = await requireUser(db, request);
  const [row] = await db.query<{ password_hash: string }>('SELECT password_hash FROM users WHERE id = $1', [user.id]);
  return ok<KakaoState>({
    enabled,
    link: await getKakaoLink(db, user.id),
    hasPassword: row ? hasPassword(row.password_hash) : null,
  });
});

/**
 * POST /api/kakao?action=start     body: { mode: 'login' | 'link' }  — 카카오 로그인 화면 주소 { url }
 * POST /api/kakao?action=callback  body: { code, state }             — 돌아온 인가 코드 처리 (KakaoCallbackResult)
 * POST /api/kakao?action=signup    body: { ticket, username }        — 연결 안 된 카카오로 새 계정 만들기
 * POST /api/kakao?action=attach    body: { ticket, username, password } — 기존 계정에 카카오 연결
 * link 시작·처리에는 Bearer 세션이 필요하다.
 */
export const POST = route(async (url, request) => {
  const action = oneOf(url, 'action', ACTIONS);
  const config = requireKakaoConfig();
  const raw = await readJson(request, MAX_BODY_BYTES);
  const body = (typeof raw === 'object' && raw !== null ? raw : {}) as Record<string, unknown>;
  const db = await requireDb();

  if (action === 'start') {
    const mode = body.mode === 'link' ? 'link' : 'login';
    const user = mode === 'link' ? await requireUser(db, request) : null;
    return ok({ url: await startKakao(db, config, { mode, userId: user?.id ?? null, origin: url.origin }) });
  }

  if (action === 'callback') {
    const user = await optionalUser(db, request);
    return ok(
      await handleKakaoCallback(db, kakaoExchange(config), {
        code: text(body, 'code'),
        state: text(body, 'state', 200),
        currentUserId: user?.id ?? null,
      }),
    );
  }

  const ticket = text(body, 'ticket', 200);
  const username = normalizeUsername(body.username);
  if (action === 'signup') return ok({ status: 'signedIn', ...(await signUpWithKakao(db, ticket, username)) });
  return ok({ status: 'signedIn', ...(await attachKakao(db, ticket, username, checkPassword(body.password))) });
});

/** DELETE /api/kakao — 카카오 연결 해제 */
export const DELETE = route(async (_url, request) => {
  const db = await requireDb();
  const user = await requireUser(db, request);
  await unlinkKakao(db, user.id);
  return ok(null);
});
