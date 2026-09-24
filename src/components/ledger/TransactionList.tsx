import Badge from '../common/Badge';
import EmptyState from '../common/EmptyState';
import { findCategory } from '../../constants/ledger';
import type { Transaction } from '../../types';
import { formatDateHeading } from '../../utils/date';
import { formatWon, type LedgerEntry } from '../../utils/ledger';
import CategoryIcon from './CategoryIcon';

interface TransactionListProps {
  entries: LedgerEntry[];
  onEdit: (transaction: Transaction) => void;
  onEditFixed: () => void;
  emptyTitle: string;
}

const signed = (entry: Pick<LedgerEntry, 'type' | 'amount'>) =>
  `${entry.type === 'income' ? '+' : '-'}${formatWon(entry.amount)}`;

/** 날짜별로 묶은 내역. 고정 항목은 눌렀을 때 고정 항목 관리를 연다. */
export default function TransactionList({ entries, onEdit, onEditFixed, emptyTitle }: TransactionListProps) {
  if (entries.length === 0) {
    return <EmptyState icon="🧾" title={emptyTitle} description="+ 버튼으로 수입·지출을 기록해 보세요." />;
  }

  const byDate = new Map<string, LedgerEntry[]>();
  for (const entry of entries) byDate.set(entry.date, [...(byDate.get(entry.date) ?? []), entry]);

  return (
    <section className="space-y-5" aria-label="내역">
      {[...byDate].map(([date, dayEntries]) => {
        const net = dayEntries.reduce((sum, e) => sum + (e.type === 'income' ? e.amount : -e.amount), 0);
        return (
          <div key={date}>
            <div className="flex items-baseline justify-between px-1 mb-1">
              <h3 className="text-xs font-semibold text-gray-500 dark:text-gray-400">{formatDateHeading(date)}</h3>
              <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">
                {net > 0 ? '+' : net < 0 ? '-' : ''}
                {formatWon(Math.abs(net))}
              </span>
            </div>
            <ul>
              {dayEntries.map((entry) => {
                const category = findCategory(entry.type, entry.category);
                return (
                  <li key={entry.key}>
                    <button
                      type="button"
                      onClick={() => (entry.transaction ? onEdit(entry.transaction) : onEditFixed())}
                      className="w-full flex items-center gap-3 px-1 py-2 rounded-xl text-left hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
                    >
                      <CategoryIcon category={category} />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center gap-1.5">
                          <span className="text-sm font-medium text-gray-900 dark:text-white truncate">
                            {entry.label || category.name}
                          </span>
                          {entry.fixed && <Badge>고정</Badge>}
                        </span>
                        {entry.label && (
                          <span className="block text-xs text-gray-400 dark:text-gray-500">{category.name}</span>
                        )}
                      </span>
                      <span
                        className={`text-sm font-semibold whitespace-nowrap tabular-nums ${entry.type === 'income' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'}`}
                      >
                        {signed(entry)}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          </div>
        );
      })}
    </section>
  );
}
