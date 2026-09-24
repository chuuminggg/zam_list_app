import { useMemo, useState } from 'react';
import Button from '../components/common/Button';
import IconButton from '../components/common/IconButton';
import CategoryBreakdown from '../components/ledger/CategoryBreakdown';
import FixedItemModal from '../components/ledger/FixedItemModal';
import LedgerCalendar from '../components/ledger/LedgerCalendar';
import MonthSummary from '../components/ledger/MonthSummary';
import TransactionForm from '../components/ledger/TransactionForm';
import TransactionList from '../components/ledger/TransactionList';
import { useLedgerStore } from '../stores/ledgerStore';
import type { Transaction } from '../types';
import { formatDateHeading, todayKey, type DateKey } from '../utils/date';
import { addMonths, entriesForMonth, formatMonth, monthKey, summarize, type MonthKey } from '../utils/ledger';

/** 폼이 닫혀 있으면 null, 추가 모드면 'new', 수정 모드면 대상 내역. */
type FormTarget = Transaction | 'new' | null;

const CARD = 'bg-white dark:bg-gray-800 rounded-2xl p-4 sm:p-5 border border-gray-200 dark:border-gray-700 shadow-sm';

export default function LedgerPage() {
  const transactions = useLedgerStore((s) => s.transactions);
  const fixedItems = useLedgerStore((s) => s.fixedItems);
  const [month, setMonth] = useState(() => monthKey(new Date()));
  /** 달력에서 고른 날. null이면 한 달 전체 내역 */
  const [selectedDate, setSelectedDate] = useState<DateKey | null>(null);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [fixedOpen, setFixedOpen] = useState(false);

  const entries = useMemo(() => entriesForMonth(transactions, fixedItems, month), [transactions, fixedItems, month]);
  const summary = useMemo(() => summarize(entries), [entries]);
  const visibleEntries = selectedDate ? entries.filter((e) => e.date === selectedDate) : entries;

  const thisMonth = monthKey(new Date());
  const goTo = (next: MonthKey) => {
    setMonth(next);
    setSelectedDate(null);
  };
  // 고른 날이 있으면 그날, 이번 달이면 오늘, 다른 달이면 그 달 1일을 새 내역의 기본 날짜로 쓴다.
  const defaultDate = selectedDate ?? (month === thisMonth ? todayKey() : `${month}-01`);
  const editing = formTarget && formTarget !== 'new' ? formTarget : undefined;

  return (
    <div className="max-w-5xl mx-auto px-4 md:grid md:grid-cols-[320px_1fr] lg:grid-cols-[360px_1fr] md:gap-8 md:items-start">
      <aside className="space-y-4 mb-6 md:mb-0 md:sticky md:top-20">
        <div className="flex items-center gap-1">
          <IconButton label="이전 달" className="px-2 text-xl" onClick={() => goTo(addMonths(month, -1))}>
            ‹
          </IconButton>
          <h1 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">{formatMonth(month)}</h1>
          <IconButton label="다음 달" className="px-2 text-xl" onClick={() => goTo(addMonths(month, 1))}>
            ›
          </IconButton>
          {month !== thisMonth && (
            <Button size="sm" variant="ghost" className="ml-auto" onClick={() => goTo(thisMonth)}>
              이번 달
            </Button>
          )}
        </div>

        <div className={CARD}>
          <MonthSummary summary={summary} monthLabel={`${Number(month.slice(5))}월`} />
        </div>

        <div className={`${CARD} px-2 sm:px-3`}>
          <LedgerCalendar month={month} entries={entries} selected={selectedDate} onSelect={setSelectedDate} />
        </div>
      </aside>

      <div className="space-y-6 min-w-0">
        {!selectedDate && summary.expense > 0 && (
          <div className={CARD}>
            <CategoryBreakdown summary={summary} />
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <h2 className="font-bold text-gray-900 dark:text-white">
              {selectedDate ? formatDateHeading(selectedDate) : '전체 내역'}
            </h2>
            {selectedDate && (
              <button
                type="button"
                onClick={() => setSelectedDate(null)}
                className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                전체 보기
              </button>
            )}
            <div className="ml-auto flex gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => setFixedOpen(true)}>
                고정 항목
              </Button>
              <Button size="sm" onClick={() => setFormTarget('new')}>
                + 내역
              </Button>
            </div>
          </div>

          <TransactionList
            entries={visibleEntries}
            onEdit={setFormTarget}
            onEditFixed={() => setFixedOpen(true)}
            emptyTitle={selectedDate ? '이날 내역이 없어요' : '이번 달 내역이 없어요'}
          />
        </div>
      </div>

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
