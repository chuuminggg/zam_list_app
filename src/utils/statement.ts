import type { FixedItem, LedgerType, PaymentMethod, Transaction } from '../types';
import { entriesForMonth } from './ledger';
import { guessCategory, type ReceiptCategoryOption } from './receiptText';
import type { StatementRow } from './statementText';

/** 자동 저장에서 건너뛰는 까닭 */
export type StatementFlag = 'cancelled' | 'moving' | 'duplicate' | 'fixed';

const SKIP_LABEL: Record<StatementFlag, string> = {
  cancelled: '취소',
  moving: '돈 이동',
  duplicate: '이미 있음',
  fixed: '고정 항목',
};

/** 읽은 거래 한 줄 (가계부에 넣을 후보) */
export interface StatementEntry {
  key: string;
  /** 저장할 줄인지 (flag가 없으면 true) */
  checked: boolean;
  flag: StatementFlag | null;
  dateUncertain: boolean;
  type: LedgerType;
  amount: number;
  category: string;
  date: string;
  memo: string;
  paymentMethod?: PaymentMethod;
}

export interface StatementContext {
  transactions: Transaction[];
  fixedItems: FixedItem[];
  /** 고를 수 있는 카테고리 (숨긴 것 제외) */
  categories: Record<LedgerType, ReceiptCategoryOption[]>;
  /** 짐작하지 못했을 때 쓸 카테고리 */
  defaultCategory: Record<LedgerType, string>;
}

/** 실제 소비·수입이 아닌 내 돈 이동 (카드값 출금, 충전, 내 계좌·저축·투자 이체) */
const MOVING = /카드대금|카드값|결제대금|충전|내계좌|본인계좌|적금|저축|증권|투자|청약|CMA/i;
const CANCELLED = /취소/;

const INCOME_KEYWORDS: [string, RegExp][] = [
  ['salary', /급여|월급|상여|성과급/],
  ['finance', /이자|배당|캐시백/],
  ['allowance', /용돈/],
];

const compact = (text: string) => text.replace(/\s+/g, '');
const rowKey = (row: Pick<StatementRow, 'date' | 'type' | 'amount' | 'name'>) =>
  `${row.date}|${row.type}|${row.amount}|${compact(row.name)}`;

/** 같은 키가 여러 번 나와도 하나씩 짝지어 지우는 묶음 */
function multiset(keys: string[]) {
  const counts = new Map<string, number>();
  for (const key of keys) counts.set(key, (counts.get(key) ?? 0) + 1);
  return {
    take(key: string): boolean {
      const n = counts.get(key) ?? 0;
      if (n === 0) return false;
      counts.set(key, n - 1);
      return true;
    },
  };
}

/**
 * 여러 장의 결과를 합친다. 스크롤 캡처는 위아래가 겹치므로 앞 사진들에 이미 있는 줄(날짜·종류·금액·이름이 같은)은 뺀다.
 * 같은 사진 안의 똑같은 줄은 실제로 두 번 쓴 것이라 그대로 둔다.
 */
export function mergeStatementScans(scans: StatementRow[][]): StatementRow[] {
  const merged: StatementRow[] = [];
  for (const rows of scans) {
    const earlier = multiset(merged.map(rowKey));
    merged.push(...rows.filter((row) => !earlier.take(rowKey(row))));
  }
  return merged;
}

/** 같은 메모로 가장 최근에 고른 카테고리 (종류별) */
function categoryHistory(transactions: Transaction[]) {
  const latest = new Map<string, Transaction>();
  for (const t of transactions) {
    if (!t.memo) continue;
    const key = `${t.type}|${compact(t.memo)}`;
    const seen = latest.get(key);
    if (!seen || t.date > seen.date || (t.date === seen.date && t.createdAt > seen.createdAt)) latest.set(key, t);
  }
  return (type: LedgerType, name: string) => latest.get(`${type}|${compact(name)}`)?.category;
}

function chooseCategory(row: StatementRow, ctx: StatementContext, history: ReturnType<typeof categoryHistory>): string {
  const options = ctx.categories[row.type];
  const ids = new Set(options.map((c) => c.id));
  const previous = row.name ? history(row.type, row.name) : undefined;
  if (previous && ids.has(previous)) return previous;
  if (row.type === 'expense') return guessCategory(row.name, [], options) ?? ctx.defaultCategory.expense;
  const text = `${row.name} ${row.detail}`;
  const income = INCOME_KEYWORDS.find(([id, pattern]) => ids.has(id) && pattern.test(text));
  return income?.[0] ?? ctx.defaultCategory.income;
}

