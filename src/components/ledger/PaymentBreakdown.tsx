import { PAYMENT_LABEL, PAYMENT_UNSET_LABEL } from '../../constants/ledger';
import { formatWon, type MonthSummary } from '../../utils/ledger';

/** 결제수단별 지출 합계 */
export default function PaymentBreakdown({ summary }: { summary: MonthSummary }) {
  const { expense, expenseByPayment } = summary;
  if (expense === 0) return null;

  return (
    <section className="space-y-2.5" aria-label="결제수단별 지출">
      <h2 className="text-sm font-semibold text-gray-900 dark:text-white">어떻게 냈을까</h2>
      <ul className="space-y-2">
        {expenseByPayment.map(({ method, amount }) => {
          const percent = (amount / expense) * 100;
          return (
            <li key={method ?? 'unset'} className="text-sm">
              <div className="flex items-center gap-3">
                <span className="flex-1 min-w-0 truncate text-gray-700 dark:text-gray-300">
                  {method ? PAYMENT_LABEL[method] : PAYMENT_UNSET_LABEL}
                </span>
                <span className="text-xs text-gray-400 dark:text-gray-500 tabular-nums">{Math.round(percent)}%</span>
                <span className="font-semibold text-gray-900 dark:text-white tabular-nums">{formatWon(amount)}</span>
              </div>
              <div className="mt-1 h-1.5 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden" aria-hidden="true">
                <div
                  className={`h-full ${method ? 'bg-indigo-500' : 'bg-gray-300 dark:bg-gray-500'}`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
