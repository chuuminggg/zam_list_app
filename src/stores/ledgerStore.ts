import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FixedItem, Transaction } from '../types';

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;
export type NewFixedItem = Omit<FixedItem, 'id' | 'createdAt'>;

interface LedgerStore {
  transactions: Transaction[];
  fixedItems: FixedItem[];
  /** 새 내역을 추가하고 만든 내역을 돌려준다. */
  addTransaction: (transaction: NewTransaction) => Transaction;
  updateTransaction: (id: string, updates: Partial<NewTransaction>) => void;
  deleteTransaction: (id: string) => void;
  /** 지웠던 내역을 id 그대로 되살린다 (되돌리기). 이미 있는 id는 건너뛴다. */
  restoreTransactions: (transactions: Transaction[]) => void;
  addFixedItem: (item: NewFixedItem) => void;
  updateFixedItem: (id: string, updates: Partial<NewFixedItem>) => void;
  deleteFixedItem: (id: string) => void;
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
    }),
    { name: 'zam-ledger' }
  )
);
