import { useCallback, useEffect, useState } from 'react';
import type { KakaoState } from '../../shared/kakao';
import { fetchKakaoState } from '../api/client';
import { useSyncStore } from '../stores/syncStore';

/**
 * 카카오 로그인 사용 여부와 (로그인했으면) 내 연결 상태.
 * 불러오기 전이거나 실패하면 null — 카카오 버튼을 숨긴다.
 */
export function useKakao() {
  const token = useSyncStore((s) => s.session?.token ?? null);
  const [loaded, setLoaded] = useState<{ token: string | null; state: KakaoState } | null>(null);

  const load = useCallback(
    (signal?: AbortSignal) =>
      fetchKakaoState(token ?? undefined, signal)
        .then((state) => {
          if (!signal?.aborted) setLoaded({ token, state });
        })
        .catch((error: unknown) => {
          if (!signal?.aborted) console.warn('[kakao] load failed', error);
        }),
    [token]
  );

  useEffect(() => {
    const controller = new AbortController();
    void load(controller.signal);
    return () => controller.abort();
  }, [load]);

  // 로그인·로그아웃으로 토큰이 바뀌면 이전 계정의 연결 상태를 보여주지 않는다.
  const state = loaded && loaded.token === token ? loaded.state : null;
  return { state, reload: () => load() };
}
