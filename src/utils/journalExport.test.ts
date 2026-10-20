import { describe, expect, it } from 'vitest';
import type { Category, Todo } from '../types';
import { JOURNAL_TEMPLATES } from './journal';
import { buildJournalExport, cleanNote, exportFileName, periodLabel, periodOf, shiftPeriod } from './journalExport';

describe('periodOf / shiftPeriod', () => {
  it('주간은 월요일부터 일요일까지다', () => {
    // 2026-10-25는 일요일
    expect(periodOf('week', '2026-10-25')).toEqual({ kind: 'week', start: '2026-10-19', end: '2026-10-25' });
    expect(periodOf('week', '2026-10-19')).toEqual({ kind: 'week', start: '2026-10-19', end: '2026-10-25' });
    expect(shiftPeriod(periodOf('week', '2026-10-19'), 1).start).toBe('2026-10-26');
  });

  it('월간은 달력의 한 달이고, 해를 넘겨 이동한다', () => {
    expect(periodOf('month', '2026-02-14')).toEqual({ kind: 'month', start: '2026-02-01', end: '2026-02-28' });
    expect(shiftPeriod(periodOf('month', '2026-12-05'), 1)).toEqual({
      kind: 'month',
      start: '2027-01-01',
      end: '2027-01-31',
    });
  });

  it('기간 이름과 파일 이름을 만든다', () => {
    expect(periodLabel(periodOf('week', '2026-10-20'))).toBe('2026-10-19 ~ 10-25');
    expect(periodLabel(periodOf('week', '2026-12-31'))).toBe('2026-12-28 ~ 2027-01-03');
    expect(periodLabel(periodOf('month', '2026-10-20'))).toBe('2026년 10월');
    expect(exportFileName('work', periodOf('week', '2026-10-20'))).toBe('업무일지_2026-10-19_2026-10-25.md');
    expect(exportFileName('diary', periodOf('month', '2026-10-20'))).toBe('일기_2026-10.md');
  });
});

describe('cleanNote', () => {
  it('빈 템플릿 줄과 비게 된 섹션을 빼고 제목을 두 단계 내린다', () => {
    const note = JOURNAL_TEMPLATES.work.replace('## 한 일\n- ', '## 한 일\n- 리팩터링');
    expect(cleanNote(note)).toBe('#### 한 일\n- 리팩터링');
  });

  it('기분을 고르지 않은 일기는 기분 줄을 뺀다', () => {
    expect(cleanNote('기분: \n## 있었던 일\n산책했다\n\n## 느낀 점\n\n')).toBe('#### 있었던 일\n산책했다');
    expect(cleanNote('기분: 🙂\n## 있었던 일\n산책했다')).toBe('기분: 🙂\n#### 있었던 일\n산책했다');
  });
});

const categories: Category[] = [
  { id: 'work', name: '회사', color: '#3b82f6', order: 0, journalType: 'work', createdAt: '2026-09-01' },
  { id: 'side', name: '사이드', color: '#22c55e', order: 1, createdAt: '2026-09-01' },
];

const todo = (over: Partial<Todo>): Todo => ({
  id: 't',
  title: '할 일',
  done: false,
  priority: 'medium',
  category: '',
  createdAt: '2026-10-01T00:00:00Z',
  ...over,
});

describe('buildJournalExport', () => {
  const todos = [
    todo({ id: 'a', title: '결제 API', done: true, date: '2026-10-20', categoryId: 'work', note: '## 한 일\n- 트랜잭션 정리' }),
    todo({ id: 'b', title: '코드 리뷰', done: true, date: '2026-10-19', categoryId: 'work' }),
    todo({ id: 'c', title: '배포 준비', done: false, date: '2026-10-19', categoryId: 'work' }),
    todo({ id: 'd', title: '설계 메모', done: false, date: '2026-10-21', categoryId: 'work', note: '스키마 초안' }),
    todo({ id: 'e', title: '산책', done: true, date: '2026-10-20', categoryId: 'side', note: '좋았다' }),
    todo({ id: 'f', title: '지난주 일', done: true, date: '2026-10-18', categoryId: 'work' }),
  ];

  it('형식이 맞고 기간 안인 할 일을 날짜별로 묶는다', () => {
    expect(buildJournalExport({ todos, categories, type: 'work', period: periodOf('week', '2026-10-20') })).toBe(
      [
        '# 주간 업무 일지 (2026-10-19 ~ 10-25)',
        '',
        '## 10/19 (월)',
        '',
        '### ✅ [회사] 코드 리뷰',
        '',
        '## 10/20 (화)',
        '',
        '### ✅ [회사] 결제 API',
        '#### 한 일',
        '- 트랜잭션 정리',
        '',
        '## 10/21 (수)',
        '',
        '### ⬜ [회사] 설계 메모',
        '스키마 초안',
        '',
      ].join('\n')
    );
  });

  it('형식을 정하지 않은 카테고리와 미분류는 일기로 모은다', () => {
    const out = buildJournalExport({
      todos: [...todos, todo({ id: 'g', title: '일기장', done: true, date: '2026-10-22' })],
      categories,
      type: 'diary',
      period: periodOf('month', '2026-10-20'),
    });
    expect(out.startsWith('# 2026년 10월 일기\n')).toBe(true);
    expect(out).toContain('### ✅ [사이드] 산책\n좋았다');
    expect(out).toContain('### ✅ [미분류] 일기장');
    expect(out).not.toContain('결제 API');
  });

  it('넣을 할 일이 없으면 빈 문자열이다', () => {
    expect(buildJournalExport({ todos, categories, type: 'work', period: periodOf('week', '2026-11-20') })).toBe('');
  });
});
