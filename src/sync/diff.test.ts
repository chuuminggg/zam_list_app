import { describe, expect, it } from 'vitest';
import { diffItems } from './diff';

describe('diffItems', () => {
  const a = { id: 'a', v: 1 };
  const b = { id: 'b', v: 1 };

  it('추가·수정·삭제를 구분한다', () => {
    const b2 = { ...b, v: 2 };
    const c = { id: 'c', v: 1 };
    expect(diffItems([a, b], [b2, c])).toEqual({ upserts: [b2, c], deletes: ['a'] });
  });

  it('참조가 같으면 변경 없음', () => {
    expect(diffItems([a, b], [a, b])).toEqual({ upserts: [], deletes: [] });
  });
});
