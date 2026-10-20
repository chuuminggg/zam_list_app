import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { PaymentMethod } from '../types';

/** 위시를 "구매함"으로 바꿨을 때 가계부 기록 방식. ask: 미리 채운 입력 시트, auto: 바로 지출 추가 */
export type WishPurchaseMode = 'ask' | 'auto';

interface LedgerPrefsStore {
  wishPurchaseMode: WishPurchaseMode;
  setWishPurchaseMode: (mode: WishPurchaseMode) => void;
  /** 마지막으로 기록한 지출의 결제수단. 새 지출의 기본값으로 쓴다. */
  lastPaymentMethod?: PaymentMethod;
  setLastPaymentMethod: (method: PaymentMethod | undefined) => void;
}

export const useLedgerPrefsStore = create<LedgerPrefsStore>()(
  persist(
    (set) => ({
      wishPurchaseMode: 'ask',
      setWishPurchaseMode: (wishPurchaseMode) => set({ wishPurchaseMode }),
      lastPaymentMethod: undefined,
      setLastPaymentMethod: (lastPaymentMethod) => set({ lastPaymentMethod }),
    }),
    { name: 'zam-ledger-prefs' }
  )
);
