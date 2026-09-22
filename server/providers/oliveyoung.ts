/**
 * 올리브영 어댑터.
 * 올리브영은 Vercel(AWS)에서 보내는 직접 요청을 403으로 막으므로
 * daiso-mcp(MIT, github.com/hmmhmmhm/daiso-mcp)의 호스팅 API(Cloudflare Workers)를 경유한다.
 */
import type { ProductResult, StockResult, StockStatus } from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { fetchJson } from '../http.js';

const MCP_BASE_URL = 'https://mcp.aka.page';
const IMAGE_HOST = 'https://image.oliveyoung.co.kr';
const IMAGE_PREFIX = '/uploads/images/goods';
const PRODUCT_PAGE = 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=';
const TIMEOUT_MS = 15000;
const MAX_ATTEMPTS = 3;

// ---- 원본 응답 타입 (사용하는 필드만) ----

interface McpEnvelope<T> {
  success?: boolean;
  data?: T;
  error?: { code?: string; message?: string };
}

interface RawProduct {
  goodsNumber?: string;
  goodsName?: string;
  imageUrl?: string;
  priceToPay?: number;
  discountRate?: number;
  o2oStockFlag?: boolean;
  o2oRemainQuantity?: number;
  /** 호스팅 API가 계산한 재고 여부 (전체 매장 기준) */
  inStock?: boolean;
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

/** 상품 검색 결과의 재고 여부를 매장별 재고 대신 쓸 요약으로 바꾼다. */
export function summarizeOliveyoungProductStock(product?: RawProduct): { status: StockStatus; label: string } {
  if (!product) return { status: 'unknown', label: '재고 확인 불가' };
  return isInStock(product)
    ? { status: 'in_stock', label: '매장 재고 있음' }
    : { status: 'out_of_stock', label: '매장 재고 없음' };
}

// ---- 호출 ----

async function fetchProducts(keyword: string, size: number): Promise<RawProduct[]> {
  const params = new URLSearchParams({ keyword, size: String(size), includeSoldOut: 'true' });
  const url = `${MCP_BASE_URL}/api/oliveyoung/products?${params}`;
  let body: McpEnvelope<{ products?: RawProduct[] }> | undefined;
  // 호스팅 서버도 올리브영에 간헐적으로 차단되어(500) 성공하면 5분간 캐시되므로 몇 번 다시 시도한다.
  for (let attempt = 1; !body; attempt++) {
    try {
      body = await fetchJson(url, { label: '올리브영', timeoutMs: TIMEOUT_MS });
    } catch (error) {
      const retryable = error instanceof ApiException && error.code === 'UPSTREAM_ERROR';
      if (!retryable || attempt >= MAX_ATTEMPTS) throw error;
    }
  }
  if (!body.success || !body.data) {
    throw new ApiException('UPSTREAM_ERROR', `올리브영 조회에 실패했습니다. (${body.error?.code ?? 'UNKNOWN'})`);
  }
  return body.data.products ?? [];
}

export async function searchOliveyoungProducts(query: string, limit: number): Promise<ProductResult[]> {
  return parseOliveyoungProducts({ products: await fetchProducts(query, limit) });
}

/**
 * 매장별 재고는 호스팅 API에서도 아직 복구되지 않아(브라우저 릴레이 필요),
 * 상품명으로 다시 검색해 전체 매장 기준 재고 여부만 보여준다. 상품번호로는 검색되지 않는다.
 */
export async function checkOliveyoungStock(
  goodsNumber: string,
  _storeKeyword: string,
  _limit: number,
  productName?: string,
): Promise<StockResult> {
  let summary = summarizeOliveyoungProductStock(undefined);
  if (productName) {
    try {
      const products = await fetchProducts(productName, 10);
      summary = summarizeOliveyoungProductStock(products.find((p) => p.goodsNumber === goodsNumber));
    } catch {
      // 확인 불가로 표시한다.
    }
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
