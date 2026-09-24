import { findCategory } from '../../constants/ledger';
import { formatWon, type MonthSummary } from '../../utils/ledger';

/** 지출 카테고리별 금액과 비율 막대 */
export default function CategoryBreakdown({ summary }: { summary: MonthSummary }) {
  const { expense, expenseByCategory } = summary;
  if (expense === 0) return null;

  return (
    <section className="space-y-2" aria-label="카테고리별 지출">
      <h2 className="text-sm font-semibold text-gray-700 dark:text-gray-300">카테고리별 지출</h2>
      <ul className="space-y-2">
        {expenseByCategory.map(({ category, amount }) => {
          const { name, color } = findCategory('expense', category);
          const percent = Math.round((amount / expense) * 100);
          return (
            <li key={category} className="text-sm">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: color }} />
                <span className="flex-1 text-gray-700 dark:text-gray-300">{name}</span>
                <span className="text-gray-400 dark:text-gray-500 text-xs">{percent}%</span>
                <span className="font-medium text-gray-900 dark:text-white w-28 text-right">{formatWon(amount)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <div className="h-full rounded-full" style={{ width: `${percent}%`, backgroundColor: color }} />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
