import { useMemo } from 'react';
import TodoFilterBar from '../components/todo/TodoFilterBar';
import TodoForm from '../components/todo/TodoForm';
import TodoList from '../components/todo/TodoList';
import { useTodoStore } from '../stores/todoStore';

export default function TodoPage() {
  const todos = useTodoStore((s) => s.todos);
  const filter = useTodoStore((s) => s.filter);

  const filteredTodos = useMemo(
    () =>
      todos.filter((t) => {
        if (filter === 'active') return !t.done;
        if (filter === 'done') return t.done;
        return true;
      }),
    [todos, filter]
  );

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">할 일</h1>
      <TodoForm />
      <TodoFilterBar count={filteredTodos.length} />
      <TodoList todos={filteredTodos} filter={filter} />
    </div>
  );
}
