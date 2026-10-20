import type { Budget, FixedItem, Transaction } from '../types';
import { addMonths, entriesForMonth, summarize, type MonthKey } from './ledger';

/** 총예산 문서 id */
export const TOTAL_BUDGET_ID = 'total';

/** 카테고리 예산 문서 id */
export function categoryBudgetId(category: string): string {
  return `cat-${category}`;
}

/** 이월을 거슬러 계산할 최대 개월 수 */
const MAX_CARRYOVER_MONTHS = 120;

/** 그 달 예산 (원). 0이면 예산 없음. 그 달만 덮어쓴 값이 있으면 그것, 아니면 그 달 이전 가장 최근에 정한 금액 */
export function budgetAmount(budget: Budget | undefined, month: MonthKey): number {
  if (!budget) return 0;
  const override = budget.overrides?.[month];
  if (override !== undefined) return override;
  let from = '';
  let amount = 0;
  for (const [key, value] of Object.entries(budget.amounts)) {
    if (key <= month && key > from) {
      from = key;
      amount = value;
    }
  }
  return amount;
}

/** 그 달부터 계속 적용할 금액을 정한다. 그 뒤에 정해 둔 금액과 그 달의 덮어쓰기는 지운다. */
export function setBudgetFrom(budget: Budget, month: MonthKey, amount: number): Pick<Budget, 'amounts' | 'overrides'> {
  const amounts = Object.fromEntries(Object.entries(budget.amounts).filter(([key]) => key < month));
  amounts[month] = amount;
  const overrides = Object.fromEntries(Object.entries(budget.overrides ?? {}).filter(([key]) => key !== month));
  return { amounts, overrides: Object.keys(overrides).length > 0 ? overrides : undefined };
}

/** 그 달만 금액을 덮어쓴다. amount가 null이면 덮어쓰기를 지운다. */
export function setBudgetOverride(budget: Budget, month: MonthKey, amount: number | null): Pick<Budget, 'overrides'> {
  const overrides = { ...budget.overrides };
  if (amount === null) delete overrides[month];
  else overrides[month] = amount;
  return { overrides: Object.keys(overrides).length > 0 ? overrides : undefined };
}

export interface BudgetStatus {
  /** 그 달 예산 */
  budget: number;
  /** 지난달까지 남거나(+) 넘친(-) 금액 */
  carry: number;
  /** 쓸 수 있는 금액 = 예산 + 이월 */
  available: number;
  spent: number;
  /** 남은 금액. 음수면 초과 */
  remaining: number;
}

/** 위시 가격을 이번 달 남은 예산과 견준 한 줄. 예산이 없으면 null */
export function wishBudgetHint(price: number | undefined, remaining: number | null): { text: string; over: boolean } | null {
  if (remaining === null || price == null || price <= 0) return null;
  if (remaining <= 0) return { text: '이번 달 예산 초과 중', over: true };
  if (price > remaining) {
    return { text: `남은 예산보다 ${(price - remaining).toLocaleString('ko-KR')}원 많아요`, over: true };
  }
  return { text: `남은 예산의 ${Math.max(1, Math.round((price / remaining) * 100))}%`, over: false };
}

/** 그 달 지출 (원). category를 주면 그 카테고리만. 건너뛴 고정 항목은 뺀다. */
export type SpentFn = (month: MonthKey, category?: string) => number;

export function spentCalculator(transactions: Transaction[], fixedItems: FixedItem[]): SpentFn {
  const cache = new Map<MonthKey, ReturnType<typeof summarize>>();
  return (month, category) => {
    let summary = cache.get(month);
    if (!summary) {
      summary = summarize(entriesForMonth(transactions, fixedItems, month));
      cache.set(month, summary);
    }
    if (category === undefined) return summary.expense;
    return summary.expenseByCategory.find((c) => c.category === category)?.amount ?? 0;
  };
}

/**
 * 그 달 예산 현황. 이월을 켰으면(carryoverFrom) 그 달부터 지난달까지 예산이 있던 달의 남은 금액·초과분을 더한다.
 * 예산이 없으면 null.
 */
export function budgetStatus(
  budget: Budget | undefined,
  month: MonthKey,
  spent: SpentFn,
  carryoverFrom?: MonthKey
): BudgetStatus | null {
  const amount = budgetAmount(budget, month);
  if (!budget || amount <= 0) return null;
  const category = budget.category;

  let carry = 0;
  if (carryoverFrom && carryoverFrom < month) {
    let from = carryoverFrom;
    const earliest = addMonths(month, -MAX_CARRYOVER_MONTHS);
    if (from < earliest) from = earliest;
    for (let k = from; k < month; k = addMonths(k, 1)) {
      const monthBudget = budgetAmount(budget, k);
      if (monthBudget > 0) carry += monthBudget - spent(k, category);
    }
  }

  const used = spent(month, category);
  const available = amount + carry;
  return { budget: amount, carry, available, spent: used, remaining: available - used };
}
