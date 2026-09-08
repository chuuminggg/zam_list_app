/**
 * 올리브영 어댑터.
 * 올리브영 내부 API는 봇 차단이 있어 Zyte Extract API를 경유한다 (ZYTE_API_KEY 필요).
 * 엔드포인트·필드는 daiso-mcp(MIT, github.com/hmmhmmhm/daiso-mcp) 참고.
 */
import type { ProductResult, StockResult, StoreResult, StoreStock } from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { fetchJson } from '../http.js';

const BASE_URL = 'https://www.oliveyoung.co.kr';
const PATH = {
  PRODUCTS: '/oystore/api/stock/product-search-v3',
  GOODS_INFO: '/oystore/api/stock/stock-goods-info-v3',
  STOCK_STORES: '/oystore/api/stock/stock-stores',
};
const ZYTE_ENDPOINT = 'https://api.zyte.com/v1/extract';
const IMAGE_HOST = 'https://image.oliveyoung.co.kr';
const IMAGE_PREFIX = '/uploads/images/goods';
const PRODUCT_PAGE = `${BASE_URL}/store/goods/getGoodsDetail.do?goodsNo=`;
/** 좌표는 필수값이지만 매장명 검색(searchWords)으로 거르므로 서울시청 고정 */
const DEFAULT_COORDS = { lat: 37.5665, lon: 126.978 };
const TIMEOUT_MS = 15000;

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
  const list = data.serachList ?? data.searchList ?? [];
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

// ---- 호출 ----

interface ZyteResult {
  statusCode?: number;
  httpResponseBody?: string;
}

async function oliveyoungApi<T>(path: string, payload: unknown): Promise<T> {
  const apiKey = process.env.ZYTE_API_KEY;
  if (!apiKey) throw new ApiException('NOT_CONFIGURED', '올리브영 연동에는 ZYTE_API_KEY가 필요합니다.');

  const result = await fetchJson<ZyteResult>(ZYTE_ENDPOINT, {
    label: 'Zyte API',
    timeoutMs: TIMEOUT_MS,
    method: 'POST',
    headers: {
      Authorization: `Basic ${Buffer.from(`${apiKey}:`).toString('base64')}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: `${BASE_URL}${path}`,
      httpRequestMethod: 'POST',
      customHttpRequestHeaders: [
        { name: 'Content-Type', value: 'application/json' },
        { name: 'Accept', value: 'application/json' },
        { name: 'X-Requested-With', value: 'XMLHttpRequest' },
      ],
      httpRequestText: JSON.stringify(payload),
      httpResponseBody: true,
    }),
  });

  if (result.statusCode !== 200 || !result.httpResponseBody) {
    throw new ApiException('UPSTREAM_ERROR', `올리브영 응답 오류입니다. (${result.statusCode ?? 'unknown'})`);
  }
  let body: OyEnvelope<T>;
  try {
    body = JSON.parse(Buffer.from(result.httpResponseBody, 'base64').toString('utf8'));
  } catch {
    throw new ApiException('PARSE_ERROR', '올리브영 응답을 해석할 수 없습니다.');
  }
  if (body.status !== 'SUCCESS' || !body.data) {
    throw new ApiException('UPSTREAM_ERROR', `올리브영 API 상태 오류입니다. (${body.status ?? 'UNKNOWN'})`);
  }
  return body.data;
}

export async function searchOliveyoungProducts(query: string, limit: number): Promise<ProductResult[]> {
  const data = await oliveyoungApi<Parameters<typeof parseOliveyoungProducts>[0]>(PATH.PRODUCTS, {
    includeSoldOut: true,
    keyword: query,
    page: 1,
    sort: '01',
    size: limit,
  });
  return parseOliveyoungProducts(data);
}

export async function checkOliveyoungStock(goodsNumber: string, storeKeyword: string, limit: number): Promise<StockResult> {
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
  return {
    provider: 'oliveyoung',
    productId: goodsNumber,
    checkedAt: new Date().toISOString(),
    stores: parseOliveyoungStockStores(data).slice(0, limit),
    notice: '올리브영 재고 수량은 실시간이 아닐 수 있습니다.',
  };
}
