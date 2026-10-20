import { describe, expect, it } from 'vitest';
import type { Budget, Transaction } from '../types';
import {
  budgetAmount,
  budgetStatus,
  setBudgetFrom,
  setBudgetOverride,
  spentCalculator,
  wishBudgetHint,
} from './budget';

const budget = (overrides: Partial<Budget> = {}): Budget => ({
  id: 'total',
  amounts: { '2026-07': 1000000, '2026-10': 800000 },
  createdAt: 'x',
  ...overrides,
});

const tx = (date: string, amount: number, category = 'food'): Transaction => ({
  id: `${date}-${amount}-${category}`,
  type: 'expense',
  amount,
  category,
  date,
  createdAt: 'x',
});

describe('budget', () => {
  it('정한 달부터 다음에 바꾼 달 전까지 같은 금액을 쓰고, 덮어쓴 달은 그 금액을 쓴다', () => {
    const b = budget({ overrides: { '2026-08': 1200000 } });
    expect(budgetAmount(b, '2026-06')).toBe(0);
    expect(budgetAmount(b, '2026-07')).toBe(1000000);
    expect(budgetAmount(b, '2026-08')).toBe(1200000);
    expect(budgetAmount(b, '2026-09')).toBe(1000000);
    expect(budgetAmount(b, '2027-03')).toBe(800000);
    expect(budgetAmount(undefined, '2026-09')).toBe(0);
  });

  it('그 달부터 계속 적용하면 뒤에 정해 둔 금액과 그 달 덮어쓰기를 지운다', () => {
    const b = budget({ overrides: { '2026-08': 1, '2026-09': 2 } });
    expect(setBudgetFrom(b, '2026-09', 900000)).toEqual({
      amounts: { '2026-07': 1000000, '2026-09': 900000 },
      overrides: { '2026-08': 1 },
    });
  });

  it('그 달만 덮어쓰고, null이면 덮어쓰기를 지운다', () => {
    expect(setBudgetOverride(budget(), '2026-09', 0)).toEqual({ overrides: { '2026-09': 0 } });
    expect(setBudgetOverride(budget({ overrides: { '2026-09': 5 } }), '2026-09', null)).toEqual({ overrides: undefined });
  });

  it('남은 금액을 계산하고, 이월을 켜면 켠 달부터 남은 금액·초과분을 다음 달로 넘긴다', () => {
    const spent = spentCalculator(
      [tx('2026-07-03', 700000), tx('2026-08-03', 1300000), tx('2026-09-03', 100000, 'cafe')],
      []
    );
    const b = budget();
    expect(budgetStatus(b, '2026-09', spent)).toEqual({
      budget: 1000000,
      carry: 0,
      available: 1000000,
      spent: 100000,
      remaining: 900000,
    });
    // 7월 +300,000, 8월 -300,000 → 9월 이월 0
    expect(budgetStatus(b, '2026-09', spent, '2026-07')?.carry).toBe(0);
    // 8월부터 켜면 8월 초과분만 넘어온다
    expect(budgetStatus(b, '2026-09', spent, '2026-08')).toMatchObject({ carry: -300000, available: 700000, remaining: 600000 });
    expect(budgetStatus(b, '2026-06', spent)).toBeNull();
  });

  it('카테고리 예산은 그 카테고리 지출만 센다', () => {
    const spent = spentCalculator([tx('2026-09-03', 30000), tx('2026-09-04', 5000, 'cafe')], []);
    const cafe = budget({ id: 'cat-cafe', category: 'cafe', amounts: { '2026-09': 20000 } });
    expect(budgetStatus(cafe, '2026-09', spent)).toMatchObject({ spent: 5000, remaining: 15000 });
  });

  it('위시 가격을 남은 예산과 견준다', () => {
    expect(wishBudgetHint(30000, 300000)).toEqual({ text: '남은 예산의 10%', over: false });
    expect(wishBudgetHint(350000, 300000)).toEqual({ text: '남은 예산보다 50,000원 많아요', over: true });
    expect(wishBudgetHint(1000, -5)).toEqual({ text: '이번 달 예산 초과 중', over: true });
    expect(wishBudgetHint(1000, null)).toBeNull();
    expect(wishBudgetHint(undefined, 1000)).toBeNull();
  });
});
