import type { FixedItem, LedgerType, PaymentMethod, Transaction } from '../types';
import { addMonths, entriesForMonth, summarize, type LedgerEntry, type MonthKey, type MonthSummary } from './ledger';

export interface TrendPoint {
  month: MonthKey;
  income: number;
  expense: number;
}

/** end 달까지 최근 count개월 수입·지출 (오래된 달부터) */
export function monthlyTrend(
  transactions: Transaction[],
  fixedItems: FixedItem[],
  end: MonthKey,
  count: number
): TrendPoint[] {
  const points: TrendPoint[] = [];
  for (let i = count - 1; i >= 0; i--) {
    const month = addMonths(end, -i);
    const { income, expense } = summarize(entriesForMonth(transactions, fixedItems, month));
    points.push({ month, income, expense });
  }
  return points;
}

export interface Change {
  /** 이번 값 - 지난 값 */
  diff: number;
  /** 지난 값 대비 증감률(%). 지난 값이 0이면 null */
  percent: number | null;
}

export function change(current: number, previous: number): Change {
  return { diff: current - previous, percent: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null };
}

/** 카테고리별 지출 증감. 이번 달에 쓴 카테고리만 */
export function categoryChanges(current: MonthSummary, previous: MonthSummary): Map<string, Change> {
  const before = new Map(previous.expenseByCategory.map((c) => [c.category, c.amount]));
  return new Map(current.expenseByCategory.map((c) => [c.category, change(c.amount, before.get(c.category) ?? 0)]));
}

/** 전월 대비 한 줄. 예: "지난달보다 12,000원(15%) 더 썼어요" */
export function expenseChangeText({ diff, percent }: Change): string {
  if (diff === 0) return '지난달과 똑같이 썼어요';
  const amount = `${Math.abs(diff).toLocaleString('ko-KR')}원${percent === null ? '' : `(${Math.abs(percent)}%)`}`;
  return `지난달보다 ${amount} ${diff > 0 ? '더' : '덜'} 썼어요`;
}

export type LedgerScope = 'month' | 'all';

export interface LedgerFilter {
  /** 메모·고정 항목 이름·카테고리 이름 검색어 */
  query: string;
  type: LedgerType | 'all';
  /** 카테고리 id. type을 고른 뒤에만 쓴다 */
  category: string | null;
  /** 'unset'은 결제수단 미지정 지출 */
  paymentMethod: PaymentMethod | 'unset' | null;
  scope: LedgerScope;
}

export const EMPTY_FILTER: LedgerFilter = { query: '', type: 'all', category: null, paymentMethod: null, scope: 'month' };

/** 검색어나 조건이 하나라도 있으면 true (범위만 바꾼 것도 포함) */
export function isFilterActive(filter: LedgerFilter): boolean {
  return (
    filter.query.trim() !== '' ||
    filter.type !== 'all' ||
    filter.category !== null ||
    filter.paymentMethod !== null ||
    filter.scope !== 'month'
  );
}

/** 결제수단 조건은 지출에만 걸린다. categoryName은 카테고리 이름 검색에 쓴다. */
export function filterEntries(
  entries: LedgerEntry[],
  filter: LedgerFilter,
  categoryName: (entry: LedgerEntry) => string
): LedgerEntry[] {
  const query = filter.query.trim().toLowerCase();
  return entries.filter((entry) => {
    if (filter.type !== 'all' && entry.type !== filter.type) return false;
    if (filter.category !== null && entry.category !== filter.category) return false;
    if (filter.paymentMethod !== null) {
      if (entry.type !== 'expense') return false;
      if ((entry.paymentMethod ?? 'unset') !== filter.paymentMethod) return false;
    }
    if (query) {
      const text = `${entry.label ?? ''} ${categoryName(entry)}`.toLowerCase();
      if (!text.includes(query)) return false;
    }
    return true;
  });
}

/** 전체 기간을 거슬러 볼 최대 개월 수 */
const MAX_SCOPE_MONTHS = 240;

/** 가장 오래된 기록 달부터 latest 달(또는 더 뒤 기록이 있으면 그 달)까지 모든 내역 (최근 날짜부터) */
export function allEntries(transactions: Transaction[], fixedItems: FixedItem[], latest: MonthKey): LedgerEntry[] {
  let first = latest;
  let last = latest;
  for (const t of transactions) {
    const month = t.date.slice(0, 7);
    if (month < first) first = month;
    if (month > last) last = month;
  }
  for (const item of fixedItems) if (item.startMonth < first) first = item.startMonth;
  const earliest = addMonths(last, -(MAX_SCOPE_MONTHS - 1));
  if (first < earliest) first = earliest;

  const entries: LedgerEntry[] = [];
  for (let month = last; month >= first; month = addMonths(month, -1)) {
    entries.push(...entriesForMonth(transactions, fixedItems, month));
  }
  return entries;
}

/** 걸러낸 내역 합계 (건너뛴 고정 항목은 뺀다) */
export function entryTotals(entries: LedgerEntry[]): { income: number; expense: number } {
  const totals = { income: 0, expense: 0 };
  for (const entry of entries) if (!entry.skipped) totals[entry.type] += entry.amount;
  return totals;
}
