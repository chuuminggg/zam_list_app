import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { LedgerCategorySetting, LedgerType } from '../types';
import { builtinSettingId } from '../utils/ledgerCategories';

export type CategoryFields = Pick<LedgerCategorySetting, 'name' | 'color' | 'icon'>;

interface LedgerCategoryStore {
  categories: LedgerCategorySetting[];
  /** 사용자 카테고리를 만들고 만든 항목을 돌려준다. */
  addCategory: (type: LedgerType, fields: CategoryFields) => LedgerCategorySetting;
  updateCategory: (id: string, fields: CategoryFields) => void;
  deleteCategory: (id: string) => void;
  /** 기본 카테고리의 이름·색상·아이콘·숨김을 바꾼다. */
  saveBuiltin: (type: LedgerType, base: string, fields: CategoryFields & { hidden?: boolean }) => void;
  /** 기본 카테고리를 처음 상태로 되돌린다. */
  resetBuiltin: (type: LedgerType, base: string) => void;
}

const now = () => new Date().toISOString();

export const useLedgerCategoryStore = create<LedgerCategoryStore>()(
  persist(
    (set) => ({
      categories: [],
      addCategory: (type, fields) => {
        const created = { id: crypto.randomUUID(), type, ...fields, createdAt: now() };
        set((state) => ({ categories: [...state.categories, created] }));
        return created;
      },
      updateCategory: (id, fields) =>
        set((state) => ({ categories: state.categories.map((c) => (c.id === id ? { ...c, ...fields } : c)) })),
      deleteCategory: (id) => set((state) => ({ categories: state.categories.filter((c) => c.id !== id) })),
      saveBuiltin: (type, base, { hidden, ...fields }) =>
        set((state) => {
          const id = builtinSettingId(type, base);
          const existing = state.categories.find((c) => c.id === id);
          const next: LedgerCategorySetting = {
            id,
            type,
            base,
            ...fields,
            hidden: hidden || undefined,
            createdAt: existing?.createdAt ?? now(),
          };
          return {
            categories: existing
              ? state.categories.map((c) => (c.id === id ? next : c))
              : [...state.categories, next],
          };
        }),
      resetBuiltin: (type, base) =>
        set((state) => ({ categories: state.categories.filter((c) => c.id !== builtinSettingId(type, base)) })),
    }),
    { name: 'zam-ledger-categories' }
  )
);
