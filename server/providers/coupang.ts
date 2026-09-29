/**
 * 쿠팡 어댑터. 쿠팡 파트너스 Open API 상품 검색을 쓴다.
 *
 * - COUPANG_ACCESS_KEY / COUPANG_SECRET_KEY가 있으면 HMAC 서명으로 직접 호출한다.
 * - 없으면 k-skill-proxy(제3자 운영)가 대신 서명해 호출한다. 이때 링크의 제휴 수수료는 proxy 운영자에게 간다.
 *
 * 결과 링크는 전부 파트너스 제휴 링크라서 화면에 제휴 고지 문구를 함께 보여줘야 한다.
 */
import { createHmac } from 'node:crypto';
import type { ProductResult } from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { fetchJson } from '../http.js';

const LABEL = '쿠팡';
const OPEN_API_ORIGIN = 'https://api-gateway.coupang.com';
const OPEN_API_SEARCH_PATH = '/v2/providers/affiliate_open_api/apis/openapi/products/search';
const DEFAULT_PROXY_BASE_URL = 'https://k-skill-proxy.nomadamas.org';
const PROXY_SEARCH_PATH = '/v1/coupang/products/search';
/** 파트너스 검색 API가 허용하는 최대 결과 수 */
const MAX_LIMIT = 10;

/** 공통 형태로 맞춘 쿠팡 상품 (직접 호출·proxy 응답 모두 이 형태로 바꾼다) */
interface CoupangItem {
  productId?: string | number;
  title?: string;
  price?: number;
  url?: string;
  imageUrl?: string;
  isRocket?: boolean;
  isFreeShipping?: boolean;
}

interface RawProxyResponse {
  items?: {
    product_id?: string | number;
    title?: string;
    price?: number;
    url?: string;
    image_url?: string;
    is_rocket?: boolean;
    is_free_shipping?: boolean;
  }[];
}

interface RawOpenApiResponse {
  rCode?: string;
  rMessage?: string;
  data?: {
    productData?: {
      productId?: number;
      productName?: string;
      productPrice?: number;
      productImage?: string;
      productUrl?: string;
      isRocket?: boolean;
      isFreeShipping?: boolean;
    }[];
  };
}

/**
 * 상품번호만으로는 옵션(판매처)이 다른 상품이 겹쳐서, 링크의 vendorItemId까지 붙여 구분한다.
 * 예: 8234329353 아래에 서로 다른 청소기 두 개가 검색된다.
 */
export function coupangExternalId(productId: string, url?: string): string {
  const vendorItemId = url?.match(/[?&]vendorItemId=(\d+)/)?.[1];
  return vendorItemId ? `${productId}-${vendorItemId}` : productId;
}

export function toProductResults(items: CoupangItem[]): ProductResult[] {
  const seen = new Set<string>();
  const results: ProductResult[] = [];
  for (const item of items) {
    if (item.productId == null || !item.url) continue;
    const externalId = coupangExternalId(String(item.productId), item.url);
    if (seen.has(externalId)) continue;
    seen.add(externalId);
    const badges: string[] = [];
    if (item.isRocket) badges.push('로켓배송');
    if (item.isFreeShipping) badges.push('무료배송');
    results.push({
      provider: 'coupang',
      externalId,
      name: item.title ?? '',
      price: typeof item.price === 'number' ? item.price : undefined,
      url: item.url,
      imageUrl: item.imageUrl,
      badges,
    });
  }
  return results;
}

export function parseProxyProducts(body: RawProxyResponse): ProductResult[] {
  return toProductResults(
    (body.items ?? []).map((p) => ({
      productId: p.product_id,
      title: p.title,
      price: p.price,
      url: p.url,
      imageUrl: p.image_url,
      isRocket: p.is_rocket,
      isFreeShipping: p.is_free_shipping,
    })),
  );
}

export function parseOpenApiProducts(body: RawOpenApiResponse): ProductResult[] {
  if (body.rCode != null && body.rCode !== '0') {
    throw new ApiException('UPSTREAM_ERROR', `쿠팡 파트너스 API 오류입니다. (${body.rMessage ?? body.rCode})`);
  }
  return toProductResults(
    (body.data?.productData ?? []).map((p) => ({
      productId: p.productId,
      title: p.productName,
      price: p.productPrice,
      url: p.productUrl,
      imageUrl: p.productImage,
      isRocket: p.isRocket,
      isFreeShipping: p.isFreeShipping,
    })),
  );
}

/**
 * 담아둔 상품을 다시 찾을 때 쓸 검색어. 쿠팡 검색은 상품명 전체(옵션·기호 포함)로 찾으면 0건이 나와서
 * 첫 쉼표 뒤의 옵션(색상·모델명)을 떼고 기호를 공백으로 바꾼다.
 * 예: '홈리아 BLDC 무선 청소기 + UV C 살균 침구 브러시, 화이트' → '홈리아 BLDC 무선 청소기 UV C 살균 침구 브러시'
 */
export function coupangRefetchQuery(name: string): string {
  return name
    .split(',')[0]
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/** 서명 시각 형식: yyMMdd'T'HHmmss'Z' (UTC) */
export function signedDate(now: Date): string {
  return now.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '').slice(2);
}

/** 쿠팡 파트너스 Open API Authorization 헤더 (CEA HmacSHA256) */
export function coupangAuthorization(
  method: string,
  path: string,
  query: string,
  accessKey: string,
  secretKey: string,
  now = new Date(),
): string {
  const datetime = signedDate(now);
  const signature = createHmac('sha256', secretKey).update(`${datetime}${method}${path}${query}`).digest('hex');
  return `CEA algorithm=HmacSHA256, access-key=${accessKey}, signed-date=${datetime}, signature=${signature}`;
}

export async function searchCoupangProducts(
  query: string,
  limit: number,
  env: NodeJS.ProcessEnv = process.env,
): Promise<ProductResult[]> {
  const params = new URLSearchParams({ keyword: query, limit: String(Math.min(limit, MAX_LIMIT)) });
  const accessKey = env.COUPANG_ACCESS_KEY?.trim();
  const secretKey = env.COUPANG_SECRET_KEY?.trim();

  if (accessKey && secretKey) {
    const search = params.toString();
    const body = await fetchJson<RawOpenApiResponse>(`${OPEN_API_ORIGIN}${OPEN_API_SEARCH_PATH}?${search}`, {
      label: LABEL,
      headers: { Authorization: coupangAuthorization('GET', OPEN_API_SEARCH_PATH, search, accessKey, secretKey) },
    });
    return parseOpenApiProducts(body);
  }

  const base = (env.KSKILL_PROXY_BASE_URL?.trim() || DEFAULT_PROXY_BASE_URL).replace(/\/+$/, '');
  params.set('subId', 'zam-list-app');
  const body = await fetchJson<RawProxyResponse>(`${base}${PROXY_SEARCH_PATH}?${params}`, { label: LABEL });
  return parseProxyProducts(body);
}
