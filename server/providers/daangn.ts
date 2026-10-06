/**
 * 당근 중고거래 어댑터. 공개 웹 페이지의 Remix `_data` JSON만 읽고, 채팅·찜·거래 제안 같은 쓰기 동작은 하지 않는다.
 *
 * - 지역: `/kr/api/v1/regions/keyword` 로 동네 이름 → 내부 지역 id
 * - 검색: `/kr/search/buy-sell/?in=<동네>-<id>&q=<검색어>` 의 `_data` (2026-10 기준. 예전 `/kr/buy-sell/all/` 라우트는 막힘)
 * - 상세: `/kr/buy-sell/<nodeId>/` 의 `_data` — 판매 상태(판매중·예약중·거래완료)까지 확인된다
 *
 * 검색은 짧은 시간에 여러 번 부르면 오류 없이 빈 목록만 내려오는 경우가 있다. 우회하지 않고 안내만 한다.
 * 결과는 가까운 매물만 오지 않고 다른 지역 매물이 섞여서, 검색한 동네 중심에서의 거리를 배지로 붙인다.
 */
import type { ProductResult } from '../../shared/api.js';
import { cached } from '../cache/cache.js';
import { ApiException } from '../errors.js';
import { fetchJson } from '../http.js';

const LABEL = '당근';
const ORIGIN = 'https://www.daangn.com';
const REGION_URL = `${ORIGIN}/kr/api/v1/regions/keyword`;
const SEARCH_PATH = '/kr/search/buy-sell/';
const SEARCH_ROUTE = 'routes/kr.search.buy-sell._index';
const DETAIL_ROUTE = 'routes/kr.buy-sell.$buy_sell_id';
const USER_AGENT = 'zam-list-app/1.0 (+https://github.com/chuuminggg/zam_list_app)';
/** 동네 이름 → id 는 잘 바뀌지 않아 하루 동안 보관한다 */
const REGION_CACHE_SECONDS = 60 * 60 * 24;

const HEADERS = { 'User-Agent': USER_AGENT, Accept: 'application/json' };

/** 판매 상태. 알 수 없는 값은 배지를 붙이지 않는다. */
const STATUS_LABEL: Record<string, string> = {
  Ongoing: '판매중',
  Reserved: '예약중',
  Closed: '거래완료',
};

export interface DaangnRegion {
  id: number;
  name: string;
  name1?: string;
  name2?: string;
  name3?: string;
  depth?: number;
}

interface Coordinate {
  lat: number;
  lng: number;
}

interface RawArticle {
  id?: string;
  href?: string;
  title?: string;
  price?: string;
  thumbnail?: string;
  status?: string;
  region?: { name?: string };
  boostedAt?: string;
  createdAt?: string;
  tradingCoordinates?: { latitude?: number; longitude?: number }[];
}

interface RawSearchResponse {
  searchRegion?: { id?: string; name?: string };
  buySellArticles?: RawArticle[];
  regionCenterCoordinate?: Coordinate;
}

interface RawDetailResponse {
  product?: {
    nodeId?: string;
    href?: string;
    title?: string;
    images?: string[];
    price?: string;
    status?: string;
    region?: { name?: string };
  };
}

/**
 * 같은 이름의 동네가 여러 곳이면 k-skill과 같은 순서로 고른다:
 * 이름이 정확히 같은 곳 → 서울의 동(depth 3) → 첫 후보.
 */
export function pickRegion(keyword: string, locations: DaangnRegion[]): DaangnRegion | undefined {
  const exact = locations.filter((l) => [l.name, l.name1, l.name2, l.name3].includes(keyword));
  const candidates = exact.length > 0 ? exact : locations;
  return candidates.find((l) => l.name1 === '서울특별시' && l.depth === 3) ?? candidates[0];
}

export async function resolveDaangnRegion(keyword: string): Promise<DaangnRegion> {
  const region = await cached(`daangn:region:${keyword}`, REGION_CACHE_SECONDS, async () => {
    const url = `${REGION_URL}?keyword=${encodeURIComponent(keyword)}`;
    const body = await fetchJson<{ locations?: DaangnRegion[] }>(url, { label: LABEL, headers: HEADERS });
    return pickRegion(keyword, body.locations ?? []) ?? null;
  });
  if (!region) throw new ApiException('NOT_FOUND', `당근에서 '${keyword}' 동네를 찾지 못했습니다.`);
  return region;
}

