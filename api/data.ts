import { COLLECTION_IDS, MAX_ITEMS_PER_COLLECTION, type CollectionId } from '../shared/data.js';
import { ApiException } from '../server/errors.js';
import { ok, oneOf, requiredString, route } from '../server/respond.js';
import { CollectionRepository, requireRedis, requireSyncKey } from '../server/storage/collections.js';
import { parseItems } from '../server/storage/validate.js';

/** 요청 본문 최대 크기 */
const MAX_BODY_BYTES = 1024 * 1024;

function context(url: URL, request: Request) {
  const syncKey = requireSyncKey(request);
  const collection = oneOf(url, 'collection', COLLECTION_IDS);
  return { collection, repo: new CollectionRepository<CollectionId>(requireRedis(), syncKey, collection) };
}

async function readItems(collection: CollectionId, request: Request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) {
    throw new ApiException('BAD_REQUEST', '요청 본문이 너무 큽니다.');
  }
  let body: unknown;
  try {
    body = JSON.parse(text);
  } catch {
    throw new ApiException('BAD_REQUEST', '요청 본문이 올바른 JSON이 아닙니다.');
  }
  return parseItems(collection, body, MAX_ITEMS_PER_COLLECTION);
}

/** GET /api/data?collection=todos — 저장된 항목 전체 */
export const GET = route(async (url, request) => {
  const { repo } = context(url, request);
  return ok({ items: await repo.list() });
});

/** POST /api/data?collection=todos  body: { items } — 항목 추가/수정 */
export const POST = route(async (url, request) => {
  const { collection, repo } = context(url, request);
  await repo.upsert(await readItems(collection, request));
  return ok(null);
});

/** PUT /api/data?collection=todos  body: { items } — 컬렉션 전체 교체 */
export const PUT = route(async (url, request) => {
  const { collection, repo } = context(url, request);
  await repo.replace(await readItems(collection, request));
  return ok(null);
});

/** DELETE /api/data?collection=todos&id=... — 항목 삭제 */
export const DELETE = route(async (url, request) => {
  const { repo } = context(url, request);
  await repo.remove(requiredString(url, 'id', { max: 64, pattern: /^[A-Za-z0-9_-]+$/ }));
  return ok(null);
});
