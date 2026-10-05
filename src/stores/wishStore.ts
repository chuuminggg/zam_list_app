import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { WishItem, WishFilter, WishShopFilter, WishSort } from '../types';

interface WishStore {
  items: WishItem[];
  filter: WishFilter;
  shopFilter: WishShopFilter;
  sort: WishSort;
  addItem: (item: Omit<WishItem, 'id' | 'createdAt'>) => void;
  updateItem: (id: string, updates: Partial<WishItem>) => void;
  deleteItem: (id: string) => void;
  setFilter: (filter: WishFilter) => void;
  setShopFilter: (shopFilter: WishShopFilter) => void;
  setSort: (sort: WishSort) => void;
}

export const useWishStore = create<WishStore>()(
  persist(
    (set) => ({
      items: [],
      filter: 'all',
      shopFilter: 'all',
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
      setShopFilter: (shopFilter) => set({ shopFilter }),
      setSort: (sort) => set({ sort }),
    }),
    { name: 'zam-wishlist' }
  )
);
