import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WishItem, WishFilter, WishSort } from '../types';

interface WishStore {
  items: WishItem[];
  filter: WishFilter;
  sort: WishSort;
  addItem: (item: Omit<WishItem, 'id' | 'createdAt'>) => void;
  updateItem: (id: string, updates: Partial<WishItem>) => void;
  deleteItem: (id: string) => void;
  setFilter: (filter: WishFilter) => void;
  setSort: (sort: WishSort) => void;
}

export const useWishStore = create<WishStore>()(
  persist(
    (set) => ({
      items: [],
      filter: 'all',
      sort: 'newest',
      addItem: (item) =>
        set((state) => ({
          items: [
            ...state.items,
            { ...item, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
          ],
        })),
      updateItem: (id, updates) =>
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        })),
      deleteItem: (id) =>
        set((state) => ({ items: state.items.filter((i) => i.id !== id) })),
      setFilter: (filter) => set({ filter }),
      setSort: (sort) => set({ sort }),
    }),
    { name: 'zam-wishlist' }
  )
);
