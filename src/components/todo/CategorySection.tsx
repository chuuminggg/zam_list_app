import { useRef, useState } from 'react';
import TodoItem from './TodoItem';
import { useTodoStore } from '../../stores/todoStore';
import type { Todo } from '../../types';
import type { DateKey } from '../../utils/date';

interface CategorySectionProps {
  /** 미분류 섹션이면 null (여기에는 할 일을 추가하지 않는다) */
  categoryId: string | null;
  name: string;
  color: string;
  date: DateKey;
  todos: Todo[];
}

export default function CategorySection({ categoryId, name, color, date, todos }: CategorySectionProps) {
  const addTodo = useTodoStore((s) => s.addTodo);
  const [adding, setAdding] = useState(false);
  const [title, setTitle] = useState('');
  /** Esc로 닫을 때 뒤따르는 blur가 입력을 추가하지 않게 한다. */
  const cancelled = useRef(false);

  const open = () => {
    cancelled.current = false;
    setAdding(true);
  };

  /** 입력한 할 일을 추가하고, 추가했는지 돌려준다. */
  const submit = () => {
    const trimmed = title.trim();
    if (trimmed && categoryId !== null) addTodo({ title: trimmed, date, categoryId });
    setTitle('');
    return trimmed !== '';
  };

  return (
    <section aria-label={name} className="space-y-1">
      <button
        type="button"
        disabled={categoryId === null}
        onClick={open}
        aria-label={categoryId === null ? name : `${name}에 할 일 추가`}
        className="inline-flex items-center gap-1.5 pl-2.5 pr-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 text-sm font-semibold transition-colors enabled:hover:bg-gray-200 dark:enabled:hover:bg-gray-700 disabled:cursor-default"
        style={{ color }}
      >
        <span aria-hidden="true" className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
        {name}
        {categoryId !== null && (
          <span aria-hidden="true" className="text-gray-400 dark:text-gray-500 text-base leading-none">
            +
          </span>
        )}
      </button>

      <ul className="pl-1">
        {todos.map((todo) => (
          <TodoItem key={todo.id} todo={todo} color={color} />
        ))}
        {adding && (
          <li className="flex items-center gap-3 py-1.5">
            <span
              aria-hidden="true"
              className="w-5 h-5 flex-shrink-0 rounded-full border-2 border-dashed"
              style={{ borderColor: color }}
            />
            <input
              type="text"
              autoFocus
              aria-label={`${name} 새 할 일`}
              placeholder="할 일 입력"
              value={title}
              maxLength={500}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (!cancelled.current) submit();
                setAdding(false);
              }}
              onKeyDown={(e) => {
                // 한글 조합 중 Enter는 조합 완료용이므로 무시한다. 빈 입력에서 Enter면 닫는다.
                if (e.key === 'Enter' && !e.nativeEvent.isComposing && !submit()) setAdding(false);
                if (e.key === 'Escape') {
                  cancelled.current = true;
                  setTitle('');
                  setAdding(false);
                }
              }}
              className="flex-1 min-w-0 bg-transparent border-b py-0.5 text-gray-900 dark:text-white placeholder:text-gray-400 focus:outline-none"
              style={{ borderColor: color }}
            />
          </li>
        )}
      </ul>
    </section>
  );
}
