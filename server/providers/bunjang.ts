/**
 * 번개장터 어댑터. 공개 검색 API만 사용하며 찜·채팅 등 쓰기 동작은 제공하지 않는다.
 */
import type { ProductResult } from '../../shared/api.js';
import { fetchJson } from '../http.js';

const SEARCH_URL = 'https://api.bunjang.co.kr/api/1/find_v2.json';
const PRODUCT_PAGE = 'https://m.bunjang.co.kr/products/';
const LABEL = '번개장터';

/** 판매 상태 코드 (알 수 없는 값은 배지를 붙이지 않는다) */
const STATUS_LABEL: Record<string, string> = {
  '0': '판매중',
  '1': '예약중',
  '3': '판매완료',
};

interface RawProduct {
  pid?: string;
  name?: string;
  price?: string;
  product_image?: string;
  status?: string;
  location?: string;
  free_shipping?: boolean;
  ad?: boolean;
}

interface RawSearchResponse {
  list?: RawProduct[];
}

/** 이미지 URL에 들어 있는 {cnt}/{res} 치환자를 실제 값으로 바꾼다. */
export function resolveBunjangImage(template?: string): string | undefined {
  if (!template) return undefined;
  return template.replace('{cnt}', '0').replace('{res}', '300');
}

export function parseBunjangProducts(body: RawSearchResponse): ProductResult[] {
  return (body.list ?? [])
    .filter((p) => p.pid)
    .map((p) => {
      const price = Number.parseInt(p.price ?? '', 10);
      const statusLabel = p.status ? STATUS_LABEL[p.status] : undefined;
      const badges: string[] = [];
      if (p.ad) badges.push('광고');
      if (statusLabel) badges.push(statusLabel);
      if (p.free_shipping) badges.push('무료배송');
      if (p.location) badges.push(p.location);
      return {
        provider: 'bunjang',
        externalId: p.pid!,
        name: p.name ?? '',
        price: Number.isNaN(price) ? undefined : price,
        url: `${PRODUCT_PAGE}${encodeURIComponent(p.pid!)}`,
        imageUrl: resolveBunjangImage(p.product_image),
        soldOut: p.status === '3',
        badges,
      };
    });
}

export async function searchBunjangProducts(query: string, limit: number): Promise<ProductResult[]> {
  const url = new URL(SEARCH_URL);
  url.searchParams.set('q', query);
  url.searchParams.set('order', 'score');
  url.searchParams.set('page', '0');
  url.searchParams.set('n', String(limit));
  url.searchParams.set('stat_device', 'w');
  url.searchParams.set('req_ref', 'search');
  return parseBunjangProducts(await fetchJson<RawSearchResponse>(url.toString(), { label: LABEL }));
}
