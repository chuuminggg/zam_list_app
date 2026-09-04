import type { ApiResponse } from '../shared/api.js';
import { ApiException } from './errors.js';

type RouteHandler = (url: URL, request: Request) => Promise<Response>;

function json<T>(body: ApiResponse<T>, status: number, headers: Record<string, string> = {}): Response {
  return Response.json(body, { status, headers });
}

/**
 * 성공 응답. cacheSeconds > 0 이면 Vercel CDN 캐시를 켠다.
 */
export function ok<T>(data: T, cacheSeconds = 0): Response {
  const cacheControl =
    cacheSeconds > 0
      ? `public, s-maxage=${cacheSeconds}, stale-while-revalidate=${cacheSeconds * 2}`
      : 'no-store';
  return json({ ok: true, data }, 200, { 'Cache-Control': cacheControl });
}

export function fail(error: unknown): Response {
  if (error instanceof ApiException) {
    return json({ ok: false, error: { code: error.code, message: error.message } }, error.status, {
      'Cache-Control': 'no-store',
    });
  }
  console.error(error);
  return json(
    { ok: false, error: { code: 'INTERNAL', message: '서버에서 알 수 없는 오류가 발생했습니다.' } },
    500,
    { 'Cache-Control': 'no-store' },
  );
}

/** Vercel Functions 웹 시그니처(`export const GET = route(...)`)용 래퍼. */
export function route(fn: RouteHandler): (request: Request) => Promise<Response> {
  return async (request) => {
    try {
      return await fn(new URL(request.url), request);
    } catch (error) {
      return fail(error);
    }
  };
}

interface StringParamOptions {
  min?: number;
  max?: number;
  /** 외부 API로 그대로 넘기는 ID 등은 허용 문자를 제한한다. */
  pattern?: RegExp;
}

export function requiredString(
  url: URL,
  name: string,
  { min = 1, max = 100, pattern }: StringParamOptions = {},
): string {
  const value = url.searchParams.get(name)?.trim() ?? '';
  if (value.length < min || value.length > max) {
    throw new ApiException('BAD_REQUEST', `'${name}'은(는) ${min}~${max}자여야 합니다.`);
  }
  if (pattern && !pattern.test(value)) {
    throw new ApiException('BAD_REQUEST', `'${name}' 형식이 올바르지 않습니다.`);
  }
  return value;
}

export function optionalString(url: URL, name: string, { max = 100 }: StringParamOptions = {}): string | undefined {
  const value = url.searchParams.get(name)?.trim();
  if (!value) return undefined;
  if (value.length > max) {
    throw new ApiException('BAD_REQUEST', `'${name}'은(는) ${max}자 이하여야 합니다.`);
  }
  return value;
}

export function intParam(
  url: URL,
  name: string,
  { min, max, fallback }: { min: number; max: number; fallback: number },
): number {
  const raw = url.searchParams.get(name);
  if (raw == null || raw === '') return fallback;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < min || value > max) {
    throw new ApiException('BAD_REQUEST', `'${name}'은(는) ${min}~${max} 사이의 정수여야 합니다.`);
  }
  return value;
}

export function oneOf<T extends string>(url: URL, name: string, allowed: readonly T[]): T {
  const value = url.searchParams.get(name);
  if (!value || !(allowed as readonly string[]).includes(value)) {
    throw new ApiException('BAD_REQUEST', `'${name}'은(는) ${allowed.join(', ')} 중 하나여야 합니다.`);
  }
  return value as T;
}
