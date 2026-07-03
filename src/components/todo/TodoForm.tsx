import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Select from '../common/Select';
import { PRIORITIES, PRIORITY_LABEL } from '../../constants/todo';
import { useTodoStore } from '../../stores/todoStore';
import type { Todo } from '../../types';

export default function TodoForm() {
  const addTodo = useTodoStore((s) => s.addTodo);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Todo['priority']>('medium');
  const [category, setCategory] = useState('');

  const handleAdd = () => {
    if (!title.trim()) return;
    addTodo({ title: title.trim(), done: false, priority, category: category.trim() });
    setTitle('');
    setCategory('');
    setPriority('medium');
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm space-y-3 border border-gray-200 dark:border-gray-700">
      <Input
        type="text"
        placeholder="할 일을 입력하세요"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
      />
      <div className="flex gap-2 flex-wrap">
        <Input
          type="text"
          placeholder="카테고리"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
          className="flex-1 min-w-24 text-sm"
        />
        <Select
          value={priority}
          onChange={(e) => setPriority(e.target.value as Todo['priority'])}
          className="w-auto text-sm"
        >
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {PRIORITY_LABEL[p]}
            </option>
          ))}
        </Select>
        <Button onClick={handleAdd} disabled={!title.trim()}>
          추가
        </Button>
      </div>
    </div>
  );
}
