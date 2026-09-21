/**
 * 올리브영 어댑터.
 * 공식 내부 API를 브라우저 헤더와 함께 직접 호출한다 (키 불필요, 간헐적 403 있음).
 * 엔드포인트·필드·헤더는 daiso-mcp(MIT, github.com/hmmhmmhm/daiso-mcp) PR #191 참고.
 */
import type { ProductResult, StockResult, StockStatus, StoreResult, StoreStock } from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { fetchJson } from '../http.js';

const BASE_URL = 'https://www.oliveyoung.co.kr';
const PATH = {
  PRODUCTS: '/oystore/api/stock/product-search-v3',
  GOODS_INFO: '/oystore/api/stock/stock-goods-info-v3',
  STOCK_STORES: '/oystore/api/stock/stock-stores',
};
const IMAGE_HOST = 'https://image.oliveyoung.co.kr';
const IMAGE_PREFIX = '/uploads/images/goods';
const PRODUCT_PAGE = `${BASE_URL}/store/goods/getGoodsDetail.do?goodsNo=`;
/** 좌표는 필수값이지만 매장명 검색(searchWords)으로 거르므로 서울시청 고정 */
const DEFAULT_COORDS = { lat: 37.5665, lon: 126.978 };
const TIMEOUT_MS = 15000;
/** 봇 차단을 통과하는 데 필요한 헤더 조합 (daiso-mcp 원격 검증 기준) */
const OY_HEADERS = {
  'Content-Type': 'application/json',
  Accept: 'application/json',
  'X-Requested-With': 'XMLHttpRequest',
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/153.0.0.0 Safari/537.36',
  Origin: BASE_URL,
  Referer: `${BASE_URL}/`,
  'Accept-Language': 'ko-KR,ko;q=0.9',
};

// ---- 원본 응답 타입 (사용하는 필드만) ----

interface OyEnvelope<T> {
  status?: string;
  data?: T;
}

interface RawProduct {
  goodsNumber?: string;
  goodsName?: string;
  imagePath?: string;
  priceToPay?: number;
  originalPrice?: number;
  discountRate?: number;
  o2oStockFlag?: boolean;
  o2oRemainQuantity?: number;
}

interface RawStore {
  storeCode?: string;
  storeName?: string;
  address?: string;
  pickupYn?: boolean;
}

interface RawStockStore extends RawStore {
  salesStoreYn?: boolean;
  remainQuantity?: number;
  o2oRemainQuantity?: number;
}

// ---- 파서 (fixture 테스트 대상) ----

