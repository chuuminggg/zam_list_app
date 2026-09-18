import { useState } from 'react';
import Button from '../common/Button';
import IconButton from '../common/IconButton';
import Input from '../common/Input';
import Modal from '../common/Modal';
import { CATEGORY_COLORS } from '../../constants/todo';
import { sortCategories, useCategoryStore } from '../../stores/categoryStore';
import { useTodoStore } from '../../stores/todoStore';
import type { Category } from '../../types';

interface CategoryManagerModalProps {
  open: boolean;
  onClose: () => void;
}

interface ColorPaletteProps {
  value: string;
  onChange: (color: string) => void;
  label: string;
}

function ColorPalette({ value, onChange, label }: ColorPaletteProps) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {CATEGORY_COLORS.map((color) => (
        <button
          key={color}
          type="button"
          role="radio"
          aria-checked={value === color}
          aria-label={color}
          onClick={() => onChange(color)}
          className={`w-6 h-6 rounded-full transition-transform ${
            value === color
              ? 'ring-2 ring-offset-2 ring-gray-900 dark:ring-white dark:ring-offset-gray-800 scale-110'
              : 'hover:scale-110'
          }`}
          style={{ backgroundColor: color }}
        />
      ))}
    </div>
  );
}

interface CategoryRowProps {
  category: Category;
  isFirst: boolean;
  isLast: boolean;
}

function CategoryRow({ category, isFirst, isLast }: CategoryRowProps) {
  const { updateCategory, deleteCategory, moveCategory } = useCategoryStore();
  const todoCount = useTodoStore((s) => s.todos.filter((t) => t.categoryId === category.id).length);
  const deleteTodosInCategory = useTodoStore((s) => s.deleteTodosInCategory);
  const [name, setName] = useState(category.name);
  const [showPalette, setShowPalette] = useState(false);
  const [confirming, setConfirming] = useState(false);

  const commitName = () => {
    const trimmed = name.trim();
    if (trimmed && trimmed !== category.name) updateCategory(category.id, { name: trimmed });
    else setName(category.name);
  };

  const remove = () => {
    deleteTodosInCategory(category.id);
    deleteCategory(category.id);
  };

  return (
    <li className="py-2 space-y-2">
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label={`${category.name} 색상 바꾸기`}
          aria-expanded={showPalette}
          onClick={() => setShowPalette((v) => !v)}
          className="w-6 h-6 flex-shrink-0 rounded-full"
          style={{ backgroundColor: category.color }}
        />
        <Input
          type="text"
          aria-label={`${category.name} 이름`}
          value={name}
          maxLength={50}
          onChange={(e) => setName(e.target.value)}
          onBlur={commitName}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && e.currentTarget.blur()}
          className="flex-1 min-w-0 py-1.5 text-sm"
        />
        <IconButton
          label={`${category.name} 위로`}
          disabled={isFirst}
          onClick={() => moveCategory(category.id, -1)}
          className="px-1.5 disabled:opacity-30"
        >
          ↑
        </IconButton>
        <IconButton
          label={`${category.name} 아래로`}
          disabled={isLast}
          onClick={() => moveCategory(category.id, 1)}
          className="px-1.5 disabled:opacity-30"
        >
          ↓
        </IconButton>
        <IconButton
          label={`${category.name} 삭제`}
          tone="danger"
          onClick={() => (todoCount > 0 ? setConfirming(true) : remove())}
          className="px-1.5"
        >
          ✕
        </IconButton>
      </div>

      {showPalette && (
        <div className="pl-8">
          <ColorPalette
            label={`${category.name} 색상`}
            value={category.color}
            onChange={(color) => updateCategory(category.id, { color })}
          />
        </div>
      )}

      {confirming && (
        <div
          role="alert"
          className="ml-8 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-sm text-red-700 dark:text-red-300 space-y-2"
        >
          <p>
            이 카테고리의 할 일 {todoCount}개도 함께 삭제돼요.
          </p>
          <div className="flex gap-2 justify-end">
            <Button size="sm" variant="ghost" onClick={() => setConfirming(false)}>
              취소
            </Button>
            <Button size="sm" className="!bg-red-600 hover:!bg-red-700" onClick={remove}>
              삭제
            </Button>
          </div>
        </div>
      )}
    </li>
  );
}

export default function CategoryManagerModal({ open, onClose }: CategoryManagerModalProps) {
  const categories = useCategoryStore((s) => s.categories);
  const addCategory = useCategoryStore((s) => s.addCategory);
  const sorted = sortCategories(categories);
  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);

  const add = () => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addCategory({ name: trimmed, color });
    setName('');
    // 다음 카테고리는 다른 색으로 시작한다.
    setColor(CATEGORY_COLORS[((CATEGORY_COLORS as readonly string[]).indexOf(color) + 1) % CATEGORY_COLORS.length]);
  };

  return (
    <Modal open={open} title="카테고리 관리" onClose={onClose}>
      {sorted.length > 0 ? (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {sorted.map((category, i) => (
            <CategoryRow
              key={category.id}
              category={category}
              isFirst={i === 0}
              isLast={i === sorted.length - 1}
            />
          ))}
        </ul>
      ) : (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          카테고리를 만들면 그 아래에 할 일을 추가할 수 있어요.
        </p>
      )}

      <div className="pt-3 border-t border-gray-100 dark:border-gray-700 space-y-3">
        <div className="flex gap-2">
          <Input
            type="text"
            placeholder="새 카테고리 이름"
            aria-label="새 카테고리 이름"
            value={name}
            maxLength={50}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && add()}
            className="flex-1 min-w-0 text-sm"
          />
          <Button onClick={add} disabled={!name.trim()}>
            추가
          </Button>
        </div>
        <ColorPalette label="새 카테고리 색상" value={color} onChange={setColor} />
      </div>

      <div className="flex justify-end pt-2">
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
      </div>
    </Modal>
  );
}
