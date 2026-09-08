import { requireProvider } from '../server/providers/index.js';
import { STOCK_ADAPTERS, STOCK_PROVIDERS } from '../server/providers/stock.js';
import { intParam, ok, requiredString, route } from '../server/respond.js';

/**
 * GET /api/search?provider=daiso&q=수납함&limit=10 — 상품 검색
 * (현재는 재고 확인 공급자만. Phase 7~8에서 다른 공급자 추가)
 */
export const GET = route(async (url) => {
  const provider = requireProvider(url, STOCK_PROVIDERS);
  const q = requiredString(url, 'q', { min: 2, max: 100 });
  const limit = intParam(url, 'limit', { min: 1, max: 20, fallback: 10 });
  return ok(await STOCK_ADAPTERS[provider].searchProducts(q, limit), 300);
});
