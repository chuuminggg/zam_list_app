import { lazy, Suspense, useMemo, useState } from 'react';
import { useLedgerStore } from '../../stores/ledgerStore';
import { formatWon, type MonthKey } from '../../utils/ledger';
import { change, expenseChangeText, monthlyTrend } from '../../utils/ledgerAnalysis';

const TrendChart = lazy(() => import('./TrendChart'));

const RANGES = [6, 12] as const;

/** 고른 달까지 최근 6·12개월 수입·지출 추이와 전월 대비 지출 증감 */
export default function TrendCard({ month, className = '' }: { month: MonthKey; className?: string }) {
  const transactions = useLedgerStore((s) => s.transactions);
  const fixedItems = useLedgerStore((s) => s.fixedItems);
  const [range, setRange] = useState<(typeof RANGES)[number]>(6);
  const points = useMemo(
    () => monthlyTrend(transactions, fixedItems, month, range),
    [transactions, fixedItems, month, range]
  );

  if (points.every((p) => p.income === 0 && p.expense === 0)) return null;
  const [previous, current] = points.slice(-2);
  const expenseChange = change(current.expense, previous.expense);

  return (
    <section className={`space-y-3 ${className}`} aria-label="월별 추이">
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white">월별 추이</h2>
          <p
            className={`text-xs mt-0.5 ${expenseChange.diff > 0 ? 'text-red-500 dark:text-red-400' : expenseChange.diff < 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-500 dark:text-gray-400'}`}
          >
            {expenseChangeText(expenseChange)}
          </p>
        </div>
        <div role="radiogroup" aria-label="기간" className="flex shrink-0 rounded-lg bg-gray-100 dark:bg-gray-900/60 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={range === r}
              onClick={() => setRange(r)}
              className={`px-2 py-0.5 text-xs rounded-md ${range === r ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {r}개월
            </button>
          ))}
        </div>
      </div>

      <div aria-hidden="true" className="h-[180px]">
        <Suspense fallback={null}>
          <TrendChart points={points} selected={month} />
        </Suspense>
      </div>
      <p className="flex gap-3 text-[11px] text-gray-500 dark:text-gray-400" aria-hidden="true">
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-blue-500" />
          수입
        </span>
        <span className="flex items-center gap-1">
          <span className="w-2 h-2 rounded-sm bg-indigo-500" />
          지출
        </span>
      </p>

      {/* 차트를 볼 수 없는 경우를 위한 같은 내용의 목록 */}
      <ul className="sr-only" aria-label="월별 수입·지출">
        {points.map((p) => (
          <li key={p.month}>
            {Number(p.month.slice(5))}월 수입 {formatWon(p.income)}, 지출 {formatWon(p.expense)}
          </li>
        ))}
      </ul>
    </section>
  );
}
