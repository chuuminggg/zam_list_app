import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Budget } from '../types';

interface BudgetStore {
  budgets: Budget[];
  /** id가 같은 예산이 있으면 고친 값을 합치고, 없으면 새로 만든다. */
  saveBudget: (id: string, updates: Partial<Omit<Budget, 'id' | 'createdAt'>>) => void;
}

export const useBudgetStore = create<BudgetStore>()(
  persist(
    (set) => ({
      budgets: [],
      saveBudget: (id, updates) =>
        set((state) => {
          const existing = state.budgets.find((b) => b.id === id);
          if (existing) {
            return { budgets: state.budgets.map((b) => (b.id === id ? { ...b, ...updates } : b)) };
          }
          const created: Budget = { amounts: {}, ...updates, id, createdAt: new Date().toISOString() };
          return { budgets: [...state.budgets, created] };
        }),
    }),
    { name: 'zam-budgets' }
  )
);
