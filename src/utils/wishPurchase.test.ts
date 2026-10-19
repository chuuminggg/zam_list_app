import { describe, expect, it } from 'vitest';
import type { WishItem } from '../types';
import { isPurchase, isPurchaseUndone, purchaseDraft } from './wishPurchase';

const wish = (overrides: Partial<WishItem> = {}): WishItem => ({
  id: 'w1',
  name: '무선 이어폰',
  status: 'want',
  category: '',
  createdAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

describe('wishPurchase', () => {
  it('구매함으로 바뀌거나 구매함으로 새로 추가하면 구매로 본다', () => {
    expect(isPurchase('want', 'bought')).toBe(true);
    expect(isPurchase('dropped', 'bought')).toBe(true);
    expect(isPurchase(undefined, 'bought')).toBe(true);
    expect(isPurchase('bought', 'bought')).toBe(false);
    expect(isPurchase(undefined, 'want')).toBe(false);
  });

  it('구매함에서 다른 상태로 바뀌면 구매 해제로 본다', () => {
    expect(isPurchaseUndone('bought', 'want')).toBe(true);
    expect(isPurchaseUndone('bought', 'dropped')).toBe(true);
    expect(isPurchaseUndone('want', 'dropped')).toBe(false);
    expect(isPurchaseUndone(undefined, 'want')).toBe(false);
  });

  it('위시 가격·이름으로 쇼핑 지출 초안을 만든다', () => {
    expect(purchaseDraft(wish({ price: 89000 }), '2026-10-15')).toEqual({
      type: 'expense',
      category: 'shopping',
      amount: 89000,
      date: '2026-10-15',
      memo: '무선 이어폰',
      wishId: 'w1',
    });
  });

  it('가격이 없거나 올바르지 않으면 금액을 비운다', () => {
    expect(purchaseDraft(wish(), '2026-10-15').amount).toBeUndefined();
    expect(purchaseDraft(wish({ price: 0 }), '2026-10-15').amount).toBeUndefined();
    expect(purchaseDraft(wish({ price: 12.5 }), '2026-10-15').amount).toBeUndefined();
  });
});
