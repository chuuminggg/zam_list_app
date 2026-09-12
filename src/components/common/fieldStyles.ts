export type Accent = 'indigo' | 'purple';

/** 실제 스타일은 index.css의 `.field` (components 레이어) */
export const FIELD_BASE = 'field';

export const FOCUS_RING: Record<Accent, string> = {
  indigo: 'focus:ring-2 focus:ring-indigo-500',
  purple: 'focus:ring-2 focus:ring-purple-500',
};
