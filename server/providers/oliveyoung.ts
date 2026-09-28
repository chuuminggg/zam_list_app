/**
 * 올리브영 어댑터.
 * 올리브영은 Vercel(AWS)에서 보내는 직접 요청을 403으로 막으므로
 * daiso-mcp(MIT, github.com/hmmhmmhm/daiso-mcp)의 호스팅 API(Cloudflare Workers)를 경유한다.
 */
import type { ProductResult, StockResult, StockStatus, StoreStock } from '../../shared/api.js';
import { ApiException } from '../errors.js';

const MCP_BASE_URL = 'https://mcp.aka.page';
const IMAGE_HOST = 'https://image.oliveyoung.co.kr';
const IMAGE_PREFIX = '/uploads/images/goods';
const PRODUCT_PAGE = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=';
const TIMEOUT_MS = 15000;
/** 다시 시도하기 전 기다리는 시간. 길이만큼 다시 시도한다 (최대 3번 호출). */
const RETRY_DELAYS_MS = [1000, 2000];
/** 호스팅 API의 IP별 일일 호출 한도 초과 코드. 다시 시도해도 풀리지 않는다. */
const DAILY_LIMIT_CODE = 'DAILY_RATE_LIMIT_EXCEEDED';

// ---- 원본 응답 타입 (사용하는 필드만) ----

interface McpEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
  /** 실패 시 호스팅 API가 붙여 주는 진단 정보 */
  diagnostics?: { retryable?: boolean };
}

interface RawProduct {
  goodsNumber?: string;
  goodsName?: string;
  imageUrl?: string;
  priceToPay?: number;
  discountRate?: number;
  o2oStockFlag?: boolean;
  o2oRemainQuantity?: number;
  /** 호스팅 API가 계산한 재고 여부 (전체 매장 기준, 매장별 재고를 확인했으면 주변 매장 기준) */
  inStock?: boolean;
  /** /inventory 응답에서 주변 매장 재고를 확인한 상품에만 붙는다 */
  storeInventory?: { stores?: RawStoreStock[] };
}

