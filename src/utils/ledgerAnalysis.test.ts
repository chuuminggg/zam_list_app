import { describe, expect, it } from 'vitest';
import type { FixedItem, Transaction } from '../types';
import { entriesForMonth, summarize } from './ledger';
import {
  EMPTY_FILTER,
  allEntries,
  categoryChanges,
  change,
  entryTotals,
  expenseChangeText,
  filterEntries,
  isFilterActive,
  monthlyTrend,
} from './ledgerAnalysis';

const fixed = (overrides: Partial<FixedItem> = {}): FixedItem => ({
  id: 'f',
  type: 'expense',
  name: '월세',
  amount: 500000,
  category: 'housing',
  day: 1,
  startMonth: '2026-08',
  createdAt: 'x',
  ...overrides,
});

const tx = (date: string, amount: number, overrides: Partial<Transaction> = {}): Transaction => ({
  id: `${date}-${amount}`,
  type: 'expense',
  amount,
  category: 'food',
  date,
  createdAt: 'x',
  ...overrides,
});

describe('ledger analysis', () => {
  it('최근 N개월 수입·지출을 오래된 달부터 모은다 (고정 항목 포함)', () => {
    const transactions = [tx('2026-09-03', 10000), tx('2026-10-05', 3000000, { type: 'income', category: 'salary' })];
    expect(monthlyTrend(transactions, [fixed()], '2026-10', 4)).toEqual([
      { month: '2026-07', income: 0, expense: 0 },
      { month: '2026-08', income: 0, expense: 500000 },
      { month: '2026-09', income: 0, expense: 510000 },
      { month: '2026-10', income: 3000000, expense: 500000 },
    ]);
  });

  it('전월 대비 증감과 문구를 만든다', () => {
    expect(change(120000, 100000)).toEqual({ diff: 20000, percent: 20 });
    expect(change(5000, 0)).toEqual({ diff: 5000, percent: null });
    expect(expenseChangeText(change(120000, 100000))).toBe('지난달보다 20,000원(20%) 더 썼어요');
    expect(expenseChangeText(change(80000, 100000))).toBe('지난달보다 20,000원(20%) 덜 썼어요');
    expect(expenseChangeText(change(5000, 0))).toBe('지난달보다 5,000원 더 썼어요');
    expect(expenseChangeText(change(0, 0))).toBe('지난달과 똑같이 썼어요');
  });

  it('카테고리별 증감은 이번 달에 쓴 카테고리만 지난달과 견준다', () => {
    const transactions = [
      tx('2026-09-03', 10000),
      tx('2026-09-04', 7000, { category: 'cafe' }),
      tx('2026-10-03', 15000),
      tx('2026-10-04', 2000, { category: 'transport' }),
    ];
    const month = (m: string) => summarize(entriesForMonth(transactions, [], m));
    const changes = categoryChanges(month('2026-10'), month('2026-09'));
    expect([...changes]).toEqual([
      ['food', { diff: 5000, percent: 50 }],
      ['transport', { diff: 2000, percent: null }],
    ]);
  });

  it('검색어·종류·카테고리·결제수단으로 거른다', () => {
    const transactions = [
      tx('2026-10-01', 4500, { memo: '스타벅스 라떼', category: 'cafe', paymentMethod: 'card' }),
      tx('2026-10-02', 9000, { memo: '점심', paymentMethod: 'cash' }),
      tx('2026-10-03', 12000),
      tx('2026-10-04', 50000, { type: 'income', category: 'etc', memo: '중고 판매' }),
    ];
    const entries = entriesForMonth(transactions, [fixed()], '2026-10');
    const names: Record<string, string> = { cafe: '카페·간식', food: '식비', housing: '주거', etc: '기타' };
    const run = (f: Partial<typeof EMPTY_FILTER>) =>
      filterEntries(entries, { ...EMPTY_FILTER, ...f }, (e) => names[e.category]).map((e) => e.amount);

    expect(run({})).toHaveLength(5);
    expect(run({ query: '라떼' })).toEqual([4500]);
    expect(run({ query: '식비' })).toEqual([12000, 9000]);
    expect(run({ query: '월세' })).toEqual([500000]);
    expect(run({ type: 'income' })).toEqual([50000]);
    expect(run({ type: 'expense', category: 'food' })).toEqual([12000, 9000]);
    expect(run({ paymentMethod: 'card' })).toEqual([4500]);
    // 미지정은 지출만 (수입은 결제수단이 없지만 빠진다)
    expect(run({ paymentMethod: 'unset' })).toEqual([12000, 500000]);
  });

  it('조건이 있는지, 합계는 건너뛴 고정 항목을 빼고 센다', () => {
    expect(isFilterActive(EMPTY_FILTER)).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTER, query: '  ' })).toBe(false);
    expect(isFilterActive({ ...EMPTY_FILTER, scope: 'all' })).toBe(true);

    const entries = entriesForMonth(
      [tx('2026-10-02', 9000), tx('2026-10-04', 50000, { type: 'income' })],
      [fixed({ overrides: { '2026-10': { skip: true } } })],
      '2026-10'
    );
    expect(entryTotals(entries)).toEqual({ income: 50000, expense: 9000 });
  });

  it('전체 기간은 가장 오래된 기록 달부터 최근 날짜 순으로 모은다', () => {
    const transactions = [tx('2026-06-10', 1000), tx('2026-11-02', 2000)];
    const entries = allEntries(transactions, [fixed({ startMonth: '2026-09', endMonth: '2026-09' })], '2026-10');
    expect(entries.map((e) => e.date)).toEqual(['2026-11-02', '2026-09-01', '2026-06-10']);
  });
});
