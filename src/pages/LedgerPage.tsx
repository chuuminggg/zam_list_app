import { useMemo, useState } from 'react';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import CategoryBreakdown from '../components/ledger/CategoryBreakdown';
import FixedItemModal from '../components/ledger/FixedItemModal';
import MonthSummary from '../components/ledger/MonthSummary';
import TransactionForm from '../components/ledger/TransactionForm';
import TransactionList from '../components/ledger/TransactionList';
import { useLedgerStore } from '../stores/ledgerStore';
import type { Transaction } from '../types';
import { todayKey } from '../utils/date';
import { addMonths, entriesForMonth, formatMonth, monthKey, summarize } from '../utils/ledger';

/** 폼이 닫혀 있으면 null, 추가 모드면 'new', 수정 모드면 대상 내역. */
type FormTarget = Transaction | 'new' | null;

export default function LedgerPage() {
  const transactions = useLedgerStore((s) => s.transactions);
  const fixedItems = useLedgerStore((s) => s.fixedItems);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [fixedOpen, setFixedOpen] = useState(false);

  const entries = useMemo(() => entriesForMonth(transactions, fixedItems, month), [transactions, fixedItems, month]);
  const summary = useMemo(() => summarize(entries), [entries]);

  const thisMonth = monthKey(new Date());
  // 이번 달이면 오늘, 다른 달이면 그 달 1일을 새 내역의 기본 날짜로 쓴다.
  const defaultDate = month === thisMonth ? todayKey() : `${month}-01`;
  const editing = formTarget && formTarget !== 'new' ? formTarget : undefined;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex items-center gap-1">
          <IconButton label="이전 달" className="px-2 text-xl" onClick={() => setMonth(addMonths(month, -1))}>
            ‹
          </IconButton>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatMonth(month)}</h1>
          <IconButton label="다음 달" className="px-2 text-xl" onClick={() => setMonth(addMonths(month, 1))}>
            ›
          </IconButton>
        </div>
        <div className="ml-auto flex gap-2">
          {month !== thisMonth && (
            <Button size="sm" variant="ghost" onClick={() => setMonth(thisMonth)}>
              이번 달
            </Button>
          )}
          <Button size="sm" variant="ghost" onClick={() => setFixedOpen(true)}>
            고정 항목
          </Button>
          <Button size="sm" onClick={() => setFormTarget('new')}>
            + 내역
          </Button>
        </div>
      </div>

      <MonthSummary summary={summary} />
      <CategoryBreakdown summary={summary} />
      <TransactionList entries={entries} onEdit={setFormTarget} onEditFixed={() => setFixedOpen(true)} />

      {/* key로 대상이 바뀔 때마다 폼 상태를 새로 초기화한다. */}
      <TransactionForm
        key={editing?.id ?? `new-${defaultDate}`}
        open={formTarget !== null}
        transaction={editing}
        defaultDate={defaultDate}
        onClose={() => setFormTarget(null)}
      />

      {fixedOpen && <FixedItemModal month={month} onClose={() => setFixedOpen(false)} />}
    </div>
  );
}
