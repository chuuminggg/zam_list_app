import { describe, expect, it } from 'vitest';
import { JOURNAL_TEMPLATES, isBlankNote, journalTypeOf, moodOf, noteToSave, setMood, toggleTaskLine } from './journal';

const category = { id: 'c1', name: '회사', color: '#3b82f6', order: 0, createdAt: '2026-10-19T00:00:00Z' };

describe('journalTypeOf', () => {
  it('정하지 않았거나 미분류면 일기다', () => {
    expect(journalTypeOf(undefined)).toBe('diary');
    expect(journalTypeOf(category)).toBe('diary');
    expect(journalTypeOf({ ...category, journalType: 'work' })).toBe('work');
  });
});

describe('isBlankNote / noteToSave', () => {
  it('비었거나 템플릿 그대로면 빈 일지로 보고 저장하지 않는다', () => {
    expect(isBlankNote('')).toBe(true);
    expect(isBlankNote(JOURNAL_TEMPLATES.work)).toBe(true);
    // 공백만 달라도 템플릿 그대로로 본다.
    expect(isBlankNote(JOURNAL_TEMPLATES.diary.trimEnd() + '\n\n\n')).toBe(true);
    expect(noteToSave(JOURNAL_TEMPLATES.work)).toBeUndefined();
  });

  it('한 글자라도 쓰면 저장한다', () => {
    const text = JOURNAL_TEMPLATES.work.replace('## 한 일\n- ', '## 한 일\n- 리팩터링');
    expect(isBlankNote(text)).toBe(false);
    expect(noteToSave(text)).toBe(text);
  });
});

describe('setMood / moodOf', () => {
  it('기분 줄을 고른 이모지로 바꾸고, 없으면 맨 위에 넣는다', () => {
    const picked = setMood(JOURNAL_TEMPLATES.diary, '🙂');
    expect(picked.startsWith('기분: 🙂\n## 있었던 일')).toBe(true);
    expect(moodOf(setMood(picked, '😢'))).toBe('😢');
    expect(setMood('오늘은 맑음', '😄')).toBe('기분: 😄\n오늘은 맑음');
  });
});

describe('toggleTaskLine', () => {
  it('체크박스 줄만 뒤집는다', () => {
    const text = '## 다음 할 일\n- [ ] 배포\n- [x] 리뷰';
    expect(toggleTaskLine(text, 1)).toBe('## 다음 할 일\n- [x] 배포\n- [x] 리뷰');
    expect(toggleTaskLine(text, 2)).toBe('## 다음 할 일\n- [ ] 배포\n- [ ] 리뷰');
    expect(toggleTaskLine(text, 0)).toBe(text);
  });
});
