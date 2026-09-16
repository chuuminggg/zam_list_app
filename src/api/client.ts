import type {
  ApiErrorCode,
  ApiResponse,
  ProductResult,
  ProviderInfo,
  SearchProviderId,
  StockProviderId,
  StockResult,
} from '../../shared/api';

export class ApiClientError extends Error {
  readonly code: ApiErrorCode;

  constructor(code: ApiErrorCode, message: string) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
  }
}

type Params = Record<string, string | number | undefined>;

/** `/api/*` GET 호출. 실패 응답은 ApiClientError로 던진다. */
export async function apiGet<T>(path: string, params: Params = {}, signal?: AbortSignal): Promise<T> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }
  const query = search.toString();

  let body: ApiResponse<T>;
  try {
    const response = await fetch(`/api/${path}${query ? `?${query}` : ''}`, { signal });
    body = await response.json();
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiClientError('UPSTREAM_ERROR', '서버에 연결할 수 없습니다.');
  }

  if (!body.ok) throw new ApiClientError(body.error.code, body.error.message);
  return body.data;
}

export const fetchProviders = (signal?: AbortSignal) =>
  apiGet<{ providers: ProviderInfo[] }>('providers', {}, signal).then((d) => d.providers);

export const searchProducts = (provider: SearchProviderId, q: string, signal?: AbortSignal) =>
  apiGet<ProductResult[]>('search', { provider, q, limit: 10 }, signal);

export const checkStock = (provider: StockProviderId, id: string, store: string, signal?: AbortSignal) =>
  apiGet<StockResult>('stock', { provider, id, store }, signal);
