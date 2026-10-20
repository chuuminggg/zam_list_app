import { useState } from 'react';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import { useLedgerPrefsStore } from '../../stores/ledgerPrefsStore';
import { useLedgerStore } from '../../stores/ledgerStore';
import type { LedgerType, Transaction } from '../../types';
import { parseAmount } from '../../utils/ledger';
import type { TransactionDraft } from '../../utils/wishPurchase';
import AmountInput from './AmountInput';
import LedgerTypeFields from './LedgerTypeFields';
import PaymentMethodField from './PaymentMethodField';

interface TransactionFormProps {
  open: boolean;
  onClose: () => void;
  /** 전달하면 수정 모드, 생략하면 추가 모드. */
  transaction?: Transaction;
  /** 추가 모드의 기본 날짜 */
  defaultDate: string;
  /** 추가 모드에서 미리 채울 값 (위시 구매 등). date가 있으면 defaultDate보다 우선한다. */
  draft?: TransactionDraft;
}

export default function TransactionForm({ open, onClose, transaction, defaultDate, draft }: TransactionFormProps) {
  const addTransaction = useLedgerStore((s) => s.addTransaction);
  const updateTransaction = useLedgerStore((s) => s.updateTransaction);
  const deleteTransaction = useLedgerStore((s) => s.deleteTransaction);
  const lastPaymentMethod = useLedgerPrefsStore((s) => s.lastPaymentMethod);
  const setLastPaymentMethod = useLedgerPrefsStore((s) => s.setLastPaymentMethod);
  const initial = transaction ?? draft;
  const [form, setForm] = useState({
    type: (initial?.type ?? 'expense') as LedgerType,
    category: initial?.category ?? 'food',
    amount: initial?.amount != null ? String(initial.amount) : '',
    date: initial?.date ?? defaultDate,
    memo: initial?.memo ?? '',
    // 새 지출은 마지막에 쓴 결제수단으로 시작한다.
    paymentMethod: transaction ? transaction.paymentMethod : draft ? draft.paymentMethod : lastPaymentMethod,
  });
  // 위시 구매로 띄운 시트는 기록하지 않고 닫을 수 있다.
  const fromWish = !transaction && draft?.wishId !== undefined;
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
      // 결제수단은 지출에만 둔다.
      paymentMethod: form.type === 'expense' ? form.paymentMethod : undefined,
    };
    if (payload.type === 'expense') setLastPaymentMethod(payload.paymentMethod);
    if (transaction) updateTransaction(transaction.id, payload);
    else addTransaction({ ...payload, wishId: draft?.wishId });
    onClose();
  };

  return (
    <Modal
      open={open}
      title={transaction ? '내역 수정' : fromWish ? '구매 지출 기록' : '내역 추가'}
      onClose={onClose}
      placement="bottom"
    >
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
      {form.type === 'expense' && (
        <PaymentMethodField
          value={form.paymentMethod}
          onChange={(paymentMethod) => setForm((f) => ({ ...f, paymentMethod }))}
        />
      )}
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
          {fromWish ? '건너뛰기' : '취소'}
        </Button>
        <Button onClick={handleSubmit} disabled={!valid} className="flex-1">
          {transaction ? '저장' : '추가'}
        </Button>
      </div>
    </Modal>
  );
}
