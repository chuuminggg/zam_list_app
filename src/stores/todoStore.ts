import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { Todo, TodoFilter } from '../types';

interface TodoStore {
  todos: Todo[];
  filter: TodoFilter;
  addTodo: (todo: Omit<Todo, 'id' | 'createdAt'>) => void;
  toggleTodo: (id: string) => void;
  updateTodo: (id: string, updates: Partial<Todo>) => void;
  deleteTodo: (id: string) => void;
  setFilter: (filter: TodoFilter) => void;
}

export const useTodoStore = create<TodoStore>()(
  persist(
    (set) => ({
      todos: [],
      filter: 'all',
      addTodo: (todo) =>
        set((state) => ({
          todos: [
            ...state.todos,
            { ...todo, id: crypto.randomUUID(), createdAt: new Date().toISOString() },
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
      setFilter: (filter) => set({ filter }),
    }),
    { name: 'zam-todos' }
  )
);
