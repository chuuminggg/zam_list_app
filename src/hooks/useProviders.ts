import { useEffect, useState } from 'react';
import type { ProviderInfo } from '../../shared/api';
import { fetchProviders } from '../api/client';

/** 서버가 알려주는 공급자 활성화 상태. 아직 모르면 null. */
export function useProviders(): ProviderInfo[] | null {
  const [providers, setProviders] = useState<ProviderInfo[] | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    fetchProviders(controller.signal)
      .then((list) => {
        if (!controller.signal.aborted) setProviders(list);
      })
      // 목록을 못 받으면 모든 탭을 그대로 열어둔다 (실제 검색에서 에러 메시지로 안내됨).
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return providers;
}
