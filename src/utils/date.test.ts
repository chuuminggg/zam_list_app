import { describe, expect, it } from 'vitest';
import { addDays, formatDateHeading, fromDateKey, monthGrid, toDateKey } from './date';

describe('date utils', () => {
  it('로컬 날짜 키로 바꾸고 되돌린다', () => {
    expect(toDateKey(new Date(2026, 0, 5, 23, 59))).toBe('2026-01-05');
    expect(toDateKey(fromDateKey('2026-09-19'))).toBe('2026-09-19');
  });

  it('월·연 경계를 넘어 날짜를 더한다', () => {
    expect(addDays('2026-09-30', 1)).toBe('2026-10-01');
    expect(addDays('2026-01-01', -1)).toBe('2025-12-31');
  });

  it('월 달력은 일요일부터 6주를 채운다', () => {
    const grid = monthGrid(2026, 8); // 2026년 9월 1일은 화요일
    expect(grid).toHaveLength(42);
    expect(grid[0]).toBe('2026-08-30');
    expect(grid[2]).toBe('2026-09-01');
    expect(grid[41]).toBe('2026-10-10');
  });

  it('제목 형식', () => {
    expect(formatDateHeading('2026-09-19')).toBe('9월 19일 (토)');
  });
});
