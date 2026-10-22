import { describe, expect, it } from 'vitest';
import type { FixedItem, Transaction } from '../types';
import { buildStatementEntries, mergeStatementScans, statementNotice, type StatementContext } from './statement';
import type { StatementRow } from './statementText';

const row = (r: Partial<StatementRow> & Pick<StatementRow, 'amount' | 'name'>): StatementRow => ({
  date: '2026-10-21',
  dateUncertain: false,
  type: 'expense',
  detail: '',
  ...r,
});

const tx = (t: Partial<Transaction>): Transaction => ({
  id: crypto.randomUUID(),
  type: 'expense',
  amount: 1000,
  category: 'etc',
  date: '2026-10-01',
  createdAt: '2026-10-01T00:00:00.000Z',
  ...t,
});

const ctx = (over: Partial<StatementContext> = {}): StatementContext => ({
  transactions: [],
  fixedItems: [],
  categories: {
    expense: [
      { id: 'food', name: '식비' },
      { id: 'cafe', name: '카페·간식' },
      { id: 'shopping', name: '쇼핑' },
      { id: 'etc', name: '기타' },
    ],
    income: [
      { id: 'salary', name: '급여' },
      { id: 'etc', name: '기타' },
    ],
  },
  defaultCategory: { expense: 'food', income: 'etc' },
  ...over,
});

describe('statement entries', () => {
  it('여러 장의 겹친 줄은 하나로, 같은 사진 안의 똑같은 줄은 둘 다 둔다', () => {
    const coffee = row({ amount: 4500, name: '메가커피' });
    const merged = mergeStatementScans([
      [coffee, coffee, row({ amount: 3000, name: 'GS25' })],
      [row({ amount: 3000, name: 'GS25' }), row({ amount: 9000, name: '쿠팡' })],
    ]);
    expect(merged.map((r) => r.name)).toEqual(['메가커피', '메가커피', 'GS25', '쿠팡']);
  });

  it('카테고리: 같은 메모로 예전에 고른 값 → 가게 이름 키워드 → 기본값, 수입은 급여 키워드', () => {
    const entries = buildStatementEntries(
      [
        row({ amount: 4500, name: '동네빵집' }),
        row({ amount: 4500, name: '스타벅스' }),
        row({ amount: 7000, name: '알 수 없음' }),
        row({ amount: 3000000, name: '(주)회사 급여', type: 'income' }),
      ],
      ctx({ transactions: [tx({ memo: '동네 빵집', category: 'shopping', date: '2026-09-01' })] })
    );
    expect(entries.map((e) => e.category)).toEqual(['shopping', 'cafe', 'food', 'salary']);
  });

  it('결제수단: 이체·사람 이름은 계좌이체, ATM은 현금, 가맹점은 카드, 수입은 없음', () => {
    const entries = buildStatementEntries(
      [
        row({ amount: 20000, name: '김철수' }),
        row({ amount: 30000, name: '관리비', detail: '자동이체' }),
        row({ amount: 50000, name: 'ATM 출금' }),
        row({ amount: 4500, name: '스타벅스' }),
        row({ amount: 10000, name: '홍길동', type: 'income' }),
      ],
      ctx()
    );
    expect(entries.map((e) => e.paymentMethod)).toEqual(['transfer', 'transfer', 'cash', 'card', undefined]);
  });

  it('취소(원래 결제까지)·돈 이동·이미 있는 내역·고정 항목과 겹치는 줄은 저장하지 않는다', () => {
    const fixed: FixedItem = {
      id: 'f1',
      type: 'expense',
      amount: 55000,
      category: 'telecom',
      name: '휴대폰',
      day: 25,
      startMonth: '2026-01',
      createdAt: '2026-01-01T00:00:00.000Z',
    } as FixedItem;
    const entries = buildStatementEntries(
      [
        row({ amount: 12000, name: '올리브영' }),
        row({ amount: 12000, name: '올리브영', detail: '결제취소' }),
        row({ amount: 500000, name: '신한카드 카드대금' }),
        row({ amount: 4500, name: '메가커피', date: '2026-10-20' }),
        row({ amount: 55000, name: 'SKT', detail: '자동이체' }),
        row({ amount: 8000, name: '김밥천국' }),
      ],
      ctx({ transactions: [tx({ amount: 4500, date: '2026-10-20' })], fixedItems: [fixed] })
    );
    expect(entries.map((e) => [e.flag, e.checked])).toEqual([
      ['cancelled', false],
      ['cancelled', false],
      ['moving', false],
      ['duplicate', false],
      ['fixed', false],
      [null, true],
    ]);
    expect(statementNotice(entries)).toBe('1건 추가했어요 · 건너뜀 취소 2·돈 이동 1·이미 있음 1·고정 항목 1');
  });

  it('안내: 날짜를 짐작한 줄 수, 저장할 줄이 없을 때', () => {
    const entries = buildStatementEntries(
      [row({ amount: 3000, name: 'GS25', dateUncertain: true }), row({ amount: 4000, name: 'CU' })],
      ctx()
    );
    expect(statementNotice(entries)).toBe('2건 추가했어요 · 날짜 확인 1건');
    expect(statementNotice(entries.map((e) => ({ ...e, checked: false, flag: 'duplicate' as const })))).toBe(
      '새로 추가할 내역이 없어요 · 건너뜀 이미 있음 2'
    );
  });
});
