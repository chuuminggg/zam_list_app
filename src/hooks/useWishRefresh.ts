import { useCallback, useEffect, useRef, useState } from 'react';
import { refetchProduct } from '../api/client';
import { useWishStore } from '../stores/wishStore';
import type { WishItem } from '../types';
import { applyProductResult, canRefresh, isFresh } from '../utils/wishRefresh';

/** 전체 새로고침 때 동시에 보낼 요청 수 */
const CONCURRENCY = 3;

/**
 * 담아둔 항목을 판매처에서 다시 조회해 가격·품절 상태를 갱신한다.
 * 전체 새로고침은 동시 3개까지만 보내고, 최근에 확인한 항목은 건너뛴다.
 */
export function useWishRefresh() {
  const [pending, setPending] = useState<ReadonlySet<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [running, setRunning] = useState(false);
  const controllerRef = useRef<AbortController | null>(null);

  useEffect(() => () => controllerRef.current?.abort(), []);

  const refreshOne = useCallback(async (item: WishItem, signal: AbortSignal) => {
    const source = item.source;
    if (!source) return;

    setPending((prev) => new Set(prev).add(item.id));
    setErrors((prev) => {
      const { [item.id]: previous, ...rest } = prev;
      return previous === undefined ? prev : rest;
    });
    try {
      const result = await refetchProduct(source.provider, source.externalId, item.name, signal);
      // 조회하는 동안 항목이 바뀌었을 수 있으므로 최신 상태에 반영한다.
      const current = useWishStore.getState().items.find((i) => i.id === item.id);
      if (current) useWishStore.getState().updateItem(item.id, applyProductResult(current, result));
    } catch (error) {
      if (signal.aborted) return;
      setErrors((prev) => ({
        ...prev,
        [item.id]: error instanceof Error ? error.message : '다시 조회하지 못했습니다.',
      }));
    } finally {
      setPending((prev) => {
        const next = new Set(prev);
        next.delete(item.id);
        return next;
      });
    }
  }, []);

  const withController = useCallback(async (job: (signal: AbortSignal) => Promise<void>) => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRunning(true);
    try {
      await job(controller.signal);
    } finally {
      if (!controller.signal.aborted) setRunning(false);
    }
  }, []);

  const refreshItem = useCallback(
    (item: WishItem) => withController((signal) => refreshOne(item, signal)),
    [refreshOne, withController],
  );

  const refreshAll = useCallback(
    () =>
      withController(async (signal) => {
        const queue = useWishStore.getState().items.filter((i) => canRefresh(i) && !isFresh(i));
        const workers = Array.from({ length: Math.min(CONCURRENCY, queue.length) }, async () => {
          while (queue.length > 0 && !signal.aborted) {
            await refreshOne(queue.shift()!, signal);
          }
        });
        await Promise.all(workers);
      }),
    [refreshOne, withController],
  );

  return { pending, errors, running, refreshItem, refreshAll };
}
