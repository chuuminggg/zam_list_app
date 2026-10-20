import { UNCATEGORIZED_NAME, WEEKDAY_LABELS } from '../constants/todo';
import type { Category, JournalType, Todo } from '../types';
import { addDays, fromDateKey, toDateKey, type DateKey } from './date';
import { journalTypeOf } from './journal';
import { todoDate } from './todo';

/** 주간·월간 일지 모아보기 */

export type PeriodKind = 'week' | 'month';

export interface Period {
  kind: PeriodKind;
  /** 첫날 (포함) */
  start: DateKey;
  /** 마지막 날 (포함) */
  end: DateKey;
}

/** key가 속한 주(월~일) 또는 달력 월 */
export function periodOf(kind: PeriodKind, key: DateKey): Period {
  const date = fromDateKey(key);
  if (kind === 'week') {
    const start = addDays(key, -((date.getDay() + 6) % 7));
    return { kind, start, end: addDays(start, 6) };
  }
  const start = toDateKey(new Date(date.getFullYear(), date.getMonth(), 1));
  const end = toDateKey(new Date(date.getFullYear(), date.getMonth() + 1, 0));
  return { kind, start, end };
}

/** 이전(-1)·다음(+1) 주나 달 */
export function shiftPeriod(period: Period, offset: -1 | 1): Period {
  if (period.kind === 'week') return periodOf('week', addDays(period.start, 7 * offset));
  const start = fromDateKey(period.start);
  return periodOf('month', toDateKey(new Date(start.getFullYear(), start.getMonth() + offset, 1)));
}

/** 예: "2026-10-19 ~ 10-25", "2026년 10월". 해가 바뀌는 주는 끝 날짜에도 연도를 붙인다. */
export function periodLabel(period: Period): string {
  const [y, m] = period.start.split('-');
  if (period.kind === 'month') return `${y}년 ${Number(m)}월`;
  const end = period.end.startsWith(y) ? period.end.slice(5) : period.end;
  return `${period.start} ~ ${end}`;
}

export function exportTitle(type: JournalType, period: Period): string {
  const label = periodLabel(period);
  if (period.kind === 'week') return type === 'work' ? `주간 업무 일지 (${label})` : `주간 일기 (${label})`;
  return type === 'work' ? `${label} 업무 일지` : `${label} 일기`;
}

export function exportFileName(type: JournalType, period: Period): string {
  const prefix = type === 'work' ? '업무일지' : '일기';
  return period.kind === 'week'
    ? `${prefix}_${period.start}_${period.end}.md`
    : `${prefix}_${period.start.slice(0, 7)}.md`;
}

const EMPTY_ITEM = /^\s*[-*]\s*(\[[ xX]\])?\s*$/;
const EMPTY_MOOD = /^기분:\s*$/;
const HEADING = /^(#{1,6})\s/;

/**
 * 일지를 모아보기에 붙일 모양으로 다듬는다.
 * 비어 있는 템플릿 줄과 그 때문에 비게 된 섹션 제목을 빼고, 제목은 두 단계 내린다.
 */
export function cleanNote(note: string): string {
  const lines = note.split('\n').filter((line) => !EMPTY_ITEM.test(line) && !EMPTY_MOOD.test(line));
  const kept = lines.filter((line, i) => {
    if (!HEADING.test(line)) return true;
    // 다음 제목(또는 끝)까지 내용이 있는 섹션만 남긴다.
    for (const next of lines.slice(i + 1)) {
      if (HEADING.test(next)) return false;
      if (next.trim() !== '') return true;
    }
    return false;
  });
  return kept
    .map((line) => line.replace(HEADING, (_, hashes: string) => `${'#'.repeat(Math.min(hashes.length + 2, 6))} `))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

interface ExportInput {
  todos: Todo[];
  categories: Category[];
  type: JournalType;
  period: Period;
}

/**
 * 기간 안에서 형식이 맞는 할 일을 날짜별로 묶어 마크다운으로 만든다.
 * 일지가 있는 할 일과 일지 없이 완료한 할 일(제목만)을 넣는다. 넣을 게 없으면 ''.
 */
export function buildJournalExport({ todos, categories, type, period }: ExportInput): string {
  const byId = new Map(categories.map((c) => [c.id, c]));
  const entries = todos
    .map((todo) => ({ todo, date: todoDate(todo), category: byId.get(todo.categoryId ?? '') }))
    .filter(
      ({ todo, date, category }) =>
        date >= period.start && date <= period.end && journalTypeOf(category) === type && (todo.note || todo.done)
    )
    .sort(
      (a, b) =>
        a.date.localeCompare(b.date) ||
        (a.category?.order ?? Infinity) - (b.category?.order ?? Infinity) ||
        a.todo.createdAt.localeCompare(b.todo.createdAt)
    );
  if (entries.length === 0) return '';

  const out = [`# ${exportTitle(type, period)}`];
  let currentDate = '';
  for (const { todo, date, category } of entries) {
    if (date !== currentDate) {
      currentDate = date;
      const d = fromDateKey(date);
      out.push('', `## ${d.getMonth() + 1}/${d.getDate()} (${WEEKDAY_LABELS[d.getDay()]})`);
    }
    out.push('', `### ${todo.done ? '✅' : '⬜'} [${category?.name ?? UNCATEGORIZED_NAME}] ${todo.title}`);
    const note = todo.note ? cleanNote(todo.note) : '';
    if (note) out.push(note);
  }
  return out.join('\n') + '\n';
}
