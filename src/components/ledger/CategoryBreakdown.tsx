import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import { formatShortWon, formatWon, type MonthSummary } from '../../utils/ledger';
import type { Change } from '../../utils/ledgerAnalysis';
import CategoryIcon from './CategoryIcon';

/** 지난달 대비 증감 표시. 지난달에 없던 카테고리는 '새로' */
function ChangeTag({ change }: { change: Change }) {
  if (change.diff === 0) return null;
  const up = change.diff > 0;
  return (
    <span
      className={`text-[11px] tabular-nums whitespace-nowrap ${up ? 'text-red-500 dark:text-red-400' : 'text-emerald-600 dark:text-emerald-400'}`}
      title={`지난달보다 ${formatWon(Math.abs(change.diff))} ${up ? '늘었어요' : '줄었어요'}`}
    >
      {change.percent === null ? (
        '새로'
      ) : (
        <>
          <span className="sr-only">지난달보다 </span>
          {`${up ? '▲' : '▼'}${formatShortWon(Math.abs(change.diff))}`}
        </>
      )}
    </span>
  );
}

/** 지출 카테고리 비율 막대 한 줄 + 카테고리별 금액. changes를 주면 지난달 대비 증감도 붙인다. */
export default function CategoryBreakdown({ summary, changes }: { summary: MonthSummary; changes?: Map<string, Change> }) {
  const { expense, expenseByCategory } = summary;
  const categories = useLedgerCategories();
  if (expense === 0) return null;

  const rows = expenseByCategory.map(({ category, amount }) => ({
    category: categories.find('expense', category),
    change: changes?.get(category),
    amount,
    percent: (amount / expense) * 100,
  }));

  return (
    <section className="space-y-3" aria-label="카테고리별 지출">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">어디에 썼을까</h2>
      <div className="flex h-2.5 rounded-full overflow-hidden gap-0.5" aria-hidden="true">
        {rows.map(({ category, percent }) => (
          <div key={category.id} style={{ width: `${percent}%`, backgroundColor: category.color }} />
        ))}
      </div>
      <ul className="space-y-2.5">
        {rows.map(({ category, change, amount, percent }) => (
          <li key={category.id} className="flex items-center gap-3 text-sm">
            <CategoryIcon category={category} size="sm" />
            <span className="flex-1 min-w-0 flex items-center gap-1.5">
              <span className="truncate text-gray-700 dark:text-gray-300">{category.name}</span>
              {change && <ChangeTag change={change} />}
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{Math.round(percent)}%</span>
            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatWon(amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
