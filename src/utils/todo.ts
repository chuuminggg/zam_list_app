import type { Todo } from '../types';
import { toDateKey, type DateKey } from './date';

/** 할 일 날짜. 날짜가 없는 예전 항목은 만든 날로 본다. */
export function todoDate(todo: Todo): DateKey {
  return todo.date || toDateKey(new Date(todo.createdAt));
}
