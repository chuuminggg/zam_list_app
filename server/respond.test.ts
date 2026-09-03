import { describe, expect, it } from 'vitest';
import { ApiException } from './errors.js';
import { intParam, ok, requiredString, route } from './respond.js';

const url = (qs: string) => new URL(`http://localhost/api/test?${qs}`);

describe('route', () => {
  it('ApiException을 코드별 상태로 변환한다', async () => {
    const handler = route(async () => {
      throw new ApiException('BLOCKED', '차단됨');
    });
    const res = await handler(new Request('http://localhost/api/test'));
    expect(res.status).toBe(502);
    expect(await res.json()).toEqual({ ok: false, error: { code: 'BLOCKED', message: '차단됨' } });
  });

  it('성공 응답에 캐시 헤더를 붙인다', async () => {
    const res = ok({ a: 1 }, 300);
    expect(res.headers.get('Cache-Control')).toBe('public, s-maxage=300, stale-while-revalidate=600');
    expect(await res.json()).toEqual({ ok: true, data: { a: 1 } });
  });
});

describe('쿼리 검증', () => {
  it('문자열 길이를 검사한다', () => {
    expect(requiredString(url('q=우유'), 'q', { min: 2 })).toBe('우유');
    expect(() => requiredString(url('q=a'), 'q', { min: 2 })).toThrow(ApiException);
    expect(() => requiredString(url(''), 'q')).toThrow(ApiException);
  });

  it('정수 범위를 검사하고 기본값을 쓴다', () => {
    const opts = { min: 1, max: 20, fallback: 10 };
    expect(intParam(url(''), 'limit', opts)).toBe(10);
    expect(intParam(url('limit=5'), 'limit', opts)).toBe(5);
    expect(() => intParam(url('limit=50'), 'limit', opts)).toThrow(ApiException);
    expect(() => intParam(url('limit=abc'), 'limit', opts)).toThrow(ApiException);
  });
});
