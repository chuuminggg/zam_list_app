import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { StockProviderId } from '../../shared/api';

interface StockPrefsStore {
  /** 공급자별 마지막으로 검색한 매장 키워드 */
  storeQuery: Partial<Record<StockProviderId, string>>;
  setStoreQuery: (provider: StockProviderId, query: string) => void;
}

export const useStockPrefsStore = create<StockPrefsStore>()(
  persist(
    (set) => ({
      storeQuery: {},
      setStoreQuery: (provider, query) =>
        set((state) => ({ storeQuery: { ...state.storeQuery, [provider]: query } })),
    }),
    { name: 'zam-stock-prefs' }
  )
);
