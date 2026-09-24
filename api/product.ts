import { cached } from '../server/cache/cache.js';
import { requireProvider } from '../server/providers/index.js';
import { PRODUCT_ADAPTERS, PRODUCT_PROVIDERS } from '../server/providers/product.js';
import { ok, optionalString, requiredString, route } from '../server/respond.js';

/** 같은 상품의 재조회 결과를 Redis에 보관하는 시간 */
const PRODUCT_CACHE_SECONDS = 300;

/**
 * GET /api/product?provider=bunjang&id=286794211&name=상품명 — 담아둔 상품 단건 재조회.
 * name은 단건 조회 API가 없는 공급자가 상품을 다시 찾을 때 쓴다.
 */
export const GET = route(async (url) => {
  const provider = requireProvider(url, PRODUCT_PROVIDERS);
  const id = requiredString(url, 'id', { max: 100, pattern: /^[A-Za-z0-9_-]+$/ });
  const name = optionalString(url, 'name', { max: 300 });
  const key = `product:${provider}:${id}`;
  return ok(await cached(key, PRODUCT_CACHE_SECONDS, () => PRODUCT_ADAPTERS[provider](id, name)), 60);
});
