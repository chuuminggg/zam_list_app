import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FixedItem, LedgerType, Transaction } from '../types';

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;
export type NewFixedItem = Omit<FixedItem, 'id' | 'createdAt'>;

interface LedgerStore {
  transactions: Transaction[];
  fixedItems: FixedItem[];
  /** 새 내역을 추가하고 만든 내역을 돌려준다. */
  addTransaction: (transaction: NewTransaction) => Transaction;
  /** 여러 내역을 한 번에 추가하고 만든 내역들을 돌려준다 (거래 내역 캡처 등). */
  addTransactions: (transactions: NewTransaction[]) => Transaction[];
  updateTransaction: (id: string, updates: Partial<NewTransaction>) => void;
  deleteTransaction: (id: string) => void;
  /** 지웠던 내역을 id 그대로 되살린다 (되돌리기). 이미 있는 id는 건너뛴다. */
  restoreTransactions: (transactions: Transaction[]) => void;
  addFixedItem: (item: NewFixedItem) => void;
  updateFixedItem: (id: string, updates: Partial<NewFixedItem>) => void;
  deleteFixedItem: (id: string) => void;
  /** 한 구분(수입/지출)의 내역·고정 항목 카테고리를 다른 카테고리로 옮긴다 (카테고리 삭제 시). */
  moveCategory: (type: LedgerType, from: string, to: string) => void;
}

const created = () => ({ id: crypto.randomUUID(), createdAt: new Date().toISOString() });

export const useLedgerStore = create<LedgerStore>()(
  persist(
    (set) => ({
      transactions: [],
      fixedItems: [],
      addTransaction: (transaction) => {
        const next = { ...transaction, ...created() };
        set((state) => ({ transactions: [...state.transactions, next] }));
        return next;
      },
      addTransactions: (transactions) => {
        const next = transactions.map((t) => ({ ...t, ...created() }));
        set((state) => ({ transactions: [...state.transactions, ...next] }));
        return next;
      },
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTransaction: (id) =>
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) })),
      restoreTransactions: (restored) =>
        set((state) => {
          const ids = new Set(state.transactions.map((t) => t.id));
          return { transactions: [...state.transactions, ...restored.filter((t) => !ids.has(t.id))] };
        }),
      addFixedItem: (item) =>
        set((state) => ({ fixedItems: [...state.fixedItems, { ...item, ...created() }] })),
      updateFixedItem: (id, updates) =>
        set((state) => ({
          fixedItems: state.fixedItems.map((f) => (f.id === id ? { ...f, ...updates } : f)),
        })),
      deleteFixedItem: (id) =>
        set((state) => ({ fixedItems: state.fixedItems.filter((f) => f.id !== id) })),
      moveCategory: (type, from, to) =>
        set((state) => {
          const move = <T extends { type: LedgerType; category: string }>(item: T): T =>
            item.type === type && item.category === from ? { ...item, category: to } : item;
          return { transactions: state.transactions.map(move), fixedItems: state.fixedItems.map(move) };
        }),
    }),
    { name: 'zam-ledger' }
  )
);
