import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Category } from '../types';

interface CategoryStore {
  categories: Category[];
  addCategory: (category: Pick<Category, 'name' | 'color'>) => void;
  updateCategory: (id: string, updates: Partial<Pick<Category, 'name' | 'color'>>) => void;
  deleteCategory: (id: string) => void;
  /** 표시 순서에서 앞(-1)이나 뒤(+1)로 한 칸 옮긴다. */
  moveCategory: (id: string, offset: -1 | 1) => void;
}

/** 표시 순서대로 정렬한 새 배열 */
export function sortCategories(categories: Category[]): Category[] {
  return [...categories].sort((a, b) => a.order - b.order || a.createdAt.localeCompare(b.createdAt));
}

export const useCategoryStore = create<CategoryStore>()(
  persist(
    (set) => ({
      categories: [],
      addCategory: ({ name, color }) =>
        set((state) => ({
          categories: [
            ...state.categories,
            {
              id: crypto.randomUUID(),
              name,
              color,
              order: Math.max(0, ...state.categories.map((c) => c.order + 1)),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      updateCategory: (id, updates) =>
        set((state) => ({
          categories: state.categories.map((c) => (c.id === id ? { ...c, ...updates } : c)),
        })),
      deleteCategory: (id) =>
        set((state) => ({ categories: state.categories.filter((c) => c.id !== id) })),
      moveCategory: (id, offset) =>
        set((state) => {
          const sorted = sortCategories(state.categories);
          const from = sorted.findIndex((c) => c.id === id);
          const to = from + offset;
          if (from < 0 || to < 0 || to >= sorted.length) return state;
          [sorted[from], sorted[to]] = [sorted[to], sorted[from]];
          // 순서가 바뀐 항목만 새 객체로 만들어 서버에 보낼 변경분을 줄인다.
          return {
            categories: sorted.map((c, order) => (c.order === order ? c : { ...c, order })),
          };
        }),
    }),
    { name: 'zam-categories' }
  )
);
