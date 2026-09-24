import type { FixedItem, LedgerType, Transaction } from '../types';
import { toDateKey } from './date';

/** 월 키: `YYYY-MM` */
export type MonthKey = string;

/** 한 달 화면에 보여줄 내역 한 줄. 고정 항목은 그 달 날짜로 계산해 만든다. */
export interface LedgerEntry {
  /** 일반 내역은 내역 id, 고정 항목은 `fixed-<id>` */
  key: string;
  type: LedgerType;
  amount: number;
  category: string;
  date: string;
  /** 일반 내역은 메모, 고정 항목은 이름 */
  label?: string;
  fixed: boolean;
  /** 일반 내역이면 원본 */
  transaction?: Transaction;
}

export interface MonthSummary {
  income: number;
  expense: number;
  fixedIncome: number;
  fixedExpense: number;
  balance: number;
  /** 지출 카테고리별 합계 (큰 순) */
  expenseByCategory: { category: string; amount: number }[];
}

const pad = (n: number) => String(n).padStart(2, '0');

export function monthKey(date: Date): MonthKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}`;
}

export function addMonths(month: MonthKey, offset: number): MonthKey {
  const [y, m] = month.split('-').map(Number);
  return monthKey(new Date(y, m - 1 + offset, 1));
}

/** 예: "2026년 9월" */
export function formatMonth(month: MonthKey): string {
  const [y, m] = month.split('-').map(Number);
  return `${y}년 ${m}월`;
}

/** 예: "1,234,000원" */
export function formatWon(amount: number): string {
  return `${amount.toLocaleString('ko-KR')}원`;
}

/** 달력 칸처럼 좁은 곳에 쓰는 짧은 금액. 예: 8,000 / 1.2만 / 3억 */
export function formatShortWon(amount: number): string {
  const trim = (n: number) => String(Math.round(n * 10) / 10);
  if (amount >= 100_000_000) return `${trim(amount / 100_000_000)}억`;
  if (amount >= 10_000) return `${trim(amount / 10_000)}만`;
  return amount.toLocaleString('ko-KR');
}

/** 날짜별 수입·지출 합계 */
export function dailyTotals(entries: LedgerEntry[]): Map<string, { income: number; expense: number }> {
  const map = new Map<string, { income: number; expense: number }>();
  for (const entry of entries) {
    const day = map.get(entry.date) ?? { income: 0, expense: 0 };
    day[entry.type] += entry.amount;
    map.set(entry.date, day);
  }
  return map;
}

/** 그 달에 적용되는 고정 항목을 내역으로 만든다. 없는 날(예: 2월 31일)은 말일로 맞춘다. */
export function fixedEntriesForMonth(items: FixedItem[], month: MonthKey): LedgerEntry[] {
  const [y, m] = month.split('-').map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  return items
    .filter((f) => f.startMonth <= month && (!f.endMonth || month <= f.endMonth))
    .map((f) => ({
      key: `fixed-${f.id}`,
      type: f.type,
      amount: f.amount,
      category: f.category,
      date: toDateKey(new Date(y, m - 1, Math.min(f.day, lastDay))),
      label: f.name,
      fixed: true,
    }));
}

/** 그 달의 일반 내역과 고정 항목을 합쳐 최근 날짜부터 정렬한다. 같은 날이면 고정 항목을 먼저 둔다. */
export function entriesForMonth(transactions: Transaction[], fixedItems: FixedItem[], month: MonthKey): LedgerEntry[] {
  const regular: LedgerEntry[] = transactions
    .filter((t) => t.date.startsWith(`${month}-`))
    .map((t) => ({
      key: t.id,
      type: t.type,
      amount: t.amount,
      category: t.category,
      date: t.date,
      label: t.memo,
      fixed: false,
      transaction: t,
    }));
  return [...fixedEntriesForMonth(fixedItems, month), ...regular].sort(
    (a, b) => b.date.localeCompare(a.date) || Number(b.fixed) - Number(a.fixed)
  );
}

export function summarize(entries: LedgerEntry[]): MonthSummary {
  let income = 0;
  let expense = 0;
  let fixedIncome = 0;
  let fixedExpense = 0;
  const byCategory = new Map<string, number>();
  for (const entry of entries) {
    if (entry.type === 'income') {
      income += entry.amount;
      if (entry.fixed) fixedIncome += entry.amount;
    } else {
      expense += entry.amount;
      if (entry.fixed) fixedExpense += entry.amount;
      byCategory.set(entry.category, (byCategory.get(entry.category) ?? 0) + entry.amount);
    }
  }
  return {
    income,
    expense,
    fixedIncome,
    fixedExpense,
    balance: income - expense,
    expenseByCategory: [...byCategory]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount),
  };
}

/** 금액 입력값(쉼표 허용)을 원 단위 정수로. 올바르지 않으면 null */
export function parseAmount(value: string): number | null {
  const amount = Number(value.replace(/[,\s]/g, ''));
  return Number.isInteger(amount) && amount > 0 ? amount : null;
}
