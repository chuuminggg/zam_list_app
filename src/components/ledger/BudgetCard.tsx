import Button from '../common/Button';
import { useBudget } from '../../hooks/useBudget';
import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import type { BudgetStatus } from '../../utils/budget';
import { formatWon, type MonthKey } from '../../utils/ledger';
import CategoryIcon from './CategoryIcon';

/** 쓴 금액 비율 막대. 80% 이상이면 주황, 넘치면 빨강 */
function UsageBar({ status, thin = false }: { status: BudgetStatus; thin?: boolean }) {
  const ratio = status.available > 0 ? Math.min(status.spent / status.available, 1) : 1;
  const over = status.remaining < 0;
  return (
    <div className={`${thin ? 'h-1' : 'h-2'} rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden`} aria-hidden="true">
      <div
        className={`h-full rounded-full ${over ? 'bg-red-500' : ratio >= 0.8 ? 'bg-amber-500' : 'bg-indigo-500'}`}
        style={{ width: `${ratio * 100}%` }}
      />
    </div>
  );
}

const signedWon = (amount: number) => `${amount > 0 ? '+' : amount < 0 ? '-' : ''}${formatWon(Math.abs(amount))}`;

/** 이번 달 예산 사용률·남은 금액. 예산이 없으면 정하기 버튼만 */
export default function BudgetCard({ month, onEdit }: { month: MonthKey; onEdit: () => void }) {
  const { totalStatus: status, categories } = useBudget(month);
  const ledgerCategories = useLedgerCategories();

  if (!status) {
    return (
      <section aria-label="예산" className="flex items-center justify-between gap-2">
        <span className="text-sm text-gray-500 dark:text-gray-400">{Number(month.slice(5))}월 예산이 없어요</span>
        <Button size="sm" variant="ghost" onClick={onEdit}>
          예산 정하기
        </Button>
      </section>
    );
  }

  const over = status.remaining < 0;
  const percent = status.available > 0 ? Math.round((status.spent / status.available) * 100) : 100;
  return (
    <section aria-label="예산" className="space-y-3">
      <div className="flex items-baseline justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm text-gray-500 dark:text-gray-400">{over ? '예산 초과' : '남은 예산'}</p>
          <p
            aria-label="남은 예산"
            className={`text-2xl font-bold tabular-nums truncate ${over ? 'text-red-500 dark:text-red-400' : 'text-gray-900 dark:text-white'}`}
          >
            {over ? '-' : ''}
            {formatWon(Math.abs(status.remaining))}
          </p>
        </div>
        <button type="button" onClick={onEdit} className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline shrink-0">
          예산 수정
        </button>
      </div>
      <UsageBar status={status} />
      <p className="flex flex-wrap justify-between gap-x-2 text-[11px] text-gray-500 dark:text-gray-400 tabular-nums">
        <span>
          {formatWon(status.spent)} / {formatWon(status.available)} ({percent}%)
        </span>
        {status.carry !== 0 && <span>이월 {signedWon(status.carry)}</span>}
      </p>

      {categories.length > 0 && (
        <ul className="space-y-2.5 pt-1" aria-label="카테고리별 예산">
          {categories.map(({ category, status: s }) => {
            const c = ledgerCategories.find('expense', category);
            return (
              <li key={category} className="flex items-center gap-2.5">
                <CategoryIcon category={c} size="sm" />
                <div className="flex-1 min-w-0 space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-xs">
                    <span className="truncate text-gray-700 dark:text-gray-300">{c.name}</span>
                    <span
                      className={`tabular-nums whitespace-nowrap ${s.remaining < 0 ? 'text-red-500 dark:text-red-400 font-semibold' : 'text-gray-500 dark:text-gray-400'}`}
                    >
                      {s.remaining < 0 ? `${formatWon(-s.remaining)} 초과` : `${formatWon(s.remaining)} 남음`}
                    </span>
                  </div>
                  <UsageBar status={s} thin />
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
