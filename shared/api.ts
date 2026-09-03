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
