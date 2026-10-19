import type { WishItem } from '../types';
import { todayKey } from '../utils/date';
import { isPurchase, isPurchaseUndone, purchaseDraft } from '../utils/wishPurchase';
import { useLedgerPrefsStore } from './ledgerPrefsStore';
import { useLedgerSheetStore } from './ledgerSheetStore';
import { useLedgerStore } from './ledgerStore';
import { useToastStore } from './toastStore';
import { useWishStore } from './wishStore';

/**
 * 위시 상태가 바뀐 뒤 가계부를 맞춘다.
 * - "구매함"이 되면: 자동 모드이고 가격이 있으면 바로 지출 추가, 아니면 미리 채운 입력 시트를 띄운다.
 * - "구매함"이 해제되면: 연결된 지출을 지우고 되돌리기를 제공한다.
 */
export function syncWishPurchase(item: WishItem, prev: WishItem['status'] | undefined): void {
  const ledger = useLedgerStore.getState();
  const { showToast } = useToastStore.getState();
  const linked = ledger.transactions.filter((t) => t.wishId === item.id);

  if (isPurchase(prev, item.status)) {
    // 이미 기록한 지출이 있으면(다른 기기에서 기록 등) 또 만들지 않는다.
    if (linked.length > 0) return;
    const draft = purchaseDraft(item, todayKey());
    const { openSheet } = useLedgerSheetStore.getState();
    if (useLedgerPrefsStore.getState().wishPurchaseMode === 'auto' && draft.amount !== undefined) {
      const created = ledger.addTransaction({ ...draft, amount: draft.amount });
      showToast({
        message: '가계부에 기록했어요',
        action: { label: '수정', run: () => openSheet({ transaction: created }) },
      });
    } else {
      openSheet({ draft });
    }
    return;
  }

  if (isPurchaseUndone(prev, item.status) && linked.length > 0) {
    for (const t of linked) ledger.deleteTransaction(t.id);
    showToast({
      message: '연결된 지출을 가계부에서 지웠어요',
      action: {
        label: '되돌리기',
        run: () => {
          useWishStore.getState().updateItem(item.id, { status: 'bought' });
          useLedgerStore.getState().restoreTransactions(linked);
        },
      },
    });
  }
}

/** 위시 상태를 바꾸고 가계부를 맞춘다. */
export function setWishStatus(item: WishItem, status: WishItem['status']): void {
  if (item.status === status) return;
  useWishStore.getState().updateItem(item.id, { status });
  syncWishPurchase({ ...item, status }, item.status);
}
