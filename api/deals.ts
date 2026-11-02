import { DEAL_PROVIDERS, getDeals } from '../server/providers/deals.js';
import { requireProvider } from '../server/providers/index.js';
import { getOliveyoungTodayDeals } from '../server/providers/oliveyoungTodayDeals.js';
import { ok, route } from '../server/respond.js';

/** 위시 출처 특가 목록 + 목록만 보여주는 올리브영 오특 */
const PROVIDERS = [...DEAL_PROVIDERS, 'oliveyoung'] as const;

/**
 * GET /api/deals?provider=ohou — 오늘의집 오늘의딜 같은 특가 목록 (ProductResult[])
 * GET /api/deals?provider=oliveyoung — 올리브영 오특 (TodayDeals)
 */
export const GET = route(async (url) => {
  const provider = requireProvider(url, PROVIDERS);
  if (provider === 'oliveyoung') return ok(await getOliveyoungTodayDeals(), 300);
  return ok(await getDeals(provider), 300);
});
