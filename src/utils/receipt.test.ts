import { describe, expect, it } from 'vitest';
import { receiptDraft, receiptNotice } from './receipt';
import type { ReceiptScan } from './receiptText';

const scan = (overrides: Partial<ReceiptScan> = {}): ReceiptScan => ({
  found: true,
  amount: 12800,
  date: '2026-10-19',
  merchant: '스타벅스',
  category: 'cafe',
  paymentMethod: 'card',
  ...overrides,
});
const defaults = { today: '2026-10-21', defaultCategory: 'food', lastPaymentMethod: 'cash' as const };

describe('receipt draft', () => {
  it('인식한 값으로 지출 초안을 만든다', () => {
    expect(receiptDraft(scan(), defaults)).toEqual({
      type: 'expense',
      amount: 12800,
      category: 'cafe',
      date: '2026-10-19',
      memo: '스타벅스',
      paymentMethod: 'card',
    });
  });

  it('찾지 못한 값은 오늘·기본 카테고리·마지막 결제수단으로, 금액·메모는 비운다', () => {
    const empty = scan({ amount: null, date: null, merchant: '', category: null, paymentMethod: null });
    expect(receiptDraft(empty, defaults)).toEqual({
      type: 'expense',
      amount: undefined,
      category: 'food',
      date: '2026-10-21',
      memo: undefined,
      paymentMethod: 'cash',
    });
  });

  it('금액·날짜를 못 찾았으면 알려준다', () => {
    expect(receiptNotice(scan())).toBeNull();
    expect(receiptNotice(scan({ amount: null, date: null }))).toBe('금액을 찾지 못했어요. 직접 입력해 주세요.');
    expect(receiptNotice(scan({ date: null }))).toBe('날짜를 찾지 못해 오늘로 넣었어요. 확인해 주세요.');
  });
});