/** 상품 링크 끝의 짧은 id. 예: /kr/buy-sell/apple-ipad-...-z2625h83h3nf/ → z2625h83h3nf */
export function daangnNodeId(href?: string): string | undefined {
  const slug = href?.split('?')[0].replace(/\/+$/, '').split('/').pop();
  const id = slug?.split('-').pop();
  return id && /^[a-z0-9]+$/i.test(id) ? id : undefined;
}

/** "25.0", "200000" 처럼 문자열로 오는 가격. 판매자가 쓴 숫자 그대로라 단위는 바꾸지 않는다. */
export function parseDaangnPrice(value?: string): number | undefined {
  const n = Number.parseFloat(value ?? '');
  return Number.isFinite(n) ? Math.round(n) : undefined;
}

/** 두 좌표 사이 거리(km, 하버사인) */
export function distanceKm(a: Coordinate, b: Coordinate): number {
  const rad = (deg: number) => (deg * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.sqrt(h));
}

const formatDistance = (km: number) => (km < 10 ? `${km.toFixed(1)}km` : `${Math.round(km)}km`);

function statusBadges(status?: string, price?: number): string[] {
  const badges: string[] = [];
  const label = status ? STATUS_LABEL[status] : undefined;
  if (label) badges.push(label);
  if (price === 0) badges.push('나눔');
  return badges;
}

const absoluteUrl = (href: string) => (href.startsWith('http') ? href : `${ORIGIN}${href}`);

export function parseDaangnSearch(body: RawSearchResponse, limit: number): ProductResult[] {
  const center = body.regionCenterCoordinate;
  const results: ProductResult[] = [];
  const seen = new Set<string>();
  for (const article of body.buySellArticles ?? []) {
    const href = article.href ?? article.id;
    const externalId = daangnNodeId(href);
    if (!href || !externalId || seen.has(externalId)) continue;
    seen.add(externalId);

    const price = parseDaangnPrice(article.price);
    const badges = statusBadges(article.status, price);
    if (article.region?.name) badges.push(article.region.name);
    const spot = article.tradingCoordinates?.[0];
    if (center && spot?.latitude != null && spot.longitude != null) {
      badges.push(formatDistance(distanceKm(center, { lat: spot.latitude, lng: spot.longitude })));
    }
    if (article.boostedAt && article.createdAt && article.boostedAt.slice(0, 16) !== article.createdAt.slice(0, 16)) {
      badges.push('끌올');
    }

    results.push({
      provider: 'daangn',
      externalId,
      name: article.title ?? '',
      price,
      url: absoluteUrl(href),
      imageUrl: article.thumbnail,
      soldOut: article.status === 'Closed',
      badges,
    });
    if (results.length >= limit) break;
  }
  return results;
}

export function parseDaangnDetail(body: RawDetailResponse): ProductResult {
  const product = body.product;
  const externalId = product?.nodeId ?? daangnNodeId(product?.href);
  if (!product || !externalId) {
    throw new ApiException('PARSE_ERROR', '당근 상품 응답 형식이 바뀌었습니다.');
  }
  const price = parseDaangnPrice(product.price);
  const badges = statusBadges(product.status, price);
  if (product.region?.name) badges.push(product.region.name);
  return {
    provider: 'daangn',
    externalId,
    name: product.title ?? '',
    price,
    url: product.href ? absoluteUrl(product.href) : `${ORIGIN}/kr/buy-sell/${externalId}/`,
    imageUrl: product.images?.[0],
    soldOut: product.status === 'Closed',
    badges,
  };
}

/** 동네 이름은 필수다. IP 기반 기본 위치에 기대지 않는다. */
export async function searchDaangnProducts(query: string, limit: number, region?: string): Promise<ProductResult[]> {
  const regionName = region?.trim();
  if (!regionName) {
    throw new ApiException('BAD_REQUEST', '당근은 동네 이름이 필요해요. (예: 합정동)');
  }
  const resolved = await resolveDaangnRegion(regionName);
  const params = new URLSearchParams({ in: `${resolved.name}-${resolved.id}`, q: query, _data: SEARCH_ROUTE });
  const body = await fetchJson<RawSearchResponse>(`${ORIGIN}${SEARCH_PATH}?${params}`, { label: LABEL, headers: HEADERS });
  return parseDaangnSearch(body, limit);
}

/** 상품 하나를 다시 조회한다. 거래완료된 글도 상세로는 조회된다. */
export async function fetchDaangnProduct(productId: string): Promise<ProductResult> {
  const url = `${ORIGIN}/kr/buy-sell/${encodeURIComponent(productId)}/?_data=${encodeURIComponent(DETAIL_ROUTE)}`;
  return parseDaangnDetail(await fetchJson<RawDetailResponse>(url, { label: LABEL, headers: HEADERS }));
}
