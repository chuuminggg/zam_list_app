import { formatWon, type MonthSummary as Summary } from '../../utils/ledger';

const CARD = 'rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-3 min-w-0';
const LABEL = 'text-xs text-gray-500 dark:text-gray-400';
const VALUE = 'mt-1 text-base sm:text-lg font-bold truncate';
const SUB = 'mt-0.5 text-[11px] text-gray-400 dark:text-gray-500 truncate';

/** 이번 달 수입 · 지출 · 잔액 카드 */
export default function MonthSummary({ summary }: { summary: Summary }) {
  const { income, expense, fixedIncome, fixedExpense, balance } = summary;
  return (
    <section className="grid grid-cols-3 gap-2" aria-label="월 요약">
      <div className={CARD}>
        <p className={LABEL}>수입</p>
        <p className={`${VALUE} text-blue-600 dark:text-blue-400`} aria-label="수입 합계">
          {formatWon(income)}
        </p>
        <p className={SUB}>고정 {formatWon(fixedIncome)}</p>
      </div>
      <div className={CARD}>
        <p className={LABEL}>지출</p>
        <p className={`${VALUE} text-gray-900 dark:text-white`} aria-label="지출 합계">
          {formatWon(expense)}
        </p>
        <p className={SUB}>
          고정 {formatWon(fixedExpense)} · 변동 {formatWon(expense - fixedExpense)}
        </p>
      </div>
      <div className={CARD}>
        <p className={LABEL}>잔액</p>
        <p
          className={`${VALUE} ${balance < 0 ? 'text-red-500 dark:text-red-400' : 'text-green-600 dark:text-green-400'}`}
          aria-label="잔액"
        >
          {balance < 0 ? '-' : ''}
          {formatWon(Math.abs(balance))}
        </p>
        <p className={SUB}>수입 − 지출</p>
      </div>
    </section>
  );
}