export function resolveImageUrl(path?: string): string | undefined {
  if (!path) return undefined;
  if (/^https?:\/\//i.test(path)) return path;
  if (path.startsWith('//')) return `https:${path}`;
  const normalized = path.startsWith('/') ? path : `/${path}`;
  return normalized.startsWith(`${IMAGE_PREFIX}/`)
    ? `${IMAGE_HOST}${normalized}`
    : `${IMAGE_HOST}${IMAGE_PREFIX}${normalized}`;
}

export function parseOliveyoungProducts(data: { serachList?: RawProduct[]; searchList?: RawProduct[] } = {}): ProductResult[] {
  // 원본 API 필드명 오타(serachList)를 그대로 따른다.
  const list = data?.serachList ?? data?.searchList ?? [];
  return list
    .filter((p) => p.goodsNumber)
    .map((p) => {
      const inStock = Boolean(p.o2oStockFlag) || (p.o2oRemainQuantity ?? 0) > 0;
      const badges: string[] = [];
      if (p.discountRate) badges.push(`${p.discountRate}% 할인`);
      if (!inStock) badges.push('매장 재고 없음');
      return {
        provider: 'oliveyoung',
        externalId: p.goodsNumber!,
        name: p.goodsName ?? '',
        price: p.priceToPay || undefined,
        url: `${PRODUCT_PAGE}${encodeURIComponent(p.goodsNumber!)}`,
        imageUrl: resolveImageUrl(p.imagePath),
        soldOut: !inStock,
        badges,
      };
    });
}

function toStore(s: RawStore): StoreResult {
  return {
    provider: 'oliveyoung',
    storeCode: s.storeCode ?? '',
    name: s.storeName ?? '',
    address: s.address ?? '',
    pickup: Boolean(s.pickupYn),
  };
}

export function parseOliveyoungStockStores(data: { storeList?: RawStockStore[] } = {}): StoreStock[] {
  return (data.storeList ?? []).map((s) => {
    const store = toStore(s);
    const quantity = Math.max(s.remainQuantity ?? 0, s.o2oRemainQuantity ?? 0);
    if (!s.salesStoreYn) return { ...store, status: 'not_sold', label: '미판매' };
    if (quantity <= 0) return { ...store, status: 'out_of_stock', label: '품절' };
    return { ...store, status: 'in_stock', label: quantity >= 9 ? '재고 9개 이상' : `재고 ${quantity}개` };
  });
}

/** 상품 검색 결과의 o2o 재고 표시를 매장별 재고 대신 쓸 요약으로 바꾼다. */
export function summarizeOliveyoungProductStock(product?: RawProduct): { status: StockStatus; label: string } {
  if (!product) return { status: 'unknown', label: '재고 확인 불가' };
  const inStock = Boolean(product.o2oStockFlag) || (product.o2oRemainQuantity ?? 0) > 0;
  return inStock ? { status: 'in_stock', label: '매장 재고 있음' } : { status: 'out_of_stock', label: '매장 재고 없음' };
}

// ---- 호출 ----

async function oliveyoungApi<T>(path: string, payload: unknown): Promise<T> {
  const body = await fetchJson<OyEnvelope<T>>(`${BASE_URL}${path}`, {
    label: '올리브영',
    timeoutMs: TIMEOUT_MS,
    method: 'POST',
    // 리다이렉트는 따라가지 않는다. 3xx는 ok가 아니므로 오류로 처리된다.
    redirect: 'manual',
    headers: OY_HEADERS,
    body: JSON.stringify(payload),
  });
  if (body.status !== 'SUCCESS' || !body.data) {
    throw new ApiException('UPSTREAM_ERROR', `올리브영 API 상태 오류입니다. (${body.status ?? 'UNKNOWN'})`);
  }
  return body.data;
}

async function fetchProducts(keyword: string, size: number) {
  return oliveyoungApi<Parameters<typeof parseOliveyoungProducts>[0]>(PATH.PRODUCTS, {
    includeSoldOut: true,
    keyword,
    page: 1,
    sort: '01',
    size,
  });
}

export async function searchOliveyoungProducts(query: string, limit: number): Promise<ProductResult[]> {
  return parseOliveyoungProducts(await fetchProducts(query, limit));
}

async function checkStoreStock(goodsNumber: string, storeKeyword: string, limit: number): Promise<StoreStock[]> {
  // 재고 API는 상품번호(goodsNo)가 아니라 대표 상품번호(masterGoodsNumber)를 받는다.
  const info = await oliveyoungApi<{ goodsInfo?: { masterGoodsNumber?: string } }>(PATH.GOODS_INFO, {
    goodsNo: goodsNumber,
  });
  const productId = info.goodsInfo?.masterGoodsNumber;
  if (!productId) throw new ApiException('NOT_FOUND', '올리브영에서 상품 정보를 찾을 수 없습니다.');

  const data = await oliveyoungApi<{ storeList?: RawStockStore[] }>(PATH.STOCK_STORES, {
    productId,
    ...DEFAULT_COORDS,
    mapLat: DEFAULT_COORDS.lat,
    mapLon: DEFAULT_COORDS.lon,
    pageIdx: 1,
    searchWords: storeKeyword,
  });
  return parseOliveyoungStockStores(data).slice(0, limit);
}

/** 매장별 재고 조회가 막혔을 때 상품 검색의 o2o 재고 여부로 대신 표시한다. */
async function fallbackStock(goodsNumber: string): Promise<StockResult> {
  let summary: { status: StockStatus; label: string };
  try {
    const data = await fetchProducts(goodsNumber, 5);
    const list = data?.serachList ?? data?.searchList ?? [];
    summary = summarizeOliveyoungProductStock(list.find((p) => p.goodsNumber === goodsNumber));
  } catch {
    summary = summarizeOliveyoungProductStock(undefined);
  }
  return {
    provider: 'oliveyoung',
    productId: goodsNumber,
    checkedAt: new Date().toISOString(),
    stores: [],
    summary,
    notice: '올리브영 매장별 재고를 지금은 확인할 수 없어 전체 매장 기준 재고 여부만 보여드려요.',
  };
}

export async function checkOliveyoungStock(goodsNumber: string, storeKeyword: string, limit: number): Promise<StockResult> {
  let stores: StoreStock[];
  try {
    stores = await checkStoreStock(goodsNumber, storeKeyword, limit);
  } catch (error) {
    // 상품 상세(stock-goods-info-v3)는 직접 요청에서 403이 잦다.
    if (error instanceof ApiException && error.code !== 'NOT_FOUND') return fallbackStock(goodsNumber);
    throw error;
  }
  return {
    provider: 'oliveyoung',
    productId: goodsNumber,
    checkedAt: new Date().toISOString(),
    stores,
    notice: '올리브영 재고 수량은 실시간이 아닐 수 있습니다.',
  };
}
