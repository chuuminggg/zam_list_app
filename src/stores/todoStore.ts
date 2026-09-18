import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Todo } from '../types';

interface NewTodo {
  title: string;
  date: string;
  categoryId: string;
}

interface TodoStore {
  todos: Todo[];
  addTodo: (todo: NewTodo) => void;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  deleteTodosInCategory: (categoryId: string) => void;
}

export const useTodoStore = create<TodoStore>()(
  persist(
    (set) => ({
      todos: [],
      addTodo: (todo) =>
        set((state) => ({
          todos: [
            ...state.todos,
            {
              ...todo,
              done: false,
              priority: 'medium',
              category: '',
              id: crypto.randomUUID(),
              createdAt: new Date().toISOString(),
            },
          ],
        })),
      toggleTodo: (id) =>
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? { ...t, done: !t.done } : t)),
        })),
      updateTodo: (id, updates) =>
        set((state) => ({
          todos: state.todos.map((t) => (t.id === id ? { ...t, ...updates } : t)),
        })),
      deleteTodo: (id) =>
        set((state) => ({ todos: state.todos.filter((t) => t.id !== id) })),
      deleteTodosInCategory: (categoryId) =>
        set((state) => ({ todos: state.todos.filter((t) => t.categoryId !== categoryId) })),
    }),
    {
      name: 'zam-todos',
      // 예전 버전에 있던 filter 상태는 버린다.
      partialize: (state) => ({ todos: state.todos }),
    }
  )
);
