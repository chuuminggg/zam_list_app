import type {
  ApiErrorCode,
  ApiResponse,
  DealProviderId,
  ProductResult,
  ProviderInfo,
  SearchProviderId,
  SourceProviderId,
  StockProviderId,
  StockResult,
} from '../../shared/api';
import type { AuthUser, CollectionId, CollectionItem } from '../../shared/data';
import type { KakaoCallbackResult, KakaoMode, KakaoState } from '../../shared/kakao';

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
  }
}

type Params = Record<string, string | number | undefined>;

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE';
  params?: Params;
  body?: unknown;
  headers?: Record<string, string>;
  signal?: AbortSignal;
}

/** `/api/*` 호출. 실패 응답은 ApiClientError로 던진다. */
export async function apiRequest<T>(
  path: string,
  { method = 'GET', params = {}, body, headers = {}, signal }: RequestOptions = {},
): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();

  let result: ApiResponse<T>;
  try {
    const response = await fetch(`/api/${path}${query ? `?${query}` : ''}`, {
      method,
      signal,
      headers: body === undefined ? headers : { ...headers, 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
    result = await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiClientError('UPSTREAM_ERROR', '서버에 연결할 수 없습니다.');
  }

  if (!result.ok) throw new ApiClientError(result.error.code, result.error.message);
  return result.data;
}

export const apiGet = <T>(path: string, params: Params = {}, signal?: AbortSignal) =>
  apiRequest<T>(path, { params, signal });

export const fetchProviders = (signal?: AbortSignal) =>
  apiGet<{ providers: ProviderInfo[] }>('providers', {}, signal).then((d) => d.providers);

/** region은 당근처럼 동네 이름이 필요한 공급자만 보낸다. */
export const searchProducts = (provider: SearchProviderId, q: string, signal?: AbortSignal, region?: string) =>
  apiGet<ProductResult[]>('search', { provider, q, limit: 10, region }, signal);

/** 오늘의집 오늘의딜 같은 특가 목록 (검색어 없음) */
export const fetchDeals = (provider: DealProviderId, signal?: AbortSignal) =>
  apiGet<ProductResult[]>('deals', { provider }, signal);

/** 담아둔 상품 단건 재조회. name은 단건 조회 API가 없는 공급자가 상품을 다시 찾을 때 쓴다. */
export const refetchProduct = (provider: SourceProviderId, id: string, name: string, signal?: AbortSignal) =>
  apiGet<ProductResult>('product', { provider, id, name: name.slice(0, 300) }, signal);

export const checkStock = (
  provider: StockProviderId,
  id: string,
  store: string,
  name: string,
  signal?: AbortSignal,
) => apiGet<StockResult>('stock', { provider, id, store, name: name.slice(0, 200) }, signal);

export type SignInResponse =
  | { status: 'signedIn'; token: string; user: AuthUser; created: boolean }
  | { status: 'new'; username: string }
  | { status: 'mustChange'; username: string };

export const signInRequest = (username: string, password: string, create: boolean, newPassword?: string) =>
  apiRequest<SignInResponse>('auth', { method: 'POST', body: { username, password, create, newPassword } });

export const resetPasswordRequest = (username: string) =>
  apiRequest<{ temporaryPassword: string }>('auth', {
    method: 'POST',
    params: { action: 'reset' },
    body: { username },
  });

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const optionalAuth = (token?: string) => (token ? auth(token) : {});

export const fetchKakaoState = (token?: string, signal?: AbortSignal) =>
  apiRequest<KakaoState>('kakao', { headers: optionalAuth(token), signal });

/** 카카오 로그인 화면 주소. link는 로그인한 계정에 카카오를 연결한다. */
export const startKakaoRequest = (mode: KakaoMode, token?: string) =>
  apiRequest<{ url: string }>('kakao', {
    method: 'POST',
    params: { action: 'start' },
    headers: optionalAuth(token),
    body: { mode },
  });

export const kakaoCallbackRequest = (code: string, state: string, token?: string) =>
  apiRequest<KakaoCallbackResult>('kakao', {
    method: 'POST',
    params: { action: 'callback' },
    headers: optionalAuth(token),
    body: { code, state },
  });

type KakaoSignedIn = { status: 'signedIn'; token: string; user: AuthUser };

export const kakaoSignUpRequest = (ticket: string, username: string) =>
  apiRequest<KakaoSignedIn>('kakao', { method: 'POST', params: { action: 'signup' }, body: { ticket, username } });

export const kakaoAttachRequest = (ticket: string, username: string, password: string) =>
  apiRequest<KakaoSignedIn>('kakao', {
    method: 'POST',
    params: { action: 'attach' },
    body: { ticket, username, password },
  });

export const unlinkKakaoRequest = (token: string) =>
  apiRequest<null>('kakao', { method: 'DELETE', headers: auth(token) });

export const signOutRequest = (token: string) => apiRequest<null>('auth', { method: 'DELETE', headers: auth(token) });

export const fetchCollection = <C extends CollectionId>(token: string, collection: C) =>
  apiRequest<{ items: CollectionItem[C][] }>('data', {
    params: { collection },
    headers: auth(token),
  }).then((d) => d.items);

export const upsertItems = <C extends CollectionId>(token: string, collection: C, items: CollectionItem[C][]) =>
  apiRequest<null>('data', { method: 'POST', params: { collection }, headers: auth(token), body: { items } });

export const replaceCollection = <C extends CollectionId>(
  token: string,
  collection: C,
  items: CollectionItem[C][],
) => apiRequest<null>('data', { method: 'PUT', params: { collection }, headers: auth(token), body: { items } });

export const deleteItem = (token: string, collection: CollectionId, id: string) =>
  apiRequest<null>('data', { method: 'DELETE', params: { collection, id }, headers: auth(token) });
