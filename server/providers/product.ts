/**
 * 담아둔 항목을 다시 조회해 가격·품절 상태를 확인하는 어댑터.
 *
 * 공급자마다 방식이 다르다.
 * - 번개장터: 상품 상세 API가 열려 있어 판매완료 상품도 그대로 조회된다.
 * - 나머지: 단건 조회 엔드포인트가 없거나 막혀 있어(마켓컬리 상세는 404/500),
 *   담을 때 저장해 둔 상품명으로 다시 검색해 같은 상품번호를 찾는다.
 */
import { SEARCH_PROVIDER_IDS, type ProductResult, type SearchProviderId } from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { fetchBunjangProduct } from './bunjang.js';
import { SEARCH_ADAPTERS } from './search.js';

/** 이름으로 다시 검색할 때 훑어볼 결과 수 */
const RESEARCH_LIMIT = 20;
/** 검색어로 쓸 상품명 길이 (검색 API의 q 제한과 맞춘다) */
const QUERY_MAX = 100;

export type FetchProductFn = (productId: string, productName?: string) => Promise<ProductResult>;

function notFound(): never {
  throw new ApiException(
    'NOT_FOUND',
    '판매처에서 상품을 찾지 못했습니다. 판매가 끝났거나 상품 정보가 바뀌었을 수 있어요.',
  );
}

/** 상품명으로 다시 검색해 같은 상품번호를 찾는다. */
function byNameSearch(provider: SearchProviderId): FetchProductFn {
  return async (productId, productName) => {
    const query = productName?.trim().slice(0, QUERY_MAX) ?? '';
    if (query.length < 2) {
      throw new ApiException('BAD_REQUEST', '이 쇼핑몰은 상품명으로만 다시 조회할 수 있습니다.');
    }
    const results = await SEARCH_ADAPTERS[provider](query, RESEARCH_LIMIT);
    return results.find((p) => p.externalId === productId) ?? notFound();
  };
}

export const PRODUCT_ADAPTERS: Record<SearchProviderId, FetchProductFn> = {
  daiso: byNameSearch('daiso'),
  oliveyoung: byNameSearch('oliveyoung'),
  kurly: byNameSearch('kurly'),
  bunjang: fetchBunjangProduct,
};

export const PRODUCT_PROVIDERS = SEARCH_PROVIDER_IDS;
