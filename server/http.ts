import { ApiException } from './errors.js';

const DEFAULT_TIMEOUT_MS = 8000;

export const BROWSER_HEADERS = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
  Accept: 'application/json, text/html, */*',
  'Accept-Language': 'ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7',
};

export interface FetchOptions extends RequestInit {
  timeoutMs?: number;
  /** 에러 메시지에 쓸 공급자 이름 */
  label?: string;
}

/** 타임아웃과 공통 에러 매핑이 적용된 fetch. 2xx가 아니면 ApiException을 던진다. */
export async function fetchWithTimeout(url: string, options: FetchOptions = {}): Promise<Response> {
  const { timeoutMs = DEFAULT_TIMEOUT_MS, label = '외부 서비스', headers, ...init } = options;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  let response: Response;
  try {
    response = await fetch(url, {
      ...init,
      headers: { ...BROWSER_HEADERS, ...headers },
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === 'AbortError') {
      throw new ApiException('TIMEOUT', `${label} 응답 시간이 초과되었습니다.`);
    }
    throw new ApiException('UPSTREAM_ERROR', `${label}에 연결할 수 없습니다.`);
  } finally {
    clearTimeout(timer);
  }

  if (response.status === 403 || response.status === 429) {
    throw new ApiException('BLOCKED', `${label}에서 요청을 차단했습니다. (${response.status})`);
  }
  if (!response.ok) {
    throw new ApiException('UPSTREAM_ERROR', `${label} 응답 오류입니다. (${response.status})`);
  }
  return response;
}

export async function fetchJson<T>(url: string, options: FetchOptions = {}): Promise<T> {
  const response = await fetchWithTimeout(url, options);
  try {
    return (await response.json()) as T;
  } catch {
    throw new ApiException('PARSE_ERROR', `${options.label ?? '외부 서비스'} 응답을 해석할 수 없습니다.`);
  }
}

export async function fetchText(url: string, options: FetchOptions = {}): Promise<string> {
  const response = await fetchWithTimeout(url, options);
  return response.text();
}
