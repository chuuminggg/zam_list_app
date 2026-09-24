import { findCategory } from '../../constants/ledger';
import { formatWon, type MonthSummary } from '../../utils/ledger';
import CategoryIcon from './CategoryIcon';

/** 지출 카테고리 비율 막대 한 줄 + 카테고리별 금액 */
export default function CategoryBreakdown({ summary }: { summary: MonthSummary }) {
  const { expense, expenseByCategory } = summary;
  if (expense === 0) return null;

  const rows = expenseByCategory.map(({ category, amount }) => ({
    category: findCategory('expense', category),
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
        {rows.map(({ category, amount, percent }) => (
          <li key={category.id} className="flex items-center gap-3 text-sm">
            <CategoryIcon category={category} size="sm" />
            <span className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300">{category.name}</span>
            <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{Math.round(percent)}%</span>
            <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatWon(amount)}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}
