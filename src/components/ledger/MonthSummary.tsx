import { formatWon, type MonthSummary as Summary } from '../../utils/ledger';

const PILL = 'flex-1 min-w-0 rounded-xl bg-gray-50 dark:bg-gray-900/60 px-3 py-2';
const PILL_LABEL = 'text-[11px] text-gray-500 dark:text-gray-400';
const PILL_VALUE = 'text-sm font-semibold tabular-nums truncate';

/** 이번 달 지출을 크게, 수입·잔액을 그 아래 작게 보여준다. */
export default function MonthSummary({ summary, monthLabel }: { summary: Summary; monthLabel: string }) {
  const { income, expense, fixedExpense, balance } = summary;
  const variable = expense - fixedExpense;
  const fixedRatio = expense > 0 ? (fixedExpense / expense) * 100 : 0;

  return (
    <section aria-label="월 요약" className="space-y-3">
      <div>
        <p className="text-sm text-gray-500 dark:text-gray-400">{monthLabel} 지출</p>
        <p
          className="text-3xl font-bold tracking-tight tabular-nums text-gray-900 dark:text-white"
          aria-label="지출 합계"
        >
          {formatWon(expense)}
        </p>
      </div>

      {expense > 0 && (
        <div className="space-y-1">
          <div className="h-1.5 rounded-full bg-indigo-200 dark:bg-indigo-900 overflow-hidden" aria-hidden="true">
            <div className="h-full bg-indigo-500" style={{ width: `${fixedRatio}%` }} />
          </div>
          <p className="flex justify-between text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
            <span>고정 {formatWon(fixedExpense)}</span>
            <span>변동 {formatWon(variable)}</span>
          </p>
        </div>
      )}

      <div className="flex gap-2">
        <div className={PILL}>
          <p className={PILL_LABEL}>수입</p>
          <p className={`${PILL_VALUE} text-blue-600 dark:text-blue-400`} aria-label="수입 합계">
            {formatWon(income)}
          </p>
        </div>
        <div className={PILL}>
          <p className={PILL_LABEL}>잔액</p>
          <p
            className={`${PILL_VALUE} ${balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}
            aria-label="잔액"
          >
            {balance < 0 ? '-' : ''}
            {formatWon(Math.abs(balance))}
          </p>
        </div>
      </div>
    </section>
  );
}
