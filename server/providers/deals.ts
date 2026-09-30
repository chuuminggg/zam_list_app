import { DEAL_PROVIDER_IDS, type DealProviderId, type ProductResult } from '../../shared/api.js';
import { cached } from '../cache/cache.js';
import { fetchOhouDeals } from './ohou.js';

/** 특가 목록을 Redis에 보관하는 시간 */
const DEALS_CACHE_SECONDS = 300;

/** 특가 목록을 내려주는 공급자 어댑터 */
export const DEAL_ADAPTERS: Record<DealProviderId, () => Promise<ProductResult[]>> = {
  ohou: fetchOhouDeals,
};

export const DEAL_PROVIDERS = DEAL_PROVIDER_IDS;

/** 특가 목록 (캐시 우선). 목록 화면과 담은 항목 재확인이 같은 캐시를 쓴다. */
export const getDeals = (provider: DealProviderId): Promise<ProductResult[]> =>
  cached(`deals:${provider}`, DEALS_CACHE_SECONDS, () => DEAL_ADAPTERS[provider]());
