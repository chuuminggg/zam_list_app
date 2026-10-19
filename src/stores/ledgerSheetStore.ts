import { create } from 'zustand';
import type { Transaction } from '../types';
import type { TransactionDraft } from '../utils/wishPurchase';

/** 가계부 탭 밖(위시리스트 등)에서 띄우는 내역 입력 시트. 수정할 내역 또는 미리 채울 값 */
export type LedgerSheetTarget = { transaction: Transaction } | { draft: TransactionDraft };

interface LedgerSheetStore {
  target: LedgerSheetTarget | null;
  openSheet: (target: LedgerSheetTarget) => void;
  closeSheet: () => void;
}

export const useLedgerSheetStore = create<LedgerSheetStore>()((set) => ({
  target: null,
  openSheet: (target) => set({ target }),
  closeSheet: () => set({ target: null }),
}));
