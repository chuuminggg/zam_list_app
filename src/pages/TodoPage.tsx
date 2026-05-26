import { useState } from 'react';
import { useTodoStore } from '../stores/todoStore';
import type { Todo, TodoFilter } from '../types';

const PRIORITIES = ['high', 'medium', 'low'] as const;

const PRIORITY_LABEL: Record<Todo['priority'], string> = {
  high: '높음',
  medium: '보통',
  low: '낮음',
};

const PRIORITY_COLOR: Record<Todo['priority'], string> = {
  high: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
  medium: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400',
  low: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
};

const FILTERS: { value: TodoFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'active', label: '진행 중' },
  { value: 'done', label: '완료' },
];

export default function TodoPage() {
  const { todos, filter, addTodo, toggleTodo, deleteTodo, setFilter } = useTodoStore();
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');
  const [category, setCategory] = useState('');

  const filteredTodos = todos.filter((t) => {
    if (filter === 'active') return !t.done;
    if (filter === 'done') return t.done;
    return true;
  });

  const handleAdd = () => {
    if (!title.trim()) return;
    addTodo({ title: title.trim(), done: false, priority, category: category.trim() });
    setTitle('');
    setCategory('');
    setPriority('medium');
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">할 일</h1>

      {/* 입력 폼 */}
      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm space-y-3 border border-gray-200 dark:border-gray-700">
        <input
          type="text"
          placeholder="할 일을 입력하세요"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />
        <div className="flex gap-2 flex-wrap">
          <input
            type="text"
            placeholder="카테고리"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="flex-1 min-w-24 px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={priority}
            onChange={(e) => setPriority(e.target.value as Todo['priority'])}
            className="px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>{PRIORITY_LABEL[p]}</option>
            ))}
          </select>
          <button
            onClick={handleAdd}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-medium transition-colors"
          >
            추가
          </button>
        </div>
      </div>

      {/* 필터 */}
      <div className="flex gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-indigo-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
        ))}
        <span className="ml-auto text-sm text-gray-400 self-center">
          {filteredTodos.length}개
        </span>
      </div>

      {/* 목록 */}
      <ul className="space-y-2">
        {filteredTodos.length === 0 && (
          <li className="text-center py-12 text-gray-400">항목이 없습니다.</li>
        )}
        {filteredTodos.map((todo) => (
          <li
            key={todo.id}
            className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700"
          >
            <input
              type="checkbox"
              checked={todo.done}
              onChange={() => toggleTodo(todo.id)}
              className="w-5 h-5 rounded accent-indigo-600 cursor-pointer"
            />
            <span className={`flex-1 text-gray-900 dark:text-white ${todo.done ? 'line-through text-gray-400' : ''}`}>
              {todo.title}
            </span>
            <div className="flex items-center gap-2">
              {todo.category && (
                <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                  {todo.category}
                </span>
              )}
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${PRIORITY_COLOR[todo.priority]}`}>
                {PRIORITY_LABEL[todo.priority]}
              </span>
              <button
                onClick={() => deleteTodo(todo.id)}
                className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors ml-1"
              >
                ✕
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
