import { WEEKDAY_LABELS } from '../constants/todo';

/** 날짜 키: 로컬 기준 `YYYY-MM-DD` */
export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toDateKey(date: Date): DateKey {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function fromDateKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DateKey {
  return toDateKey(new Date());
}

export function addDays(key: DateKey, days: number): DateKey {
  const date = fromDateKey(key);
  date.setDate(date.getDate() + days);
  return toDateKey(date);
}

/** 해당 월 달력에 그릴 6주(42일)의 날짜 키. 일요일부터 시작한다. month는 0부터. */
export function monthGrid(year: number, month: number): DateKey[] {
  const start = new Date(year, month, 1);
  start.setDate(1 - start.getDay());
  return Array.from({ length: 42 }, (_, i) =>
    toDateKey(new Date(start.getFullYear(), start.getMonth(), start.getDate() + i))
  );
}

/** 예: "9월 19일 (토)" */
export function formatDateHeading(key: DateKey): string {
  const date = fromDateKey(key);
  return `${date.getMonth() + 1}월 ${date.getDate()}일 (${WEEKDAY_LABELS[date.getDay()]})`;
}
