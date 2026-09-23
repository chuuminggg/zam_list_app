import { COLLECTION_IDS, MAX_ITEMS_PER_COLLECTION, type CollectionId } from '../shared/data.js';
import { ok, oneOf, readJson, requiredString, route } from '../server/respond.js';
import { requireUser } from '../server/storage/auth.js';
import { CollectionRepository } from '../server/storage/collections.js';
import { requireDb } from '../server/storage/db.js';
import { parseItems } from '../server/storage/validate.js';

/** 요청 본문 최대 크기 */
const MAX_BODY_BYTES = 1024 * 1024;

async function context(url: URL, request: Request) {
  const collection = oneOf(url, 'collection', COLLECTION_IDS);
  const db = await requireDb();
  const user = await requireUser(db, request);
  return { collection, repo: new CollectionRepository<CollectionId>(db, user.id, collection) };
}

async function readItems(collection: CollectionId, request: Request) {
  return parseItems(collection, await readJson(request, MAX_BODY_BYTES), MAX_ITEMS_PER_COLLECTION);
}

/** GET /api/data?collection=todos — 저장된 항목 전체 */
export const GET = route(async (url, request) => {
  const { repo } = await context(url, request);
  return ok({ items: await repo.list() });
});

/** POST /api/data?collection=todos  body: { items } — 항목 추가/수정 */
export const POST = route(async (url, request) => {
  const { collection, repo } = await context(url, request);
  await repo.upsert(await readItems(collection, request));
  return ok(null);
});

/** PUT /api/data?collection=todos  body: { items } — 컬렉션 전체 교체 */
export const PUT = route(async (url, request) => {
  const { collection, repo } = await context(url, request);
  await repo.replace(await readItems(collection, request));
  return ok(null);
});

/** DELETE /api/data?collection=todos&id=... — 항목 삭제 */
export const DELETE = route(async (url, request) => {
  const { repo } = await context(url, request);
  await repo.remove(requiredString(url, 'id', { max: 64, pattern: /^[A-Za-z0-9_-]+$/ }));
  return ok(null);
});
