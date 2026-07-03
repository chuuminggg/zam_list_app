import Button from '../common/Button';
import { TODO_FILTERS } from '../../constants/todo';
import { useTodoStore } from '../../stores/todoStore';

interface TodoFilterBarProps {
  count: number;
}

export default function TodoFilterBar({ count }: TodoFilterBarProps) {
  const filter = useTodoStore((s) => s.filter);
  const setFilter = useTodoStore((s) => s.setFilter);

  return (
    <div className="flex gap-2 items-center">
      {TODO_FILTERS.map((f) => (
        <Button
          key={f.value}
          size="sm"
          variant={filter === f.value ? 'toggle-active' : 'toggle'}
          aria-pressed={filter === f.value}
          onClick={() => setFilter(f.value)}
        >
          {f.label}
        </Button>
      ))}
      <span className="ml-auto text-sm text-gray-400">{count}개</span>
    </div>
  );
}
