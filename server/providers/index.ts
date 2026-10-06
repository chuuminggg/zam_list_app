import { PROVIDER_LABEL, type ProviderId, type ProviderInfo } from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { oneOf } from '../respond.js';

/** 모두 설정되어 있어야 공급자가 활성화되는 환경변수 */
// 올리브영은 브라우저 헤더로 직접 호출하고, 쿠팡은 파트너스 키가 없으면 k-skill-proxy로
// fallback 하므로 현재 필수 환경변수가 있는 공급자는 없다.
const REQUIRED_ENV: Partial<Record<ProviderId, string[]>> = {};

const PROVIDER_IDS = Object.keys(PROVIDER_LABEL) as ProviderId[];

/** PROVIDERS_ENABLED=kurly,daiso 처럼 지정하면 해당 공급자만 켠다. 비어 있으면 전부. */
function enabledByFlag(id: ProviderId, env: NodeJS.ProcessEnv): boolean {
  const flag = env.PROVIDERS_ENABLED?.trim();
  if (!flag) return true;
  return flag.split(',').map((s) => s.trim()).includes(id);
}

/** 쿠팡 파트너스 키가 있어야 제휴 링크를 직접 만들 수 있다 */
export function hasCoupangKeys(env: NodeJS.ProcessEnv = process.env): boolean {
  return Boolean(env.COUPANG_ACCESS_KEY?.trim() && env.COUPANG_SECRET_KEY?.trim());
}

/** 상품 링크로 이동할 수 없는 사유 */
function linkDisabledReason(id: ProviderId, env: NodeJS.ProcessEnv): string | undefined {
  if (id === 'coupang' && !hasCoupangKeys(env)) {
    return '쿠팡 파트너스 키가 없어 상품 링크로 이동할 수 없습니다.';
  }
  return undefined;
}

export function getProviderInfo(id: ProviderId, env: NodeJS.ProcessEnv = process.env): ProviderInfo {
  const label = PROVIDER_LABEL[id];
  const requiredEnv = REQUIRED_ENV[id] ?? [];
  if (!enabledByFlag(id, env)) {
    return { id, label, enabled: false, reason: 'PROVIDERS_ENABLED에 포함되지 않음' };
  }
  const missing = requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    return { id, label, enabled: false, reason: `환경변수 필요: ${missing.join(', ')}` };
  }
  const linkDisabled = linkDisabledReason(id, env);
  return linkDisabled ? { id, label, enabled: true, linkDisabled } : { id, label, enabled: true };
}

export function listProviders(env: NodeJS.ProcessEnv = process.env): ProviderInfo[] {
  return PROVIDER_IDS.map((id) => getProviderInfo(id, env));
}

/**
 * `provider` 쿼리를 검증한다. 해당 라우트가 지원하는 공급자인지, 활성화되어 있는지 확인.
 */
export function requireProvider<T extends ProviderId>(
  url: URL,
  supported: readonly T[],
  env: NodeJS.ProcessEnv = process.env,
): T {
  const id = oneOf(url, 'provider', supported);
  const info = getProviderInfo(id, env);
  if (!info.enabled) {
    const code = info.reason?.startsWith('환경변수') ? 'NOT_CONFIGURED' : 'PROVIDER_DISABLED';
    throw new ApiException(code, `${info.label} 연동이 비활성화되어 있습니다. (${info.reason})`);
  }
  return id;
}
