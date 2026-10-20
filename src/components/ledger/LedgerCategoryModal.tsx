import { useState } from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import Select from '../common/Select';
import { CATEGORY_COLORS, CATEGORY_ICONS, FALLBACK_CATEGORY_ID, TYPE_LABEL } from '../../constants/ledger';
import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import { useLedgerCategoryStore } from '../../stores/ledgerCategoryStore';
import { useLedgerStore } from '../../stores/ledgerStore';
import type { LedgerType } from '../../types';
import type { ResolvedCategory } from '../../utils/ledgerCategories';
import CategoryIcon from './CategoryIcon';

/** 폼이 닫혀 있으면 null, 추가 모드면 'new', 수정 모드면 대상 카테고리. */
type Editing = ResolvedCategory | 'new' | null;

/** 가계부 카테고리 목록(수입/지출)과 추가·수정 폼 */
export default function LedgerCategoryModal({ onClose }: { onClose: () => void }) {
  const categories = useLedgerCategories();
  const [type, setType] = useState<LedgerType>('expense');
  const [editing, setEditing] = useState<Editing>(null);

  if (editing) {
    return (
      <CategoryForm
        key={editing === 'new' ? 'new' : editing.id}
        type={type}
        category={editing === 'new' ? undefined : editing}
        onDone={() => setEditing(null)}
      />
    );
  }

  return (
    <Modal open title="카테고리 관리" onClose={onClose}>
      <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-900" role="group" aria-label="수입/지출">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === type}
            onClick={() => setType(t)}
            className={`py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              t === type ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white' : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <ul aria-label={`${TYPE_LABEL[type]} 카테고리`}>
        {categories.all(type).map((c) => (
          <li key={c.id}>
            <button
              type="button"
              onClick={() => setEditing(c)}
              className={`w-full flex items-center gap-3 px-1 py-2 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors ${c.hidden ? 'opacity-50' : ''}`}
            >
              <CategoryIcon category={c} size="sm" />
              <span className="flex-1 min-w-0 truncate text-sm text-gray-900 dark:text-white">{c.name}</span>
              {c.hidden && <Badge>숨김</Badge>}
              {!c.builtin && <Badge>직접 추가</Badge>}
            </button>
          </li>
        ))}
      </ul>
      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          닫기
        </Button>
        <Button onClick={() => setEditing('new')} className="flex-1">
          + 카테고리
        </Button>
      </div>
    </Modal>
  );
}

interface CategoryFormProps {
  type: LedgerType;
  /** 전달하면 수정 모드, 생략하면 추가 모드. */
  category?: ResolvedCategory;
  onDone: () => void;
}

function CategoryForm({ type, category, onDone }: CategoryFormProps) {
  const categories = useLedgerCategories();
  const { addCategory, updateCategory, deleteCategory, saveBuiltin, resetBuiltin } = useLedgerCategoryStore();
  const moveCategory = useLedgerStore((s) => s.moveCategory);
  const usage = useLedgerStore(
    (s) =>
      category === undefined
        ? 0
        : s.transactions.filter((t) => t.type === type && t.category === category.id).length +
          s.fixedItems.filter((f) => f.type === type && f.category === category.id).length
  );
  const [form, setForm] = useState({
    name: category?.name ?? '',
    color: category?.color ?? CATEGORY_COLORS[0],
    icon: category?.icon ?? CATEGORY_ICONS[0],
    hidden: category?.hidden ?? false,
  });
  // 지우기 전에 내역을 옮길 곳을 고르는 단계. null이면 아직 삭제를 누르지 않았다.
  const [moveTo, setMoveTo] = useState<string | null>(null);
  const set = (updates: Partial<typeof form>) => setForm((f) => ({ ...f, ...updates }));

  const name = form.name.trim();
  const icon = form.icon.trim();
  const valid = name !== '' && name.length <= 20 && icon !== '' && icon.length <= 16;
  const canHide = category?.builtin && category.id !== FALLBACK_CATEGORY_ID;

  const handleSubmit = () => {
    if (!valid) return;
    const fields = { name, color: form.color, icon };
    if (!category) addCategory(type, fields);
    else if (category.builtin) saveBuiltin(type, category.id, { ...fields, hidden: form.hidden });
    else updateCategory(category.id, fields);
    onDone();
  };

  const handleDelete = () => {
    if (!category || moveTo === null) return;
    moveCategory(type, category.id, moveTo);
    deleteCategory(category.id);
    onDone();
  };

  const title = category ? `${TYPE_LABEL[type]} 카테고리 수정` : `${TYPE_LABEL[type]} 카테고리 추가`;

  if (category && moveTo !== null) {
    return (
      <Modal open title="카테고리 삭제" onClose={onDone}>
        <p className="text-sm text-gray-700 dark:text-gray-300">
          '{category.name}' 내역 {usage}건을 어느 카테고리로 옮길까요?
        </p>
        <Select aria-label="옮길 카테고리" value={moveTo} onChange={(e) => setMoveTo(e.target.value)} className="text-sm">
          {categories
            .visible(type)
            .filter((c) => c.id !== category.id)
            .map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
        </Select>
        <div className="flex gap-2 pt-2">
          <Button variant="ghost" onClick={() => setMoveTo(null)} className="flex-1">
            취소
          </Button>
          <Button variant="ghost" onClick={handleDelete} className="flex-1 text-red-500 dark:text-red-400">
            옮기고 삭제
          </Button>
        </div>
      </Modal>
    );
  }

  return (
    <Modal open title={title} onClose={onDone}>
      <div className="flex items-center gap-3">
        <CategoryIcon category={{ id: 'preview', name, color: form.color, icon }} />
        <Input
          aria-label="카테고리 이름"
          placeholder="이름 * (20자까지)"
          maxLength={20}
          value={form.name}
          onChange={(e) => set({ name: e.target.value })}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSubmit()}
          className="text-sm"
        />
      </div>

      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="색상">
        {CATEGORY_COLORS.map((color) => (
          <button
            key={color}
            type="button"
            role="radio"
            aria-checked={form.color === color}
            aria-label={color}
            onClick={() => set({ color })}
            className={`w-7 h-7 rounded-full transition-transform ${form.color === color ? 'ring-2 ring-offset-2 ring-gray-400 dark:ring-offset-gray-800 scale-110' : ''}`}
            style={{ backgroundColor: color }}
          />
        ))}
      </div>

      <div className="space-y-1.5">
        <div className="grid grid-cols-8 gap-1" role="radiogroup" aria-label="아이콘">
          {CATEGORY_ICONS.map((emoji) => (
            <button
              key={emoji}
              type="button"
              role="radio"
              aria-checked={icon === emoji}
              onClick={() => set({ icon: emoji })}
              className={`h-9 rounded-lg text-lg transition-colors ${icon === emoji ? 'bg-indigo-100 dark:bg-indigo-900/40' : 'hover:bg-gray-100 dark:hover:bg-gray-700/50'}`}
            >
              {emoji}
            </button>
          ))}
        </div>
        <Input
          aria-label="아이콘 직접 입력"
          placeholder="다른 이모지를 직접 입력"
          maxLength={16}
          value={form.icon}
          onChange={(e) => set({ icon: e.target.value })}
          className="text-sm"
        />
      </div>

      {canHide && (
        <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
          <input
            type="checkbox"
            checked={form.hidden}
            onChange={(e) => set({ hidden: e.target.checked })}
            className="accent-indigo-600"
          />
          고르는 목록에서 숨기기 (기존 내역에는 그대로 보여요)
        </label>
      )}

      <div className="flex flex-wrap gap-2 pt-2">
        {category?.builtin && category.edited && (
          <Button
            variant="ghost"
            onClick={() => {
              resetBuiltin(type, category.id);
              onDone();
            }}
          >
            기본값으로
          </Button>
        )}
        {category && !category.builtin && (
          <Button
            variant="ghost"
            className="text-red-500 dark:text-red-400"
            onClick={() => {
              if (usage === 0) {
                deleteCategory(category.id);
                onDone();
              } else {
                setMoveTo(FALLBACK_CATEGORY_ID);
              }
            }}
          >
            삭제
          </Button>
        )}
        <Button variant="ghost" onClick={onDone} className="flex-1">
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={!valid} className="flex-1">
          {category ? '저장' : '추가'}
        </Button>
      </div>
    </Modal>
  );
}
