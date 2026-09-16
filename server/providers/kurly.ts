/**
 * 마켓컬리 어댑터. 공개 검색 API(api.kurly.com)를 그대로 호출한다.
 */
import type { ProductResult } from '../../shared/api.js';
import { fetchJson } from '../http.js';

const SEARCH_URL = 'https://api.kurly.com/search/v4/sites/market/normal-search';
const PRODUCT_PAGE = 'https://www.kurly.com/goods/';
const LABEL = '마켓컬리';

interface RawProduct {
  no?: number;
  name?: string;
  listImageUrl?: string;
  salesPrice?: number;
  discountedPrice?: number | null;
  discountRate?: number;
  isSoldOut?: boolean;
  deliveryTypeNames?: string[];
  tags?: { name?: string; type?: string }[];
}

interface RawSearchResponse {
  data?: {
    listSections?: { view?: { sectionCode?: string }; data?: { items?: RawProduct[] } }[];
  };
}

export function parseKurlyProducts(body: RawSearchResponse): ProductResult[] {
  const section = body.data?.listSections?.find((s) => s.view?.sectionCode === 'PRODUCT_LIST');
  return (section?.data?.items ?? [])
    .filter((p) => p.no != null)
    .map((p) => {
      const price = p.discountedPrice ?? p.salesPrice;
      const badges: string[] = [];
      if (p.discountRate) badges.push(`${Math.round(p.discountRate)}% 할인`);
      // '샛별배송' 등 배송 방식
      badges.push(...(p.deliveryTypeNames ?? []));
      if (p.tags?.some((t) => t.type === 'KURLY_ONLY')) badges.push('컬리 온리');
      if (p.isSoldOut) badges.push('품절');
      return {
        provider: 'kurly',
        externalId: String(p.no),
        name: p.name ?? '',
        price: price ?? undefined,
        url: `${PRODUCT_PAGE}${p.no}`,
        imageUrl: p.listImageUrl,
        soldOut: Boolean(p.isSoldOut),
        badges,
      };
    });
}

export async function searchKurlyProducts(query: string, limit: number): Promise<ProductResult[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('keyword', query);
  url.searchParams.set('page', '1');
  url.searchParams.set('per_page', String(limit));
  url.searchParams.set('sort_type', '1');
  url.searchParams.set('filters', '');
  return parseKurlyProducts(await fetchJson<RawSearchResponse>(url.toString(), { label: LABEL }));
}
