import { describe, expect, it } from 'vitest';
import type { LedgerCategorySetting } from '../types';
import { defaultCategory, ledgerCategories, resolveCategory, visibleCategories } from './ledgerCategories';

const setting = (overrides: Partial<LedgerCategorySetting>): LedgerCategorySetting => ({
  id: 'x',
  type: 'expense',
  name: '이름',
  color: '#123456',
  icon: '🐶',
  createdAt: '2026-10-01T00:00:00Z',
  ...overrides,
});

const settings = [
  setting({ id: 'expense-food', base: 'food', name: '밥값', color: '#000000', icon: '🍜' }),
  setting({ id: 'expense-cafe', base: 'cafe', name: '카페·간식', color: '#eab308', icon: '☕', hidden: true }),
  setting({ id: 'expense-etc', base: 'etc', name: '기타', color: '#64748b', icon: '💸', hidden: true }),
  setting({ id: 'pet-2', name: '병원', createdAt: '2026-10-03T00:00:00Z' }),
  setting({ id: 'pet-1', name: '반려동물', createdAt: '2026-10-02T00:00:00Z' }),
  setting({ id: 'bonus', type: 'income', name: '상여', icon: '🎉' }),
];

describe('ledgerCategories', () => {
  it('기본 카테고리에 수정본을 반영하고, 그 뒤에 사용자 카테고리를 만든 순서대로 붙인다', () => {
    const all = ledgerCategories('expense', settings);
    expect(all[0]).toMatchObject({ id: 'food', name: '밥값', icon: '🍜', builtin: true, edited: true, hidden: false });
    expect(all.find((c) => c.id === 'transport')).toMatchObject({ name: '교통', edited: false });
    expect(all.slice(-2).map((c) => c.id)).toEqual(['pet-1', 'pet-2']);
    expect(ledgerCategories('income', settings).at(-1)).toMatchObject({ id: 'bonus', builtin: false });
  });

  it('숨긴 기본 카테고리는 고르는 목록에서 빼되, 지금 고른 것과 기타는 남긴다', () => {
    const ids = (keep?: string) => visibleCategories('expense', settings, keep).map((c) => c.id);
    expect(ids()).not.toContain('cafe');
    expect(ids()).toContain('etc');
    expect(ids('cafe')).toContain('cafe');
  });

  it('내역 카테고리를 찾고, 지운 카테고리는 id를 이름으로 보여준다', () => {
    expect(resolveCategory('expense', 'pet-1', settings).name).toBe('반려동물');
    expect(resolveCategory('expense', 'food', settings).name).toBe('밥값');
    expect(resolveCategory('expense', 'gone', settings).name).toBe('gone');
  });

  it('기본으로 고를 카테고리가 숨겨져 있으면 보이는 첫 카테고리를 쓴다', () => {
    expect(defaultCategory('expense', settings, 'food')).toBe('food');
    expect(defaultCategory('expense', settings, 'cafe')).toBe('food');
    expect(defaultCategory('expense', [setting({ id: 'expense-food', base: 'food', hidden: true })], 'food')).toBe('cafe');
  });
});
