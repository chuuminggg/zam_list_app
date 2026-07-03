import type { Todo, TodoFilter } from '../types';

export const PRIORITIES = ['high', 'medium', 'low'] as const;

export const PRIORITY_LABEL: Record<Todo['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

export const PRIORITY_TONE: Record<Todo['priority'], string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

export const TODO_FILTERS: { value: TodoFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '진행 중' },
  { value: 'done', label: '완료' },
];
