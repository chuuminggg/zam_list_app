import type { Category, JournalType } from '../types';

/** 일지가 비어 있을 때 미리 채우는 형식별 템플릿 */
export const JOURNAL_TEMPLATES: Record<JournalType, string> = {
  work: '## 한 일\n- \n## 이슈 / 막힌 점\n- \n## 다음 할 일\n- [ ] \n## 참고 (PR·티켓·링크)\n- \n',
  diary: '기분: \n## 있었던 일\n\n## 느낀 점\n\n',
};

export const JOURNAL_LABELS: Record<JournalType, string> = {
  work: '회사 일지',
  diary: '일기',
};

export const MOODS = ['😄', '🙂', '😐', '😕', '😢'] as const;

/** 카테고리의 일지 형식. 미분류이거나 정하지 않았으면 일기 */
export function journalTypeOf(category: Category | undefined): JournalType {
  return category?.journalType ?? 'diary';
}

const squash = (text: string) => text.replace(/\s+/g, '');

/** 비었거나 어느 템플릿과도 (공백을 빼면) 같으면 빈 일지다. */
export function isBlankNote(text: string): boolean {
  const body = squash(text);
  return body === '' || Object.values(JOURNAL_TEMPLATES).some((t) => squash(t) === body);
}

/** 저장할 값. 빈 일지는 필드를 지우도록 undefined */
export function noteToSave(text: string): string | undefined {
  return isBlankNote(text) ? undefined : text;
}

const MOOD_LINE = /^기분:.*$/m;

/** `기분:` 줄을 고른 이모지로 바꾼다. 줄이 없으면 맨 위에 넣는다. */
export function setMood(text: string, mood: string): string {
  return MOOD_LINE.test(text) ? text.replace(MOOD_LINE, `기분: ${mood}`) : `기분: ${mood}\n${text}`;
}

/** 현재 고른 기분 이모지 */
export function moodOf(text: string): string | undefined {
  const line = text.match(MOOD_LINE)?.[0] ?? '';
  return MOODS.find((m) => line.includes(m));
}

const TASK_LINE = /^(\s*[-*] \[)([ xX])(\])/;

/** lineIndex번째 줄의 체크박스(`- [ ]`)를 뒤집는다. 체크박스 줄이 아니면 그대로 */
export function toggleTaskLine(text: string, lineIndex: number): string {
  const lines = text.split('\n');
  const line = lines[lineIndex];
  if (line === undefined || !TASK_LINE.test(line)) return text;
  lines[lineIndex] = line.replace(TASK_LINE, (_, open, mark, close) => `${open}${mark === ' ' ? 'x' : ' '}${close}`);
  return lines.join('\n');
}
