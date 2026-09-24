import { describe, expect, it } from 'vitest';
import type { FixedItem, Transaction } from '../types';
import { addMonths, entriesForMonth, fixedEntriesForMonth, formatWon, summarize } from './ledger';

const fixed = (overrides: Partial<FixedItem>): FixedItem => ({
  id: 'f',
  type: 'expense',
  name: '월세',
  amount: 500000,
  category: 'housing',
  day: 1,
  startMonth: '2026-01',
  createdAt: '2026-01-01T00:00:00Z',
  ...overrides,
});

const tx = (overrides: Partial<Transaction>): Transaction => ({
  id: 't',
  type: 'expense',
  amount: 10000,
  category: 'food',
  date: '2026-09-10',
  createdAt: '2026-09-10T00:00:00Z',
  ...overrides,
});

describe('ledger utils', () => {
  it('월을 넘기면 연도도 바뀐다', () => {
    expect(addMonths('2026-12', 1)).toBe('2027-01');
    expect(addMonths('2026-01', -1)).toBe('2025-12');
  });

  it('고정 항목은 시작 월부터 종료 월까지만 들어간다', () => {
    const items = [fixed({ id: 'a', startMonth: '2026-09' }), fixed({ id: 'b', endMonth: '2026-08' })];
    expect(fixedEntriesForMonth(items, '2026-08').map((e) => e.key)).toEqual(['fixed-b']);
    expect(fixedEntriesForMonth(items, '2026-09').map((e) => e.key)).toEqual(['fixed-a']);
  });

  it('그 달에 없는 날은 말일로 맞춘다', () => {
    expect(fixedEntriesForMonth([fixed({ day: 31 })], '2026-02')[0].date).toBe('2026-02-28');
    expect(fixedEntriesForMonth([fixed({ day: 31 })], '2026-03')[0].date).toBe('2026-03-31');
  });

  it('고정/변동을 나눠 합계와 잔액, 카테고리별 지출을 계산한다', () => {
    const entries = entriesForMonth(
      [
        tx({ id: 't1', amount: 30000 }),
        tx({ id: 't2', amount: 20000, category: 'cafe' }),
        tx({ id: 't3', type: 'income', amount: 50000, category: 'side' }),
        tx({ id: 'other-month', date: '2026-10-01' }),
      ],
      [fixed({ id: 'rent' }), fixed({ id: 'pay', type: 'income', amount: 3000000, category: 'salary', day: 25 })],
      '2026-09'
    );
    expect(entries.map((e) => e.key)).toEqual(['fixed-pay', 't1', 't2', 't3', 'fixed-rent']);

    const summary = summarize(entries);
    expect(summary).toMatchObject({
      income: 3050000,
      fixedIncome: 3000000,
      expense: 550000,
      fixedExpense: 500000,
      balance: 2500000,
    });
    expect(summary.expenseByCategory).toEqual([
      { category: 'housing', amount: 500000 },
      { category: 'food', amount: 30000 },
      { category: 'cafe', amount: 20000 },
    ]);
  });

  it('금액을 원 단위로 표시한다', () => {
    expect(formatWon(1234000)).toBe('1,234,000원');
  });
});
