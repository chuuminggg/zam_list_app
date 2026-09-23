import type {
  ApiErrorCode,
  ApiResponse,
  ProductResult,
  ProviderInfo,
  SearchProviderId,
  StockProviderId,
  StockResult,
} from '../../shared/api';
import type { AuthUser, CollectionId, CollectionItem } from '../../shared/data';

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

export const searchProducts = (provider: SearchProviderId, q: string, signal?: AbortSignal) =>
  apiGet<ProductResult[]>('search', { provider, q, limit: 10 }, signal);

export const checkStock = (
  provider: StockProviderId,
  id: string,
  store: string,
  name: string,
  signal?: AbortSignal,
) => apiGet<StockResult>('stock', { provider, id, store, name: name.slice(0, 200) }, signal);

export type SignInResponse =
  | { status: 'signedIn'; token: string; user: AuthUser; created: boolean }
  | { status: 'new'; username: string };

export const signInRequest = (username: string, password: string, create: boolean) =>
  apiRequest<SignInResponse>('auth', { method: 'POST', body: { username, password, create } });

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

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
