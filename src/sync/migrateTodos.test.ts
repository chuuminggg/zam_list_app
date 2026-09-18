import { beforeEach, describe, expect, it } from 'vitest';
import { useCategoryStore } from '../stores/categoryStore';
import { useTodoStore } from '../stores/todoStore';
import type { Todo } from '../types';
import { toDateKey } from '../utils/date';
import { legacyCategoryId, migrateLegacyTodos } from './migrateTodos';

const legacy = (id: string, category: string): Todo => ({
  id,
  title: id,
  done: false,
  priority: 'high',
  category,
  createdAt: '2026-09-10T03:00:00.000Z',
});

beforeEach(() => {
  useTodoStore.setState({ todos: [] });
  useCategoryStore.setState({ categories: [] });
});

describe('migrateLegacyTodos', () => {
  it('날짜를 채우고 카테고리 이름을 같은 카테고리로 묶는다', () => {
    useTodoStore.setState({ todos: [legacy('a', '공부'), legacy('b', '공부'), legacy('c', '')] });
    migrateLegacyTodos();

    const { categories } = useCategoryStore.getState();
    expect(categories.map((c) => [c.id, c.name])).toEqual([[legacyCategoryId('공부'), '공부']]);
    const todos = useTodoStore.getState().todos;
    const date = toDateKey(new Date('2026-09-10T03:00:00.000Z'));
    expect(todos.map((t) => [t.date, t.categoryId, t.category])).toEqual([
      [date, legacyCategoryId('공부'), ''],
      [date, legacyCategoryId('공부'), ''],
      [date, undefined, ''],
    ]);
  });

  it('이미 있는 같은 이름 카테고리를 쓰고, 다시 실행해도 바뀌지 않는다', () => {
    useCategoryStore.setState({
      categories: [{ id: 'mine', name: '운동', color: '#22c55e', order: 0, createdAt: '2026-09-01' }],
    });
    useTodoStore.setState({ todos: [legacy('a', '운동')] });
    migrateLegacyTodos();
    const after = useTodoStore.getState().todos;
    expect(after[0].categoryId).toBe('mine');

    migrateLegacyTodos();
    expect(useTodoStore.getState().todos).toBe(after);
    expect(useCategoryStore.getState().categories).toHaveLength(1);
  });

  it('결정적 id는 서버 id 형식에 맞는다', () => {
    expect(legacyCategoryId('한글 카테고리')).toMatch(/^[A-Za-z0-9_-]{1,64}$/);
    expect(legacyCategoryId('가')).not.toBe(legacyCategoryId('나'));
  });
});
