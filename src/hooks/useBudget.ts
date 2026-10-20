import { useMemo } from 'react';
import { useBudgetStore } from '../stores/budgetStore';
import { useLedgerStore } from '../stores/ledgerStore';
import { TOTAL_BUDGET_ID, budgetStatus, spentCalculator, type BudgetStatus } from '../utils/budget';
import type { MonthKey } from '../utils/ledger';

/** 그 달 총예산과 카테고리별 예산 현황 */
export function useBudget(month: MonthKey) {
  const budgets = useBudgetStore((s) => s.budgets);
  const transactions = useLedgerStore((s) => s.transactions);
  const fixedItems = useLedgerStore((s) => s.fixedItems);

  return useMemo(() => {
    const spent = spentCalculator(transactions, fixedItems);
    const total = budgets.find((b) => b.id === TOTAL_BUDGET_ID);
    const carryoverFrom = total?.carryoverFrom;
    const totalStatus = budgetStatus(total, month, spent, carryoverFrom);
    const categories: { category: string; status: BudgetStatus }[] = [];
    if (totalStatus && total?.byCategory) {
      for (const budget of budgets) {
        if (budget.category === undefined) continue;
        const status = budgetStatus(budget, month, spent, carryoverFrom);
        if (status) categories.push({ category: budget.category, status });
      }
    }
    return { budgets, total, totalStatus, categories };
  }, [budgets, transactions, fixedItems, month]);
}
