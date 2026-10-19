import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/** 위시를 "구매함"으로 바꿨을 때 가계부 기록 방식. ask: 미리 채운 입력 시트, auto: 바로 지출 추가 */
export type WishPurchaseMode = 'ask' | 'auto';

interface LedgerPrefsStore {
  wishPurchaseMode: WishPurchaseMode;
  setWishPurchaseMode: (mode: WishPurchaseMode) => void;
}

export const useLedgerPrefsStore = create<LedgerPrefsStore>()(
  persist(
    (set) => ({
      wishPurchaseMode: 'ask',
      setWishPurchaseMode: (wishPurchaseMode) => set({ wishPurchaseMode }),
    }),
    { name: 'zam-ledger-prefs' }
  )
);
