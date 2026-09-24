import type { ProductResult } from '../../shared/api';
import { MAX_PRICE_HISTORY, type PricePoint } from '../../shared/data';
import type { WishItem } from '../types';

/** 이 시간 안에 확인한 항목은 전체 새로고침에서 건너뛴다. */
export const RECHECK_INTERVAL_MS = 10 * 60 * 1000;

/** 검색으로 담아서 다시 조회할 수 있는 항목인지 */
export const canRefresh = (item: WishItem): boolean => item.source != null;

export function isFresh(item: WishItem, now = Date.now()): boolean {
  if (!item.lastCheckedAt) return false;
  const checkedAt = Date.parse(item.lastCheckedAt);
  return Number.isFinite(checkedAt) && now - checkedAt < RECHECK_INTERVAL_MS;
}

/**
 * 가격이 바뀐 시점만 이력에 남긴다. 이력이 없던 항목은 담을 때의 가격을 첫 점으로 넣어
 * 다음 변동에서 "얼마가 내렸는지" 비교할 수 있게 한다.
 */
function nextPriceHistory(item: WishItem, price: number, at: string): PricePoint[] {
  const history = item.priceHistory ?? (item.price == null ? [] : [{ at: item.createdAt, price: item.price }]);
  const last = history.at(-1);
  if (last?.price === price) return history;
  return [...history, { at, price }].slice(-MAX_PRICE_HISTORY);
}

/** 재조회 결과를 항목에 반영할 변경분. 이름·링크는 사용자가 고쳤을 수 있어 건드리지 않는다. */
export function applyProductResult(
  item: WishItem,
  result: ProductResult,
  at: string = new Date().toISOString(),
): Partial<WishItem> {
  const updates: Partial<WishItem> = { lastCheckedAt: at, soldOut: Boolean(result.soldOut) };
  if (result.price != null) {
    updates.price = result.price;
    updates.priceHistory = nextPriceHistory(item, result.price, at);
  }
  return updates;
}

export interface PriceChange {
  /** 직전 가격 대비 변동액 (음수면 내림) */
  diff: number;
  previous: number;
  current: number;
}

/** 마지막 두 시점을 비교한 가격 변동. 변동이 없으면 undefined. */
export function priceChange(item: WishItem): PriceChange | undefined {
  const history = item.priceHistory ?? [];
  if (history.length < 2) return undefined;
  const [previous, current] = history.slice(-2);
  if (previous.price === current.price) return undefined;
  return { diff: current.price - previous.price, previous: previous.price, current: current.price };
}
