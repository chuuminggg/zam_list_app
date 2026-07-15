import { useState } from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import IconButton from '../common/IconButton';
import Input from '../common/Input';
import Select from '../common/Select';
import { PRIORITIES, PRIORITY_LABEL, PRIORITY_TONE } from '../../constants/todo';
import { useTodoStore } from '../../stores/todoStore';
import type { Todo } from '../../types';

interface TodoItemProps {
  todo: Todo;
}

export default function TodoItem({ todo }: TodoItemProps) {
  const { toggleTodo, updateTodo, deleteTodo } = useTodoStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    title: todo.title,
    category: todo.category,
    priority: todo.priority,
  });

  const startEdit = () => {
    setDraft({ title: todo.title, category: todo.category, priority: todo.priority });
    setEditing(true);
  };

  const save = () => {
    if (!draft.title.trim()) return;
    updateTodo(todo.id, {
      title: draft.title.trim(),
      category: draft.category.trim(),
      priority: draft.priority,
    });
    setEditing(false);
  };

  if (editing) {
    return (
      <li className="bg-white dark:bg-gray-800 rounded-xl px-4 py-3 shadow-sm border border-indigo-300 dark:border-indigo-700 space-y-2">
        <Input
          type="text"
          autoFocus
          value={draft.title}
          onChange={(e) => setDraft((d) => ({ ...d, title: e.target.value }))}
          onKeyDown={(e) => {
            if (e.key === 'Enter') save();
            if (e.key === 'Escape') setEditing(false);
          }}
        />
        <div className="flex gap-2 flex-wrap">
          <Input
            type="text"
            placeholder="카테고리"
            value={draft.category}
            onChange={(e) => setDraft((d) => ({ ...d, category: e.target.value }))}
            className="flex-1 min-w-24 text-sm"
          />
          <Select
            value={draft.priority}
            onChange={(e) =>
              setDraft((d) => ({ ...d, priority: e.target.value as Todo['priority'] }))
            }
            className="w-auto text-sm"
          >
            {PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {PRIORITY_LABEL[p]}
              </option>
            ))}
          </Select>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}>
            취소
          </Button>
          <Button size="sm" onClick={save} disabled={!draft.title.trim()}>
            저장
          </Button>
        </div>
      </li>
    );
  }

  return (
    <li className="flex items-center gap-2 sm:gap-3 bg-white dark:bg-gray-800 rounded-xl px-3 sm:px-4 py-3 shadow-sm border border-gray-200 dark:border-gray-700 transition-colors hover:border-gray-300 dark:hover:border-gray-600 animate-fade-in">
      <input
        type="checkbox"
        checked={todo.done}
        onChange={() => toggleTodo(todo.id)}
        aria-label={`${todo.title} 완료 토글`}
        className="w-5 h-5 rounded accent-indigo-600 cursor-pointer flex-shrink-0"
      />
      <button
        type="button"
        onClick={startEdit}
        className={`flex-1 text-left truncate transition-colors ${
          todo.done ? 'line-through text-gray-400' : 'text-gray-900 dark:text-white'
        }`}
      >
        {todo.title}
      </button>
      <div className="flex items-center gap-2 flex-shrink-0">
        {todo.category && <Badge>{todo.category}</Badge>}
        <Badge tone={PRIORITY_TONE[todo.priority]}>{PRIORITY_LABEL[todo.priority]}</Badge>
        <IconButton label="수정" onClick={startEdit}>
          ✎
        </IconButton>
        <IconButton label="삭제" tone="danger" onClick={() => deleteTodo(todo.id)}>
          ✕
        </IconButton>
      </div>
    </li>
  );
}