interface RawStoreStock {
  storeCode?: string;
  storeName?: string;
  address?: string;
  pickupYn?: boolean;
  stockStatus?: 'in_stock' | 'out_of_stock' | 'not_sold';
  /** '재고 3개', '재고 9개 이상', '품절', '미판매' */
  stockLabel?: string;
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

function isInStock(p: RawProduct): boolean {
  return p.inStock ?? (Boolean(p.o2oStockFlag) || (p.o2oRemainQuantity ?? 0) > 0);
}

export function parseOliveyoungProducts(data: { products?: RawProduct[] } = {}): ProductResult[] {
  return (data.products ?? [])
    .filter((p) => p.goodsNumber)
    .map((p) => {
      const inStock = isInStock(p);
      const badges: string[] = [];
      if (p.discountRate) badges.push(`${p.discountRate}% 할인`);
      if (!inStock) badges.push('매장 재고 없음');
      return {
        provider: 'oliveyoung',
        externalId: p.goodsNumber!,
        name: p.goodsName ?? '',
        price: p.priceToPay || undefined,
        url: `${PRODUCT_PAGE}${encodeURIComponent(p.goodsNumber!)}`,
        imageUrl: resolveImageUrl(p.imageUrl),
        soldOut: !inStock,
        badges,
      };
    });
}

const STORE_STATUS_LABEL: Record<NonNullable<RawStoreStock['stockStatus']>, string> = {
  in_stock: '재고 있음',
  out_of_stock: '품절',
  not_sold: '미판매',
};

export function parseOliveyoungStoreStocks(stores: RawStoreStock[] = []): StoreStock[] {
  return stores
    .filter((s) => s.storeCode)
    .map((s) => {
      const status: StockStatus = s.stockStatus ?? 'unknown';
      return {
        provider: 'oliveyoung',
        storeCode: s.storeCode!,
        name: s.storeName ?? '',
        address: s.address ?? '',
        pickup: Boolean(s.pickupYn),
        status,
        label: s.stockLabel || (s.stockStatus ? STORE_STATUS_LABEL[s.stockStatus] : '재고 확인 불가'),
      };
    });
}

/** 상품 검색 결과의 재고 여부를 매장별 재고 대신 쓸 요약으로 바꾼다. */
export function summarizeOliveyoungProductStock(product?: RawProduct): { status: StockStatus; label: string } {
  if (!product) return { status: 'unknown', label: '재고 확인 불가' };
  return isInStock(product)
    ? { status: 'in_stock', label: '매장 재고 있음' }
    : { status: 'out_of_stock', label: '매장 재고 없음' };
}

// ---- 호출 ----

type HostedAttempt<T> = { data: T } | { error: ApiException; retryable: boolean };

/**
 * 호스팅 API를 한 번 호출한다. 실패해도 JSON 본문에 이유(error.code, diagnostics.retryable)를
 * 담아 주므로 상태 코드와 상관없이 본문을 읽어 다시 시도할지 정한다.
 */
async function requestHosted<T>(url: string): Promise<HostedAttempt<T>> {
  let response: Response;
  try {
    response = await fetch(url, { headers: { Accept: 'application/json' }, signal: AbortSignal.timeout(TIMEOUT_MS) });
  } catch (error) {
    if (error instanceof Error && error.name === 'TimeoutError') {
      return { error: new ApiException('TIMEOUT', '올리브영 응답 시간이 초과되었습니다.'), retryable: false };
    }
    return { error: new ApiException('UPSTREAM_ERROR', '올리브영에 연결할 수 없습니다.'), retryable: true };
  }

  const body = (await response.json().catch(() => undefined)) as McpEnvelope<T> | undefined;
  if (response.ok && body?.success && body.data) return { data: body.data };

  const code = body?.error?.code;
  if (code === DAILY_LIMIT_CODE) {
    return {
      error: new ApiException('RATE_LIMITED', '올리브영 조회 한도를 초과했어요. 내일 다시 시도해 주세요.'),
      retryable: false,
    };
  }
  // 호스팅 서버의 올리브영 릴레이가 간헐적으로 막히면(429·500) 잠깐 뒤 다시 시도하면 풀린다.
  const retryable = body?.diagnostics?.retryable ?? (response.status >= 500 || response.status === 429);
  if (response.status === 403) {
    return { error: new ApiException('BLOCKED', '올리브영에서 요청을 차단했습니다. (403)'), retryable };
  }
  const reason = code ?? (response.ok ? 'UNKNOWN' : `HTTP ${response.status}`);
  return { error: new ApiException('UPSTREAM_ERROR', `올리브영 조회에 실패했습니다. (${reason})`), retryable };
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchHosted<T>(path: string, params: Record<string, string>): Promise<T> {
  const url = `${MCP_BASE_URL}/api/oliveyoung/${path}?${new URLSearchParams(params)}`;
  // 성공한 검색어는 호스팅 서버에 5분간 캐시되므로, 처음 찾는 검색어일수록 일시적 차단을 만나기 쉽다.
  for (let attempt = 0; ; attempt++) {
    const result = await requestHosted<T>(url);
    if ('data' in result) return result.data;
    if (!result.retryable || attempt >= RETRY_DELAYS_MS.length) throw result.error;
    await sleep(RETRY_DELAYS_MS[attempt]);
  }
}

async function fetchProducts(keyword: string, size: number): Promise<RawProduct[]> {
  const data = await fetchHosted<{ products?: RawProduct[] }>('products', {
    keyword,
    size: String(size),
    includeSoldOut: 'true',
  });
  return data.products ?? [];
}

export async function searchOliveyoungProducts(query: string, limit: number): Promise<ProductResult[]> {
  return parseOliveyoungProducts({ products: await fetchProducts(query, limit) });
}

/** 상품번호로는 검색되지 않아 상품명으로 다시 찾는다. 호스팅 API는 검색 결과 앞 5개까지만 매장 재고를 확인한다. */
const INVENTORY_SEARCH_SIZE = 10;
const INVENTORY_STOCK_CHECK_LIMIT = 5;
const FALLBACK_NOTICE = '이 상품의 매장별 재고를 지금은 확인할 수 없어 전체 매장 기준 재고 여부만 보여드려요.';

/**
 * 상품명과 매장 검색어로 호스팅 API의 /inventory를 불러 같은 상품번호의 주변 매장 재고를 보여준다.
 * 매장별 재고를 못 구하면(검색 순위 밖, 릴레이 실패) 전체 매장 기준 재고 여부로 대신한다.
 */
export async function checkOliveyoungStock(
  goodsNumber: string,
  storeKeyword: string,
  limit: number,
  productName?: string,
): Promise<StockResult> {
  const base = { provider: 'oliveyoung' as const, productId: goodsNumber, checkedAt: new Date().toISOString() };
  const fallback = (product?: RawProduct): StockResult => ({
    ...base,
    stores: [],
    summary: summarizeOliveyoungProductStock(product),
    notice: FALLBACK_NOTICE,
  });
  if (!productName) return fallback();

  let product: RawProduct | undefined;
  try {
    const data = await fetchHosted<{ inventory?: { products?: RawProduct[] } }>('inventory', {
      keyword: productName,
      storeKeyword,
      size: String(INVENTORY_SEARCH_SIZE),
      includeSoldOut: 'true',
      stockCheckLimit: String(INVENTORY_STOCK_CHECK_LIMIT),
    });
    product = data.inventory?.products?.find((p) => p.goodsNumber === goodsNumber);
  } catch {
    // 매장 재고 조회가 막혀도 상품 검색은 될 수 있으니 전체 매장 기준으로 다시 확인한다.
    try {
      product = (await fetchProducts(productName, INVENTORY_SEARCH_SIZE)).find((p) => p.goodsNumber === goodsNumber);
    } catch {
      // 확인 불가로 표시한다.
    }
    return fallback(product);
  }

  if (!product?.storeInventory) return fallback(product);
  return { ...base, stores: parseOliveyoungStoreStocks(product.storeInventory.stores).slice(0, limit) };
}
