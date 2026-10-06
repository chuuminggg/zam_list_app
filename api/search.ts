import { requireProvider } from '../server/providers/index.js';
import { SEARCH_ADAPTERS, SEARCH_PROVIDERS } from '../server/providers/search.js';
import { intParam, ok, optionalString, requiredString, route } from '../server/respond.js';

/** GET /api/search?provider=daiso&q=수납함&limit=10 — 상품 검색. 당근은 &region=합정동 (동네 이름) 필수 */
export const GET = route(async (url) => {
  const provider = requireProvider(url, SEARCH_PROVIDERS);
  const q = requiredString(url, 'q', { min: 2, max: 100 });
  const limit = intParam(url, 'limit', { min: 1, max: 20, fallback: 10 });
  const region = optionalString(url, 'region', { max: 30 });
  return ok(await SEARCH_ADAPTERS[provider](q, limit, { region }), 300);
});
