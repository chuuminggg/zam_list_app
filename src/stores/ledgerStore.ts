import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FixedItem, Transaction } from '../types';

export type NewTransaction = Omit<Transaction, 'id' | 'createdAt'>;
export type NewFixedItem = Omit<FixedItem, 'id' | 'createdAt'>;

interface LedgerStore {
  transactions: Transaction[];
  fixedItems: FixedItem[];
  addTransaction: (transaction: NewTransaction) => void;
  updateTransaction: (id: string, updates: Partial<NewTransaction>) => void;
  deleteTransaction: (id: string) => void;
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
      addTransaction: (transaction) =>
        set((state) => ({ transactions: [...state.transactions, { ...transaction, ...created() }] })),
      updateTransaction: (id, updates) =>
        set((state) => ({
          transactions: state.transactions.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTransaction: (id) =>
        set((state) => ({ transactions: state.transactions.filter((t) => t.id !== id) })),
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
