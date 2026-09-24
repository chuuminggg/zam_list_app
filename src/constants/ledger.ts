import type { LedgerType } from '../types';

export interface LedgerCategory {
  id: string;
  name: string;
  /** #rrggbb */
  color: string;
  /** 목록·입력에서 보여줄 이모지 */
  icon: string;
}

export const EXPENSE_CATEGORIES: LedgerCategory[] = [
  { id: 'food', name: '식비', color: '#f97316', icon: '🍚' },
  { id: 'cafe', name: '카페·간식', color: '#eab308', icon: '☕' },
  { id: 'transport', name: '교통', color: '#3b82f6', icon: '🚌' },
  { id: 'housing', name: '주거·관리비', color: '#6366f1', icon: '🏠' },
  { id: 'telecom', name: '통신', color: '#14b8a6', icon: '📱' },
  { id: 'subscription', name: '구독', color: '#a855f7', icon: '📺' },
  { id: 'insurance', name: '보험', color: '#0ea5e9', icon: '🛡️' },
  { id: 'shopping', name: '쇼핑', color: '#ec4899', icon: '🛍️' },
  { id: 'living', name: '생활용품', color: '#22c55e', icon: '🧴' },
  { id: 'medical', name: '의료', color: '#ef4444', icon: '💊' },
  { id: 'culture', name: '문화·여가', color: '#8b5cf6', icon: '🎬' },
  { id: 'education', name: '교육', color: '#0891b2', icon: '📚' },
  { id: 'events', name: '경조사', color: '#d946ef', icon: '🎁' },
  { id: 'etc', name: '기타', color: '#64748b', icon: '💸' },
];

export const INCOME_CATEGORIES: LedgerCategory[] = [
  { id: 'salary', name: '급여', color: '#16a34a', icon: '💼' },
  { id: 'side', name: '부수입', color: '#0d9488', icon: '💰' },
  { id: 'allowance', name: '용돈', color: '#2563eb', icon: '🪙' },
  { id: 'finance', name: '금융수익', color: '#7c3aed', icon: '📈' },
  { id: 'etc', name: '기타', color: '#64748b', icon: '💵' },
];

export const LEDGER_CATEGORIES: Record<LedgerType, LedgerCategory[]> = {
  income: INCOME_CATEGORIES,
  expense: EXPENSE_CATEGORIES,
};

export const TYPE_LABEL: Record<LedgerType, string> = {
  income: '수입',
  expense: '지출',
};

/** 목록에 없는 카테고리 id는 id를 그대로 이름으로 보여준다. */
export function findCategory(type: LedgerType, id: string): LedgerCategory {
  return LEDGER_CATEGORIES[type].find((c) => c.id === id) ?? { id, name: id, color: '#9ca3af', icon: '💸' };
}
