import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import { useLedgerStore } from '../../stores/ledgerStore';
import type { LedgerType, Transaction } from '../../types';
import { parseAmount } from '../../utils/ledger';
import AmountInput from './AmountInput';
import LedgerTypeFields from './LedgerTypeFields';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  /** 전달하면 수정 모드, 생략하면 추가 모드. */
  transaction?: Transaction;
  /** 추가 모드의 기본 날짜 */
  defaultDate: string;
}

export default function TransactionForm({ open, onClose, transaction, defaultDate }: TransactionFormProps) {
  const addTransaction = useLedgerStore((s) => s.addTransaction);
  const updateTransaction = useLedgerStore((s) => s.updateTransaction);
  const deleteTransaction = useLedgerStore((s) => s.deleteTransaction);
  const [form, setForm] = useState({
    type: (transaction?.type ?? 'expense') as LedgerType,
    category: transaction?.category ?? 'food',
    amount: transaction ? String(transaction.amount) : '',
    date: transaction?.date ?? defaultDate,
    memo: transaction?.memo ?? '',
  });
  const amount = parseAmount(form.amount);
  const valid = amount !== null && /^\d{4}-\d{2}-\d{2}$/.test(form.date);

  const handleSubmit = () => {
    if (!valid || amount === null) return;
    const payload = {
      type: form.type,
      category: form.category,
      amount,
      date: form.date,
      memo: form.memo.trim() || undefined,
    };
    if (transaction) updateTransaction(transaction.id, payload);
    else addTransaction(payload);
    onClose();
  };

  return (
    <Modal open={open} title={transaction ? '내역 수정' : '내역 추가'} onClose={onClose} placement="bottom">
      <LedgerTypeFields
        type={form.type}
        category={form.category}
        onChange={(v) => setForm((f) => ({ ...f, ...v }))}
      />
      <AmountInput
        value={form.amount}
        type={form.type}
        onChange={(value) => setForm((f) => ({ ...f, amount: value }))}
        onEnter={handleSubmit}
      />
      <div className="grid grid-cols-[auto_1fr] gap-2">
        <Input
          type="date"
          aria-label="날짜"
          value={form.date}
          onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))}
          className="text-sm w-auto"
        />
        <Input
          aria-label="메모"
          placeholder="메모 (선택)"
          value={form.memo}
          onChange={(e) => setForm((f) => ({ ...f, memo: e.target.value }))}
          onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && handleSubmit()}
          className="text-sm"
        />
      </div>
      <div className="flex gap-2 pt-2">
        {transaction && (
          <Button
            variant="ghost"
            className="text-red-500 dark:text-red-400"
            onClick={() => {
              deleteTransaction(transaction.id);
              onClose();
            }}
          >
            삭제
          </Button>
        )}
        <Button variant="ghost" onClick={onClose} className="flex-1">
          취소
        </Button>
        <Button onClick={handleSubmit} disabled={!valid} className="flex-1">
          {transaction ? '저장' : '추가'}
        </Button>
      </div>
    </Modal>
  );
}
