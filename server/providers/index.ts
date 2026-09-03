import type { ProviderId, ProviderInfo } from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { oneOf } from '../respond.js';

interface ProviderMeta {
  label: string;
  /** 모두 설정되어 있어야 활성화되는 환경변수 */
  requiredEnv?: string[];
}

export const PROVIDERS: Record<ProviderId, ProviderMeta> = {
  kurly: { label: '마켓컬리' },
  daangn: { label: '당근' },
  ohou: { label: '오늘의집' },
  bunjang: { label: '번개장터' },
  // 파트너스 키가 없으면 k-skill-proxy로 fallback 하므로 필수 아님
  coupang: { label: '쿠팡' },
  daiso: { label: '다이소' },
  // 올리브영 내부 API는 봇 차단이 있어 Zyte 경유 호출 필요
  oliveyoung: { label: '올리브영', requiredEnv: ['ZYTE_API_KEY'] },
  cinema: { label: '영화관' },
};

const PROVIDER_IDS = Object.keys(PROVIDERS) as ProviderId[];

/** PROVIDERS_ENABLED=kurly,daiso 처럼 지정하면 해당 공급자만 켠다. 비어 있으면 전부. */
function enabledByFlag(id: ProviderId, env: NodeJS.ProcessEnv): boolean {
  const flag = env.PROVIDERS_ENABLED?.trim();
  if (!flag) return true;
  return flag.split(',').map((s) => s.trim()).includes(id);
}

export function getProviderInfo(id: ProviderId, env: NodeJS.ProcessEnv = process.env): ProviderInfo {
  const { label, requiredEnv = [] } = PROVIDERS[id];
  if (!enabledByFlag(id, env)) {
    return { id, label, enabled: false, reason: 'PROVIDERS_ENABLED에 포함되지 않음' };
  }
  const missing = requiredEnv.filter((key) => !env[key]);
  if (missing.length > 0) {
    return { id, label, enabled: false, reason: `환경변수 필요: ${missing.join(', ')}` };
  }
  return { id, label, enabled: true };
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
