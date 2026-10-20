import { describe, expect, it } from 'vitest';
import { MAX_NOTE_LENGTH } from '../../shared/data.js';
import { parseCategory, parseTodo, parseTransaction } from './validate.js';

const base = {
  id: 't1',
  type: 'expense',
  amount: 12000,
  category: 'shopping',
  date: '2026-10-15',
  createdAt: '2026-10-15T00:00:00Z',
};

describe('parseTransaction', () => {
  it('위시 연결 id를 저장하고, 없으면 필드를 뺀다', () => {
    expect(parseTransaction({ ...base, wishId: 'b6f1c2a0-1234-4abc-9def-0123456789ab' }).wishId).toBe(
      'b6f1c2a0-1234-4abc-9def-0123456789ab'
    );
    expect(parseTransaction(base)).not.toHaveProperty('wishId');
  });

  it('결제수단은 정해진 값만 받는다', () => {
    expect(parseTransaction({ ...base, paymentMethod: 'card' }).paymentMethod).toBe('card');
    expect(parseTransaction(base)).not.toHaveProperty('paymentMethod');
    expect(() => parseTransaction({ ...base, paymentMethod: 'bitcoin' })).toThrow(/paymentMethod/);
  });

  it('형식이 틀린 위시 연결 id는 거부한다', () => {
    expect(() => parseTransaction({ ...base, wishId: '../wish' })).toThrow(/wishId/);
  });
});

const todo = { id: 'td1', title: '결제 API', done: false, createdAt: '2026-10-19T00:00:00Z' };
const category = { id: 'c1', name: '회사', color: '#3b82f6', order: 0, createdAt: '2026-10-19T00:00:00Z' };

describe('parseTodo', () => {
  it('일지를 저장하고, 비었으면 필드를 뺀다', () => {
    expect(parseTodo({ ...todo, note: '## 한 일\n- 리팩터링' }).note).toBe('## 한 일\n- 리팩터링');
    expect(parseTodo({ ...todo, note: '' })).not.toHaveProperty('note');
    expect(parseTodo(todo)).not.toHaveProperty('note');
  });

  it('최대 길이를 넘는 일지는 거부한다', () => {
    expect(() => parseTodo({ ...todo, note: 'a'.repeat(MAX_NOTE_LENGTH + 1) })).toThrow(/note/);
  });
});

describe('parseCategory', () => {
  it('일지 형식을 저장하고, 없으면 필드를 뺀다', () => {
    expect(parseCategory({ ...category, journalType: 'work' }).journalType).toBe('work');
    expect(parseCategory(category)).not.toHaveProperty('journalType');
  });

  it('모르는 일지 형식은 거부한다', () => {
    expect(() => parseCategory({ ...category, journalType: 'memo' })).toThrow(/journalType/);
  });
});
