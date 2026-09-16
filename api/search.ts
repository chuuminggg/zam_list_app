import { requireProvider } from '../server/providers/index.js';
import { SEARCH_ADAPTERS, SEARCH_PROVIDERS } from '../server/providers/search.js';
import { intParam, ok, requiredString, route } from '../server/respond.js';

/** GET /api/search?provider=daiso&q=수납함&limit=10 — 상품 검색 */
export const GET = route(async (url) => {
  const provider = requireProvider(url, SEARCH_PROVIDERS);
  const q = requiredString(url, 'q', { min: 2, max: 100 });
  const limit = intParam(url, 'limit', { min: 1, max: 20, fallback: 10 });
  return ok(await SEARCH_ADAPTERS[provider](q, limit), 300);
});
