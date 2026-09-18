import { CATEGORY_COLORS } from '../constants/todo';
import { useCategoryStore } from '../stores/categoryStore';
import { useTodoStore } from '../stores/todoStore';
import type { Category, Todo } from '../types';
import { toDateKey } from '../utils/date';

/**
 * 예전 형식의 할 일을 새 형식으로 옮긴다.
 * - date가 없으면 만든 날(로컬 기준)로 채운다.
 * - 자유 입력 카테고리 이름(category)만 있으면 같은 이름의 카테고리에 연결한다.
 *   카테고리 id를 이름에서 결정적으로 만들어 여러 기기에서 동시에 돌아도 중복이 생기지 않고,
 *   다시 실행해도 바뀌는 것이 없다.
 */

/** 이름으로 만드는 결정적 카테고리 id (FNV-1a 32비트) */
export function legacyCategoryId(name: string): string {
  let hash = 0x811c9dc5;
  for (const ch of name) {
    hash ^= ch.codePointAt(0)!;
    hash = Math.imul(hash, 0x01000193);
  }
  return `legacy-${(hash >>> 0).toString(16)}`;
}

function needsMigration(todo: Todo): boolean {
  return !todo.date || (!!todo.category && !todo.categoryId);
}

export function migrateLegacyTodos(): void {
  const { todos } = useTodoStore.getState();
  if (!todos.some(needsMigration)) return;

  const { categories } = useCategoryStore.getState();
  const byName = new Map(categories.map((c) => [c.name, c.id]));
  const created: Category[] = [];

  const nextTodos = todos.map((todo) => {
    if (!needsMigration(todo)) return todo;
    const next: Todo = { ...todo, date: todo.date || toDateKey(new Date(todo.createdAt)) };
    const name = todo.category.trim();
    if (name && !todo.categoryId) {
      let id = byName.get(name);
      if (!id) {
        id = legacyCategoryId(name);
        byName.set(name, id);
        const order = categories.length + created.length;
        created.push({
          id,
          name: name.slice(0, 50),
          color: CATEGORY_COLORS[order % CATEGORY_COLORS.length],
          order,
          createdAt: new Date().toISOString(),
        });
      }
      next.categoryId = id;
      next.category = '';
    }
    return next;
  });

  if (created.length > 0) useCategoryStore.setState({ categories: [...categories, ...created] });
  useTodoStore.setState({ todos: nextTodos });
}
