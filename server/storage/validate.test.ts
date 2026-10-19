import { describe, expect, it } from 'vitest';
import { parseTransaction } from './validate.js';

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

  it('형식이 틀린 위시 연결 id는 거부한다', () => {
    expect(() => parseTransaction({ ...base, wishId: '../wish' })).toThrow(/wishId/);
  });
});
