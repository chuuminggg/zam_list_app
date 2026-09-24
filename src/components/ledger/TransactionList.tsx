import Badge from '../common/Badge';
import EmptyState from '../common/EmptyState';
import { findCategory } from '../../constants/ledger';
import type { Transaction } from '../../types';
import { formatDateHeading } from '../../utils/date';
import { formatWon, type LedgerEntry } from '../../utils/ledger';

interface TransactionListProps {
  entries: LedgerEntry[];
  onEdit: (transaction: Transaction) => void;
  onEditFixed: () => void;
}

/** 날짜별로 묶은 한 달 내역. 고정 항목은 눌렀을 때 고정 항목 관리를 연다. */
export default function TransactionList({ entries, onEdit, onEditFixed }: TransactionListProps) {
  if (entries.length === 0) {
    return <EmptyState icon="💰" title="이번 달 내역이 없어요" description="+ 내역으로 수입·지출을 기록해 보세요." />;
  }

  const byDate = new Map<string, LedgerEntry[]>();
  for (const entry of entries) byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);

  return (
    <section className="space-y-4" aria-label="내역">
      {[...byDate].map(([date, dayEntries]) => (
        <div key={date}>
          <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400 mb-1">{formatDateHeading(date)}</h3>
          <ul className="rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
            {dayEntries.map((entry) => {
              const category = findCategory(entry.type, entry.category);
              return (
                <li key={entry.key}>
                  <button
                    type="button"
                    onClick={() => (entry.transaction ? onEdit(entry.transaction) : onEditFixed())}
                    className="w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors"
                  >
                    <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: category.color }} />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-1.5">
                        <span className="text-sm font-medium text-gray-900 dark:text-white">{category.name}</span>
                        {entry.fixed && <Badge>고정</Badge>}
                      </span>
                      {entry.label && (
                        <span className="block text-xs text-gray-400 dark:text-gray-500 truncate">{entry.label}</span>
                      )}
                    </span>
                    <span
                      className={`text-sm font-semibold whitespace-nowrap ${entry.type === 'income' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}
                    >
                      {entry.type === 'income' ? '+' : '-'}
                      {formatWon(entry.amount)}
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </section>
  );
}
