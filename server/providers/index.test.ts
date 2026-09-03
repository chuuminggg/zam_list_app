import { describe, expect, it } from 'vitest';
import { ApiException } from '../errors.js';
import { getProviderInfo, requireProvider } from './index.js';

const url = (qs: string) => new URL(`http://localhost/api/test?${qs}`);

describe('공급자 활성화', () => {
  it('필수 환경변수가 없으면 비활성화', () => {
    expect(getProviderInfo('oliveyoung', {}).enabled).toBe(false);
    expect(getProviderInfo('oliveyoung', { ZYTE_API_KEY: 'x' }).enabled).toBe(true);
  });

  it('PROVIDERS_ENABLED 목록에 없으면 비활성화', () => {
    const env = { PROVIDERS_ENABLED: 'kurly, daiso' };
    expect(getProviderInfo('daiso', env).enabled).toBe(true);
    expect(getProviderInfo('coupang', env).enabled).toBe(false);
  });

  it('라우트가 지원하지 않는 공급자는 거부', () => {
    expect(requireProvider(url('provider=daiso'), ['daiso'], {})).toBe('daiso');
    expect(() => requireProvider(url('provider=kurly'), ['daiso'], {})).toThrow(ApiException);
  });

  it('환경변수 누락은 NOT_CONFIGURED', () => {
    try {
      requireProvider(url('provider=oliveyoung'), ['oliveyoung'], {});
      expect.unreachable();
    } catch (error) {
      expect((error as ApiException).code).toBe('NOT_CONFIGURED');
    }
  });
});
