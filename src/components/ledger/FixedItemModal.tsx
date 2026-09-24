import { useState } from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import { TYPE_LABEL, findCategory } from '../../constants/ledger';
import { useLedgerStore } from '../../stores/ledgerStore';
import type { FixedItem, LedgerType } from '../../types';
import { formatMonth, formatWon, parseAmount, type MonthKey } from '../../utils/ledger';
import LedgerTypeFields from './LedgerTypeFields';

const MONTH_PATTERN = /^\d{4}-\d{2}$/;

interface FixedItemModalProps {
  onClose: () => void;
  /** 지금 보고 있는 월. 새 항목의 시작 월과 적용 여부 표시에 쓴다. */
  month: MonthKey;
}

/** 고정 수입·지출 목록과 추가/수정 폼 */
export default function FixedItemModal({ onClose, month }: FixedItemModalProps) {
  const fixedItems = useLedgerStore((s) => s.fixedItems);
  // 폼이 닫혀 있으면 null, 추가 모드면 'new', 수정 모드면 대상 항목.
  const [editing, setEditing] = useState<FixedItem | 'new' | null>(null);

  const sorted = [...fixedItems].sort((a, b) => a.type.localeCompare(b.type) || a.day - b.day);

  if (editing) {
    return (
      <FixedItemForm
        key={editing === 'new' ? 'new' : editing.id}
        item={editing === 'new' ? undefined : editing}
        month={month}
        onDone={() => setEditing(null)}
      />
    );
  }

  return (
    <Modal open title="고정 수입·지출" onClose={onClose}>
      <p className="text-xs text-gray-500 dark:text-gray-400">
        월급·월세·통신비·구독료처럼 매달 같은 날 들어오고 나가는 돈을 등록하면 매월 내역에 자동으로 들어가요.
      </p>
      {sorted.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-gray-500 py-6 text-center">등록된 고정 항목이 없어요.</p>
      ) : (
        <ul className="divide-y divide-gray-100 dark:divide-gray-700">
          {sorted.map((item) => {
            const active = item.startMonth <= month && (!item.endMonth || month <= item.endMonth);
            return (
              <li key={item.id}>
                <button
                  type="button"
                  onClick={() => setEditing(item)}
                  className={`w-full flex items-center gap-2 py-2.5 text-left ${active ? '' : 'opacity-50'}`}
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-gray-900 dark:text-white truncate">
                      {item.name}
                    </span>
                    <span className="block text-xs text-gray-400 dark:text-gray-500">
                      매월 {item.day}일 · {findCategory(item.type, item.category).name}
                      {item.endMonth ? ` · ${formatMonth(item.endMonth)}까지` : ''}
                    </span>
                  </span>
                  <span
                    className={`text-sm font-semibold whitespace-nowrap ${item.type === 'income' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}
                  >
                    {item.type === 'income' ? '+' : '-'}
                    {formatWon(item.amount)}
                  </span>
                  {!active && <Badge>미적용</Badge>}
                </button>
              </li>
            );
          })}
        </ul>
      )}
      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          닫기
        </Button>
        <Button onClick={() => setEditing('new')} className="flex-1">
          + 고정 항목
        </Button>
      </div>
    </Modal>
  );
}

interface FixedItemFormProps {
  item?: FixedItem;
  month: MonthKey;
  onDone: () => void;
}

function FixedItemForm({ item, month, onDone }: FixedItemFormProps) {
  const addFixedItem = useLedgerStore((s) => s.addFixedItem);
  const updateFixedItem = useLedgerStore((s) => s.updateFixedItem);
  const deleteFixedItem = useLedgerStore((s) => s.deleteFixedItem);
  const [form, setForm] = useState({
    type: (item?.type ?? 'expense') as LedgerType,
    category: item?.category ?? 'housing',
    name: item?.name ?? '',
    amount: item ? String(item.amount) : '',
    day: item ? String(item.day) : '1',
    startMonth: item?.startMonth ?? month,
    endMonth: item?.endMonth ?? '',
  });
  const set = (updates: Partial<typeof form>) => setForm((f) => ({ ...f, ...updates }));

  const amount = parseAmount(form.amount);
  const day = Number(form.day);
  const endMonth = form.endMonth || undefined;
  const valid =
    form.name.trim() !== '' &&
    amount !== null &&
    Number.isInteger(day) &&
    day >= 1 &&
    day <= 31 &&
    MONTH_PATTERN.test(form.startMonth) &&
    (endMonth === undefined || (MONTH_PATTERN.test(endMonth) && endMonth >= form.startMonth));

  const handleSubmit = () => {
    if (!valid || amount === null) return;
    const payload = {
      type: form.type,
      category: form.category,
      name: form.name.trim(),
      amount,
      day,
      startMonth: form.startMonth,
      endMonth,
    };
    if (item) updateFixedItem(item.id, payload);
    else addFixedItem(payload);
    onDone();
  };

  return (
    <Modal open title={item ? '고정 항목 수정' : '고정 항목 추가'} onClose={onDone}>
      <LedgerTypeFields type={form.type} category={form.category} onChange={set} />
      <Input
        aria-label="이름"
        placeholder={`이름 * (예: ${form.type === 'income' ? '월급' : '월세'})`}
        value={form.name}
        onChange={(e) => set({ name: e.target.value })}
        className="text-sm"
      />
      <Input
        inputMode="numeric"
        aria-label="금액"
        placeholder="금액 (원) *"
        value={form.amount}
        onChange={(e) => set({ amount: e.target.value })}
        className="text-sm"
      />
      <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-300">
        매월
        <Input
          type="number"
          min={1}
          max={31}
          aria-label="매월 며칠"
          value={form.day}
          onChange={(e) => set({ day: e.target.value })}
          className="text-sm w-20"
        />
        일 {TYPE_LABEL[form.type]}
      </label>
      <div className="grid grid-cols-2 gap-2">
        <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <span>시작 월</span>
          <Input
            type="month"
            aria-label="시작 월"
            value={form.startMonth}
            onChange={(e) => set({ startMonth: e.target.value })}
            className="text-sm"
          />
        </label>
        <label className="text-xs text-gray-500 dark:text-gray-400 space-y-1">
          <span>종료 월 (선택)</span>
          <Input
            type="month"
            aria-label="종료 월"
            value={form.endMonth}
            onChange={(e) => set({ endMonth: e.target.value })}
            className="text-sm"
          />
        </label>
      </div>
      {item && (
        <p className="text-xs text-gray-400 dark:text-gray-500">
          금액을 바꾸면 지난 달 내역도 함께 바뀌어요. 지난 기록을 남기려면 이 항목에 종료 월을 넣고 새 항목을 추가하세요.
        </p>
      )}
      <div className="flex gap-2 pt-2">
        {item && (
          <Button
            variant="ghost"
            className="text-red-500 dark:text-red-400"
            onClick={() => {
              deleteFixedItem(item.id);
              onDone();
            }}
          >
            삭제
          </Button>
        )}
        <Button variant="ghost" onClick={onDone} className="flex-1">
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={!valid} className="flex-1">
          {item ? '저장' : '추가'}
        </Button>
      </div>
    </Modal>
  );
}
