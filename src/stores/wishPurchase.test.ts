// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { WishItem } from '../types';
import { useLedgerPrefsStore } from './ledgerPrefsStore';
import { useLedgerSheetStore } from './ledgerSheetStore';
import { useLedgerStore } from './ledgerStore';
import { useToastStore } from './toastStore';
import { setWishStatus } from './wishPurchase';
import { useWishStore } from './wishStore';

const wish = (overrides: Partial<WishItem> = {}): WishItem => ({
  id: 'w1',
  name: '무선 이어폰',
  price: 89000,
  status: 'want',
  category: '',
  createdAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

const currentWish = () => useWishStore.getState().items[0];
const transactions = () => useLedgerStore.getState().transactions;
const toast = () => useToastStore.getState().toast;
const sheet = () => useLedgerSheetStore.getState().target;

beforeEach(() => {
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 9, 15, 12));
});

afterEach(() => {
  vi.useRealTimers();
  useWishStore.setState({ items: [] });
  useLedgerStore.setState({ transactions: [], fixedItems: [] });
  useLedgerPrefsStore.setState({ wishPurchaseMode: 'ask' });
  useToastStore.setState({ toast: null });
  useLedgerSheetStore.setState({ target: null });
  localStorage.clear();
});

describe('setWishStatus', () => {
  it('확인 모드에서는 구매함으로 바꾸면 미리 채운 입력 시트를 띄우고 바로 기록하지 않는다', () => {
    useWishStore.setState({ items: [wish()] });
    setWishStatus(currentWish(), 'bought');

    expect(currentWish().status).toBe('bought');
    expect(transactions()).toEqual([]);
    expect(sheet()).toEqual({
      draft: { type: 'expense', category: 'shopping', amount: 89000, date: '2026-10-15', memo: '무선 이어폰', wishId: 'w1' },
    });
  });

  it('자동 모드에서는 바로 지출을 추가하고, 토스트의 수정으로 그 내역을 연다', () => {
    useLedgerPrefsStore.setState({ wishPurchaseMode: 'auto' });
    useWishStore.setState({ items: [wish()] });
    setWishStatus(currentWish(), 'bought');

    expect(transactions()).toMatchObject([{ amount: 89000, category: 'shopping', date: '2026-10-15', wishId: 'w1' }]);
    expect(toast()?.message).toBe('가계부에 기록했어요');
    toast()?.action?.run();
    expect(sheet()).toEqual({ transaction: transactions()[0] });
  });

  it('자동 모드여도 가격이 없으면 입력 시트를 띄운다', () => {
    useLedgerPrefsStore.setState({ wishPurchaseMode: 'auto' });
    useWishStore.setState({ items: [wish({ price: undefined })] });
    setWishStatus(currentWish(), 'bought');

    expect(transactions()).toEqual([]);
    expect(sheet()).toMatchObject({ draft: { wishId: 'w1', amount: undefined } });
  });

  it('이미 연결된 지출이 있으면 다시 만들지 않는다', () => {
    useLedgerPrefsStore.setState({ wishPurchaseMode: 'auto' });
    useWishStore.setState({ items: [wish()] });
    useLedgerStore.getState().addTransaction({ type: 'expense', amount: 80000, category: 'shopping', date: '2026-10-14', wishId: 'w1' });
    setWishStatus(currentWish(), 'bought');

    expect(transactions()).toHaveLength(1);
    expect(sheet()).toBeNull();
  });

  it('구매함을 해제하면 연결된 지출만 지우고, 되돌리기로 상태와 지출을 함께 되살린다', () => {
    useWishStore.setState({ items: [wish({ status: 'bought' })] });
    const { addTransaction } = useLedgerStore.getState();
    const linked = addTransaction({ type: 'expense', amount: 89000, category: 'shopping', date: '2026-10-15', wishId: 'w1' });
    const other = addTransaction({ type: 'expense', amount: 5000, category: 'cafe', date: '2026-10-15' });

    setWishStatus(currentWish(), 'want');
    expect(currentWish().status).toBe('want');
    expect(transactions()).toEqual([other]);

    toast()?.action?.run();
    expect(currentWish().status).toBe('bought');
    expect(transactions()).toEqual([other, linked]);
  });
});
