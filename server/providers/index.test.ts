import { describe, expect, it } from 'vitest';
import { ApiException } from '../errors.js';
import { getProviderInfo, requireProvider } from './index.js';

const url = (qs: string) => new URL(`http://localhost/api/test?${qs}`);

describe('공급자 활성화', () => {
  it('올리브영은 키 없이도 활성화 (직접 호출)', () => {
    expect(getProviderInfo('oliveyoung', {}).enabled).toBe(true);
  });

  it('PROVIDERS_ENABLED 목록에 없으면 비활성화', () => {
    const env = { PROVIDERS_ENABLED: 'kurly, daiso' };
    expect(getProviderInfo('daiso', env).enabled).toBe(true);
    expect(getProviderInfo('coupang', env).enabled).toBe(false);
  });

  it('쿠팡은 파트너스 키가 없으면 검색은 되지만 링크 이동은 막는다', () => {
    expect(getProviderInfo('coupang', {})).toMatchObject({ enabled: true, linkDisabled: expect.stringContaining('파트너스 키') });
    expect(getProviderInfo('coupang', { COUPANG_ACCESS_KEY: 'a', COUPANG_SECRET_KEY: 's' }).linkDisabled).toBeUndefined();
    expect(getProviderInfo('kurly', {}).linkDisabled).toBeUndefined();
  });

  it('라우트가 지원하지 않는 공급자는 거부', () => {
    expect(requireProvider(url('provider=daiso'), ['daiso'], {})).toBe('daiso');
    expect(() => requireProvider(url('provider=kurly'), ['daiso'], {})).toThrow(ApiException);
  });
});
