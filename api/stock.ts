import { cached } from '../server/cache/cache.js';
import { requireProvider } from '../server/providers/index.js';
import { STOCK_ADAPTERS, STOCK_PROVIDERS } from '../server/providers/stock.js';
import { intParam, ok, optionalString, requiredString, route } from '../server/respond.js';

/** 같은 상품·매장 검색어의 재고 결과를 Redis에 보관하는 시간 */
const STOCK_CACHE_SECONDS = 300;

/** GET /api/stock?provider=daiso&id=1047618&store=강남&limit=10&name=상품명 — 매장별 재고/픽업 가능 여부 */
export const GET = route(async (url) => {
  const provider = requireProvider(url, STOCK_PROVIDERS);
  const id = requiredString(url, 'id', { max: 30, pattern: /^[A-Za-z0-9]+$/ });
  const store = requiredString(url, 'store', { min: 1, max: 50 });
  const limit = intParam(url, 'limit', { min: 1, max: 30, fallback: 10 });
  const name = optionalString(url, 'name', { max: 200 });
  const key = `stock:${provider}:${id}:${limit}:${encodeURIComponent(store.toLowerCase())}`;
  return ok(await cached(key, STOCK_CACHE_SECONDS, () => STOCK_ADAPTERS[provider](id, store, limit, name)), 60);
});
