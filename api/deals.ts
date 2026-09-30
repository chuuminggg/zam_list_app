import { DEAL_PROVIDERS, getDeals } from '../server/providers/deals.js';
import { requireProvider } from '../server/providers/index.js';
import { ok, route } from '../server/respond.js';

/** GET /api/deals?provider=ohou — 오늘의집 오늘의딜 같은 특가 목록 */
export const GET = route(async (url) => ok(await getDeals(requireProvider(url, DEAL_PROVIDERS)), 300));
