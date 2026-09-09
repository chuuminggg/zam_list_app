import { useCallback, useEffect, useRef, useState } from 'react';

type RequestState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; message: string };

/**
 * 사용자 동작으로 시작하는 API 요청 상태. 새 요청을 보내거나 언마운트되면 이전 요청은 취소된다.
 */
export function useApiRequest<T>() {
  const [state, setState] = useState<RequestState<T>>({ status: 'idle' });
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const run = useCallback(async (request: (signal: AbortSignal) => Promise<T>) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setState({ status: 'loading' });
    try {
      const data = await request(controller.signal);
      if (!controller.signal.aborted) setState({ status: 'success', data });
    } catch (error) {
      if (controller.signal.aborted) return;
      setState({ status: 'error', message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.' });
    }
  }, []);

  const reset = useCallback(() => {
    controllerRef.current?.abort();
    setState({ status: 'idle' });
  }, []);

  return { state, run, reset };
}
