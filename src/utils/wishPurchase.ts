import { MAX_LEDGER_AMOUNT } from '../../shared/data';
import type { NewTransaction } from '../stores/ledgerStore';
import type { PaymentMethod, WishItem } from '../types';

/** 입력 시트에 미리 채울 내역. 위시 가격이 없으면 금액이 비어 있다. */
export type TransactionDraft = Omit<NewTransaction, 'amount'> & { amount?: number };

/** 상태가 "구매함"으로 바뀌었는지 (새로 추가한 항목이면 prev가 undefined) */
export function isPurchase(prev: WishItem['status'] | undefined, next: WishItem['status']): boolean {
  return prev !== 'bought' && next === 'bought';
}

/** "구매함"이 해제됐는지 */
export function isPurchaseUndone(prev: WishItem['status'] | undefined, next: WishItem['status']): boolean {
  return prev === 'bought' && next !== 'bought';
}

/** 위시 항목으로 지출 초안을 만든다. 카테고리는 쇼핑, 메모는 상품명, 결제수단은 마지막에 쓴 값. */
export function purchaseDraft(item: WishItem, date: string, paymentMethod?: PaymentMethod): TransactionDraft {
  const { price } = item;
  const amount = price != null && Number.isInteger(price) && price > 0 && price <= MAX_LEDGER_AMOUNT ? price : undefined;
  return {
    type: 'expense',
    category: 'shopping',
    amount,
    date,
    memo: item.name.slice(0, 500),
    paymentMethod,
    wishId: item.id,
  };
}
