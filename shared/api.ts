/**
 * 프론트(src)와 서버 함수(api, server)가 함께 쓰는 API 계약 타입.
 */

export type ApiErrorCode =
  | 'BAD_REQUEST'
  | 'NOT_FOUND'
  | 'NOT_CONFIGURED'
  | 'PROVIDER_DISABLED'
  | 'UPSTREAM_ERROR'
  | 'TIMEOUT'
  | 'BLOCKED'
  | 'PARSE_ERROR'
  | 'INTERNAL';

export interface ApiError {
  code: ApiErrorCode;
  message: string;
}

export type ApiResponse<T> = { ok: true; data: T } | { ok: false; error: ApiError };

export type ProviderId =
  | 'kurly'
  | 'daangn'
  | 'ohou'
  | 'bunjang'
  | 'coupang'
  | 'daiso'
  | 'oliveyoung'
  | 'cinema';

export interface ProviderInfo {
  id: ProviderId;
  label: string;
  enabled: boolean;
  /** 비활성 사유 (환경변수 누락 등) */
  reason?: string;
}

/** 서버 어댑터가 정규화해서 내려주는 상품 검색 결과 */
export interface ProductResult {
  provider: ProviderId;
  externalId: string;
  name: string;
  price?: number;
  priceText?: string;
  url: string;
  imageUrl?: string;
  soldOut?: boolean;
  /** '로켓배송', '30% 할인', '판매중' 등 */
  badges: string[];
}

/** 매장 재고 확인을 지원하는 공급자 */
export type StockProviderId = Extract<ProviderId, 'daiso' | 'oliveyoung'>;

export interface StoreResult {
  provider: StockProviderId;
  storeCode: string;
  name: string;
  address: string;
  openTime?: string;
  closeTime?: string;
  /** 매장이 온라인 주문 후 픽업 서비스를 지원하는지 */
  pickup: boolean;
}

/**
 * unknown: 수량이 공개되지 않아 재고 유무를 판단할 수 없음 (다이소는 2026-05-05부터 수량 비공개)
 */
export type StockStatus = 'in_stock' | 'out_of_stock' | 'not_sold' | 'unknown';

export interface StoreStock extends StoreResult {
  status: StockStatus;
  /** '재고 있음', '재고 3개', '품절', '수량 비공개' 등 표시용 문구 */
  label: string;
}

export interface StockResult {
  provider: StockProviderId;
  productId: string;
  checkedAt: string;
  stores: StoreStock[];
  /** 데이터 한계 등 사용자에게 알릴 안내 */
  notice?: string;
}
