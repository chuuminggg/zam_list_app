import { SEARCH_PROVIDER_IDS, type ProductResult, type SearchProviderId } from '../../shared/api.js';
import { searchBunjangProducts } from './bunjang.js';
import { searchDaisoProducts } from './daiso.js';
import { searchKurlyProducts } from './kurly.js';
import { searchOliveyoungProducts } from './oliveyoung.js';

type SearchFn = (query: string, limit: number) => Promise<ProductResult[]>;

/** 상품 검색을 지원하는 공급자 어댑터 */
export const SEARCH_ADAPTERS: Record<SearchProviderId, SearchFn> = {
  daiso: searchDaisoProducts,
  oliveyoung: searchOliveyoungProducts,
  kurly: searchKurlyProducts,
  bunjang: searchBunjangProducts,
};

export const SEARCH_PROVIDERS = SEARCH_PROVIDER_IDS;
