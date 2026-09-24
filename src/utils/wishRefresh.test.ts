import { describe, expect, it } from 'vitest';
import type { ProductResult } from '../../shared/api';
import type { WishItem } from '../types';
import { applyProductResult, canRefresh, isFresh, priceChange, RECHECK_INTERVAL_MS } from './wishRefresh';

const NOW = '2026-09-24T06:00:00.000Z';

const item = (overrides: Partial<WishItem> = {}): WishItem => ({
  id: 'w1',
  name: '우유',
  status: 'want',
  category: '마켓컬리',
  createdAt: '2026-09-01T00:00:00.000Z',
  price: 5000,
  source: { provider: 'kurly', externalId: '1' },
  ...overrides,
});

const result = (overrides: Partial<ProductResult> = {}): ProductResult => ({
  provider: 'kurly',
  externalId: '1',
  name: '우유',
  price: 5000,
  url: 'https://www.kurly.com/goods/1',
  badges: [],
  ...overrides,
});

describe('canRefresh', () => {
  it('검색으로 담은 항목만 다시 조회할 수 있다', () => {
    expect(canRefresh(item())).toBe(true);
    expect(canRefresh(item({ source: undefined }))).toBe(false);
  });
});

describe('isFresh', () => {
  const now = Date.parse(NOW);

  it('확인한 적 없으면 새로 확인해야 한다', () => {
    expect(isFresh(item(), now)).toBe(false);
  });

  it('10분이 지나지 않았으면 건너뛴다', () => {
    expect(isFresh(item({ lastCheckedAt: new Date(now - 60_000).toISOString() }), now)).toBe(true);
    expect(isFresh(item({ lastCheckedAt: new Date(now - RECHECK_INTERVAL_MS).toISOString() }), now)).toBe(false);
  });
});

describe('applyProductResult', () => {
  it('가격이 바뀌면 이력에 담을 때 가격과 새 가격을 함께 남긴다', () => {
    const updates = applyProductResult(item(), result({ price: 4000 }), NOW);

    expect(updates).toEqual({
      lastCheckedAt: NOW,
      soldOut: false,
      price: 4000,
      priceHistory: [
        { at: '2026-09-01T00:00:00.000Z', price: 5000 },
        { at: NOW, price: 4000 },
      ],
    });
  });

  it('가격이 그대로면 이력을 늘리지 않는다', () => {
    const history = [{ at: '2026-09-02T00:00:00.000Z', price: 5000 }];
    const updates = applyProductResult(item({ priceHistory: history }), result(), NOW);

    expect(updates.priceHistory).toEqual(history);
    expect(updates.lastCheckedAt).toBe(NOW);
  });

  it('가격을 못 구하면 가격 관련 필드는 건드리지 않는다', () => {
    const updates = applyProductResult(item(), result({ price: undefined, soldOut: true }), NOW);

    expect(updates).toEqual({ lastCheckedAt: NOW, soldOut: true });
  });

  it('이력은 최근 20개만 남긴다', () => {
    const history = Array.from({ length: 20 }, (_, i) => ({ at: NOW, price: i }));
    const updates = applyProductResult(item({ priceHistory: history }), result({ price: 99 }), NOW);

    expect(updates.priceHistory).toHaveLength(20);
    expect(updates.priceHistory?.at(-1)).toEqual({ at: NOW, price: 99 });
    expect(updates.priceHistory?.[0]).toEqual({ at: NOW, price: 1 });
  });
});

describe('priceChange', () => {
  it('마지막 두 시점의 차이를 돌려준다', () => {
    const changed = item({
      priceHistory: [
        { at: '2026-09-01T00:00:00.000Z', price: 5000 },
        { at: NOW, price: 4000 },
      ],
    });

    expect(priceChange(changed)).toEqual({ diff: -1000, previous: 5000, current: 4000 });
  });

  it('이력이 하나뿐이면 변동이 없다', () => {
    expect(priceChange(item({ priceHistory: [{ at: NOW, price: 5000 }] }))).toBeUndefined();
    expect(priceChange(item())).toBeUndefined();
  });
});
