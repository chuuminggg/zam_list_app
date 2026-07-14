import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Theme } from '../types';

/** index.html의 FOUC 방지 스크립트도 이 키를 읽으므로 함께 바꿔야 한다. */
export const THEME_STORAGE_KEY = 'zam-theme';

const ORDER: Theme[] = ['light', 'dark', 'system'];

interface ThemeStore {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  cycleTheme: () => void;
}

export const useThemeStore = create<ThemeStore>()(
  persist(
    (set) => ({
      theme: 'system',
      setTheme: (theme) => set({ theme }),
      cycleTheme: () =>
        set((state) => ({ theme: ORDER[(ORDER.indexOf(state.theme) + 1) % ORDER.length] })),
    }),
    { name: THEME_STORAGE_KEY }
  )
);
