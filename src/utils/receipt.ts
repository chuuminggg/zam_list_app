import type { PaymentMethod } from '../types';
import type { ReceiptScan } from './receiptText';
import type { TransactionDraft } from './wishPurchase';

/**
 * 인식 결과로 지출 초안을 만든다. 찾지 못한 값은 기본값(오늘, 기본 카테고리, 마지막 결제수단)으로 채우고,
 * 금액을 못 찾으면 비워 둔다. 메모는 가게 이름.
 */
export function receiptDraft(
  scan: ReceiptScan,
  { today, defaultCategory, lastPaymentMethod }: { today: string; defaultCategory: string; lastPaymentMethod?: PaymentMethod }
): TransactionDraft {
  return {
    type: 'expense',
    amount: scan.amount ?? undefined,
    category: scan.category ?? defaultCategory,
    date: scan.date ?? today,
    memo: scan.merchant || undefined,
    paymentMethod: scan.paymentMethod ?? lastPaymentMethod,
  };
}

/** 인식 뒤 보여줄 안내. 없으면 null */
export function receiptNotice(scan: ReceiptScan): string | null {
  if (scan.amount === null) return '금액을 찾지 못했어요. 직접 입력해 주세요.';
  if (scan.date === null) return '날짜를 찾지 못해 오늘로 넣었어요. 확인해 주세요.';
  return null;
}
