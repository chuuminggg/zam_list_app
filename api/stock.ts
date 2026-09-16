import { requireProvider } from '../server/providers/index.js';
import { STOCK_ADAPTERS, STOCK_PROVIDERS } from '../server/providers/stock.js';
import { intParam, ok, requiredString, route } from '../server/respond.js';

/** GET /api/stock?provider=daiso&id=1047618&store=강남&limit=10 — 매장별 재고/픽업 가능 여부 */
export const GET = route(async (url) => {
  const provider = requireProvider(url, STOCK_PROVIDERS);
  const id = requiredString(url, 'id', { max: 30, pattern: /^[A-Za-z0-9]+$/ });
  const store = requiredString(url, 'store', { min: 1, max: 50 });
  const limit = intParam(url, 'limit', { min: 1, max: 30, fallback: 10 });
  return ok(await STOCK_ADAPTERS[provider](id, store, limit), 60);
});
