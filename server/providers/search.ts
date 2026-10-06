import { SEARCH_PROVIDER_IDS, type ProductResult, type SearchProviderId } from '../../shared/api.js';
import { searchBunjangProducts } from './bunjang.js';
import { searchCoupangProducts } from './coupang.js';
import { searchDaangnProducts } from './daangn.js';
import { searchDaisoProducts } from './daiso.js';
import { searchKurlyProducts } from './kurly.js';
import { searchOliveyoungProducts } from './oliveyoung.js';

export interface SearchOptions {
  /** 동네 이름 (당근처럼 지역이 필요한 공급자만 사용) */
  region?: string;
}

type SearchFn = (query: string, limit: number, options?: SearchOptions) => Promise<ProductResult[]>;

/** 상품 검색을 지원하는 공급자 어댑터 */
export const SEARCH_ADAPTERS: Record<SearchProviderId, SearchFn> = {
  daiso: searchDaisoProducts,
  oliveyoung: searchOliveyoungProducts,
  kurly: searchKurlyProducts,
  bunjang: searchBunjangProducts,
  daangn: (query, limit, options) => searchDaangnProducts(query, limit, options?.region),
  coupang: (query, limit) => searchCoupangProducts(query, limit),
};

export const SEARCH_PROVIDERS = SEARCH_PROVIDER_IDS;
