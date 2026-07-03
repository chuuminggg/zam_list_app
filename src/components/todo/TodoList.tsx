import EmptyState from '../common/EmptyState';
import TodoItem from './TodoItem';
import type { Todo, TodoFilter } from '../../types';

const EMPTY_COPY: Record<TodoFilter, { title: string; description: string }> = {
  all: { title: '아직 할 일이 없어요', description: '위 입력창에서 첫 할 일을 추가해 보세요.' },
  active: { title: '진행 중인 할 일이 없어요', description: '모두 끝냈네요!' },
  done: { title: '완료한 할 일이 없어요', description: '체크박스를 눌러 완료 처리해 보세요.' },
};

interface TodoListProps {
  todos: Todo[];
  filter: TodoFilter;
}

export default function TodoList({ todos, filter }: TodoListProps) {
  if (todos.length === 0) {
    return <EmptyState icon="📝" {...EMPTY_COPY[filter]} />;
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} />
      ))}
    </ul>
  );
}
