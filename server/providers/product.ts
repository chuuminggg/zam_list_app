/**
 * 담아둔 항목을 다시 조회해 가격·품절 상태를 확인하는 어댑터.
 *
 * 공급자마다 방식이 다르다.
 * - 번개장터: 상품 상세 API가 열려 있어 판매완료 상품도 그대로 조회된다.
 * - 오늘의집: 상품 페이지가 서버 렌더링되지 않아, 지금의 오늘의딜 목록에서 같은 상품을 찾는다.
 * - 나머지: 단건 조회 엔드포인트가 없거나 막혀 있어(마켓컬리 상세는 404/500),
 *   담을 때 저장해 둔 상품명으로 다시 검색해 같은 상품번호를 찾는다.
 */
import {
  SOURCE_PROVIDER_IDS,
  type ProductResult,
  type SearchProviderId,
  type SourceProviderId,
} from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { fetchBunjangProduct } from './bunjang.js';
import { coupangRefetchQuery } from './coupang.js';
import { getDeals } from './deals.js';
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

/** 상품명으로 다시 검색해 같은 상품번호를 찾는다. toQuery로 검색어를 공급자에 맞게 다듬을 수 있다. */
function byNameSearch(provider: SearchProviderId, toQuery: (name: string) => string = (name) => name): FetchProductFn {
  return async (productId, productName) => {
    const query = toQuery(productName?.trim() ?? '').slice(0, QUERY_MAX);
    if (query.length < 2) {
      throw new ApiException('BAD_REQUEST', '이 쇼핑몰은 상품명으로만 다시 조회할 수 있습니다.');
    }
    const results = await SEARCH_ADAPTERS[provider](query, RESEARCH_LIMIT);
    return results.find((p) => p.externalId === productId) ?? notFound();
  };
}

/** 오늘의딜 목록에서 같은 상품을 찾는다. 특가가 끝나 목록에서 빠지면 다시 확인할 수 없다. */
async function fromOhouDeals(productId: string): Promise<ProductResult> {
  const deals = await getDeals('ohou');
  const found = deals.find((p) => p.externalId === productId);
  if (found) return found;
  throw new ApiException(
    'NOT_FOUND',
    '오늘의딜 목록에서 내려간 상품이라 다시 확인할 수 없어요. 특가가 끝났을 수 있습니다.',
  );
}

export const PRODUCT_ADAPTERS: Record<SourceProviderId, FetchProductFn> = {
  daiso: byNameSearch('daiso'),
  oliveyoung: byNameSearch('oliveyoung'),
  kurly: byNameSearch('kurly'),
  bunjang: fetchBunjangProduct,
  coupang: byNameSearch('coupang', coupangRefetchQuery),
  ohou: fromOhouDeals,
};

export const PRODUCT_PROVIDERS = SOURCE_PROVIDER_IDS;