/** 지출 결제수단: 이체·송금이나 사람 이름이면 계좌이체, ATM·현금이면 현금, 그 외(가맹점)는 카드 */
function choosePaymentMethod(row: StatementRow, ctx: StatementContext): PaymentMethod {
  const text = compact(`${row.name} ${row.detail}`);
  if (/ATM|현금/i.test(text)) return 'cash';
  if (/이체|송금|보냄/.test(text)) return 'transfer';
  const name = compact(row.name);
  if (/^[가-힣]{2,4}$/.test(name) && guessCategory(name, [], ctx.categories.expense) === null) return 'transfer';
  return 'card';
}

/**
 * 읽은 거래 줄을 가계부 후보로 만든다. 카테고리·결제수단을 채우고,
 * 취소·돈 이동·가계부에 이미 있는 내역·고정 항목과 겹치는 줄은 저장하지 않도록 표시한다.
 */
export function buildStatementEntries(rows: StatementRow[], ctx: StatementContext): StatementEntry[] {
  const history = categoryHistory(ctx.transactions);
  const flags: (StatementFlag | null)[] = rows.map((row) => {
    const text = compact(`${row.name} ${row.detail}`);
    if (CANCELLED.test(text)) return 'cancelled';
    if (MOVING.test(text)) return 'moving';
    return null;
  });

  // 취소 줄마다 같은 금액의 원래 결제 한 건도 함께 뺀다.
  rows.forEach((row, i) => {
    if (flags[i] !== 'cancelled') return;
    const original = rows.findIndex((r, j) => flags[j] === null && r.amount === row.amount);
    if (original >= 0) flags[original] = 'cancelled';
  });

  const existing = multiset(ctx.transactions.map((t) => `${t.date}|${t.type}|${t.amount}`));
  const fixedByMonth = new Map<string, ReturnType<typeof multiset>>();
  const fixedFor = (month: string) => {
    let set = fixedByMonth.get(month);
    if (!set) {
      const fixed = entriesForMonth([], ctx.fixedItems, month).filter((e) => e.fixed && !e.skipped);
      set = multiset(fixed.map((e) => `${e.type}|${e.amount}`));
      fixedByMonth.set(month, set);
    }
    return set;
  };

  return rows.map((row, i) => {
    let flag = flags[i];
    if (flag === null && existing.take(`${row.date}|${row.type}|${row.amount}`)) flag = 'duplicate';
    if (flag === null && fixedFor(row.date.slice(0, 7)).take(`${row.type}|${row.amount}`)) flag = 'fixed';
    return {
      key: `${i}`,
      checked: flag === null,
      flag,
      dateUncertain: row.dateUncertain,
      type: row.type,
      amount: row.amount,
      category: chooseCategory(row, ctx, history),
      date: row.date,
      memo: row.name,
      paymentMethod: row.type === 'expense' ? choosePaymentMethod(row, ctx) : undefined,
    };
  });
}

/**
 * 자동 저장 뒤 안내. 건너뛴 까닭별 건수와 날짜를 짐작한 건수를 붙인다.
 * 예: "3건 추가했어요 · 건너뜀 이미 있음 2·돈 이동 1 · 날짜 확인 1건"
 */
export function statementNotice(entries: StatementEntry[]): string {
  const saved = entries.filter((e) => e.checked);
  const skipped = new Map<StatementFlag, number>();
  for (const e of entries) if (e.flag) skipped.set(e.flag, (skipped.get(e.flag) ?? 0) + 1);
  const parts = [saved.length > 0 ? `${saved.length}건 추가했어요` : '새로 추가할 내역이 없어요'];
  if (skipped.size > 0) {
    parts.push(`건너뜀 ${[...skipped].map(([flag, n]) => `${SKIP_LABEL[flag]} ${n}`).join('·')}`);
  }
  const uncertain = saved.filter((e) => e.dateUncertain).length;
  if (uncertain > 0) parts.push(`날짜 확인 ${uncertain}건`);
  return parts.join(' · ');
}
