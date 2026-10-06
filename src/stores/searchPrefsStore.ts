import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SearchPrefsStore {
  /** 당근 검색에 마지막으로 쓴 동네 이름 */
  region: string;
  setRegion: (region: string) => void;
}

export const useSearchPrefsStore = create<SearchPrefsStore>()(
  persist(
    (set) => ({
      region: '',
      setRegion: (region) => set({ region }),
    }),
    { name: 'zam-search-prefs' }
  )
);
