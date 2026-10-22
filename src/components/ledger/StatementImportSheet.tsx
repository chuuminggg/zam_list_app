import { useState } from 'react';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import Select from '../common/Select';
import { TYPE_LABEL } from '../../constants/ledger';
import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import { useLedgerStore } from '../../stores/ledgerStore';
import { useToastStore } from '../../stores/toastStore';
import type { LedgerType } from '../../types';
import { formatWon, parseAmount } from '../../utils/ledger';
import { STATEMENT_FLAG_LABEL, type StatementEntry } from '../../utils/statement';
import PaymentMethodField from './PaymentMethodField';

interface StatementImportSheetProps {
  entries: StatementEntry[];
  onClose: () => void;
}

/** 금액은 고치는 동안 문자열로 둔다. */
type Row = Omit<StatementEntry, 'amount'> & { amount: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const valid = (row: Row) => parseAmount(row.amount) !== null && DATE.test(row.date);

/**
 * 거래 내역 캡처에서 읽은 여러 건을 한 화면에서 확인한다.
 * 줄마다 체크·날짜·메모·금액·카테고리를 바로 고치고, 줄을 펼치면 수입/지출과 결제수단을 고친다.
 */
export default function StatementImportSheet({ entries, onClose }: StatementImportSheetProps) {
  const addTransactions = useLedgerStore((s) => s.addTransactions);
  const deleteTransaction = useLedgerStore((s) => s.deleteTransaction);
  const showToast = useToastStore((s) => s.showToast);
  const categories = useLedgerCategories();
  const [rows, setRows] = useState<Row[]>(() => entries.map((e) => ({ ...e, amount: String(e.amount) })));
  const [open, setOpen] = useState<string | null>(null);

  const selected = rows.filter((r) => r.checked);
  const canSubmit = selected.length > 0 && selected.every(valid);
  const total = selected.reduce(
    (sum, r) => sum + (r.type === 'expense' ? -1 : 1) * (parseAmount(r.amount) ?? 0),
    0
  );

  const update = (key: string, changes: Partial<Row>) =>
    setRows((list) => list.map((r) => (r.key === key ? { ...r, ...changes } : r)));

  const changeType = (row: Row, type: LedgerType) =>
    update(row.key, {
      type,
      category: categories.defaultFor(type, type === 'expense' ? 'food' : 'etc'),
      paymentMethod: type === 'expense' ? (row.paymentMethod ?? 'card') : undefined,
    });

  const handleSubmit = () => {
    if (!canSubmit) return;
    const created = addTransactions(
      selected.map((r) => ({
        type: r.type,
        category: r.category,
        amount: parseAmount(r.amount) ?? 0,
        date: r.date,
        memo: r.memo.trim() || undefined,
        paymentMethod: r.type === 'expense' ? r.paymentMethod : undefined,
      }))
    );
    showToast({
      message: `${created.length}건 추가했어요`,
      action: { label: '되돌리기', run: () => created.forEach((t) => deleteTransaction(t.id)) },
    });
    onClose();
  };

  return (
    <Modal open title="거래 내역 확인" onClose={onClose} placement="full">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        {rows.length}건을 읽었어요. 빼야 할 줄은 체크를 풀고, 틀린 값은 바로 고쳐 주세요.
      </p>
      <ul className="space-y-2">
        {rows.map((row) => {
          const expanded = open === row.key;
          const amountValid = parseAmount(row.amount) !== null;
          return (
            <li
              key={row.key}
              className={`rounded-xl border p-2 space-y-1.5 ${
                row.checked
                  ? 'border-gray-200 dark:border-gray-700'
                  : 'border-dashed border-gray-200 dark:border-gray-700 opacity-60'
              }`}
            >
              <div className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  aria-label={`${row.memo || '이름 없음'} 추가`}
                  checked={row.checked}
                  onChange={(e) => update(row.key, { checked: e.target.checked })}
                  className="size-4 shrink-0 accent-indigo-600"
                />
                <Input
                  type="date"
                  aria-label="날짜"
                  value={row.date}
                  onChange={(e) => update(row.key, { date: e.target.value, dateUncertain: false })}
                  className={`text-xs w-auto py-1 ${row.dateUncertain ? 'ring-2 ring-amber-400' : ''}`}
                />
                {row.flag && <Badge>{STATEMENT_FLAG_LABEL[row.flag]}</Badge>}
                {!row.flag && row.dateUncertain && (
                  <Badge tone="bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300">날짜 확인</Badge>
                )}
                <Input
                  inputMode="numeric"
                  aria-label="금액"
                  value={row.amount}
                  onChange={(e) => update(row.key, { amount: e.target.value })}
                  aria-invalid={!amountValid}
                  className={`ml-auto text-sm text-right w-28 py-1 ${
                    row.type === 'income' ? 'text-blue-600 dark:text-blue-400' : ''
                  } ${amountValid ? '' : 'ring-2 ring-red-400'}`}
                />
              </div>
              <div className="flex items-center gap-1.5">
                <Input
                  aria-label="메모"
                  placeholder="메모"
                  value={row.memo}
                  onChange={(e) => update(row.key, { memo: e.target.value })}
                  className="text-sm py-1 min-w-0 flex-1"
                />
                <Select
                  aria-label="카테고리"
                  value={row.category}
                  onChange={(e) => update(row.key, { category: e.target.value })}
                  className="text-sm py-1 w-auto"
                >
                  {categories.visible(row.type, row.category).map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.icon} {c.name}
                    </option>
                  ))}
                </Select>
                <button
                  type="button"
                  aria-expanded={expanded}
                  aria-label="수입/지출·결제수단"
                  onClick={() => setOpen(expanded ? null : row.key)}
                  className="shrink-0 px-1.5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                >
                  {expanded ? '▴' : '▾'}
                </button>
              </div>
              {expanded && (
                <div className="space-y-1.5 pt-1">
                  <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-900" role="group" aria-label="수입/지출">
                    {(['expense', 'income'] as const).map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={t === row.type}
                        onClick={() => t !== row.type && changeType(row, t)}
                        className={`py-1 rounded-lg text-xs font-semibold ${
                          t === row.type
                            ? 'bg-white dark:bg-gray-700 shadow-sm text-gray-900 dark:text-white'
                            : 'text-gray-500 dark:text-gray-400'
                        }`}
                      >
                        {TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                  {row.type === 'expense' && (
                    <PaymentMethodField
                      value={row.paymentMethod}
                      onChange={(paymentMethod) => update(row.key, { paymentMethod })}
                    />
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>
      <div className="flex gap-2 pt-2">
        <Button variant="ghost" onClick={onClose} className="flex-1">
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={!canSubmit} className="flex-[2]">
          선택한 {selected.length}건 추가 {selected.length > 0 && `(${total >= 0 ? '+' : '-'}${formatWon(Math.abs(total))})`}
        </Button>
      </div>
    </Modal>
  );
}
