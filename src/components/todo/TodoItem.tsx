import { useEffect, useRef, useState } from 'react';
import IconButton from '../common/IconButton';
import { useTodoStore } from '../../stores/todoStore';
import type { Todo } from '../../types';
import { addDays, todayKey } from '../../utils/date';
import { todoDate } from '../../utils/todo';

interface TodoItemProps {
  todo: Todo;
  color: string;
}

const MENU_ITEM =
  'w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-700';

export default function TodoItem({ todo, color }: TodoItemProps) {
  const { toggleTodo, updateTodo, deleteTodo } = useTodoStore();
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(todo.title);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('pointerdown', onPointerDown);
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('pointerdown', onPointerDown);
      document.removeEventListener('keydown', onKeyDown);
    };
  }, [menuOpen]);

  const date = todoDate(todo);
  const today = todayKey();

  const startEdit = () => {
    setDraft(todo.title);
    setEditing(true);
    setMenuOpen(false);
  };

  const save = () => {
    const title = draft.trim();
    if (title && title !== todo.title) updateTodo(todo.id, { title });
    setEditing(false);
  };

  const moveTo = (next: string) => {
    updateTodo(todo.id, { date: next });
    setMenuOpen(false);
  };

  return (
    <li className="group flex items-center gap-3 py-1.5 animate-fade-in">
      <button
        type="button"
        role="checkbox"
        aria-checked={todo.done}
        aria-label={`${todo.title} 완료`}
        onClick={() => toggleTodo(todo.id)}
        className="w-5 h-5 flex-shrink-0 rounded-full border-2 flex items-center justify-center text-[11px] leading-none text-white transition-colors"
        style={{ borderColor: color, backgroundColor: todo.done ? color : 'transparent' }}
      >
        {todo.done && '✓'}
      </button>

      {editing ? (
        <input
          type="text"
          autoFocus
          aria-label="할 일 수정"
          value={draft}
          maxLength={500}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={save}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.nativeEvent.isComposing) save();
            if (e.key === 'Escape') setEditing(false);
          }}
          className="flex-1 min-w-0 bg-transparent border-b border-gray-300 dark:border-gray-600 py-0.5 text-gray-900 dark:text-white focus:outline-none focus:border-indigo-500"
        />
      ) : (
        <button
          type="button"
          onClick={startEdit}
          className={`flex-1 min-w-0 text-left break-words transition-colors ${
            todo.done ? 'line-through text-gray-400 dark:text-gray-500' : 'text-gray-900 dark:text-white'
          }`}
        >
          {todo.title}
        </button>
      )}

      <div ref={menuRef} className="relative flex-shrink-0">
        <IconButton
          label={`${todo.title} 메뉴`}
          aria-haspopup="menu"
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((v) => !v)}
          className="px-1.5 md:opacity-0 md:group-hover:opacity-100 md:focus:opacity-100 aria-expanded:opacity-100"
        >
          ⋯
        </IconButton>
        {menuOpen && (
          <div
            role="menu"
            className="absolute right-0 top-full mt-1 z-30 w-36 py-1 rounded-xl bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700 animate-pop-in"
          >
            <button type="button" role="menuitem" className={MENU_ITEM} onClick={startEdit}>
              수정
            </button>
            {date !== today && (
              <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => moveTo(today)}>
                오늘 하기
              </button>
            )}
            <button type="button" role="menuitem" className={MENU_ITEM} onClick={() => moveTo(addDays(date, 1))}>
              내일 하기
            </button>
            <button
              type="button"
              role="menuitem"
              className={`${MENU_ITEM} !text-red-500`}
              onClick={() => deleteTodo(todo.id)}
            >
              삭제
            </button>
          </div>
        )}
      </div>
    </li>
  );
}
