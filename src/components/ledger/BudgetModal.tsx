import { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { useBudget } from '../../hooks/useBudget';
import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import { useBudgetStore } from '../../stores/budgetStore';
import type { Budget } from '../../types';
import {
  TOTAL_BUDGET_ID,
  budgetAmount,
  categoryBudgetId,
  setBudgetFrom,
  setBudgetOverride,
} from '../../utils/budget';
import { formatWon, type MonthKey } from '../../utils/ledger';
import AmountInput from './AmountInput';
import CategoryIcon from './CategoryIcon';

/** 금액 입력값(숫자만)을 원으로. 비어 있으면 0(예산 없음) */
const toAmount = (digits: string) => (digits ? Number(digits) : 0);
const toDigits = (amount: number) => (amount > 0 ? String(amount) : '');

type Scope = 'month' | 'from';

/** 예산 정하기: 총예산(필수)·카테고리별 예산(선택)·이월, 그 달만 또는 그 달부터 계속 적용 */
export default function BudgetModal({ month, onClose }: { month: MonthKey; onClose: () => void }) {
  const { budgets, total } = useBudget(month);
  const saveBudget = useBudgetStore((s) => s.saveBudget);
  const categories = useLedgerCategories();
  const findBudget = (id: string) => budgets.find((b) => b.id === id);
  const expenseCategories = categories.visible('expense');

  const [totalDigits, setTotalDigits] = useState(toDigits(budgetAmount(total, month)));
  const [byCategory, setByCategory] = useState(total?.byCategory ?? false);
  const [carryover, setCarryover] = useState(total?.carryoverFrom !== undefined);
  const [categoryDigits, setCategoryDigits] = useState<Record<string, string>>(() =>
    Object.fromEntries(
      expenseCategories.map((c) => [c.id, toDigits(budgetAmount(findBudget(categoryBudgetId(c.id)), month))])
    )
  );

  const monthLabel = `${Number(month.slice(5))}월`;
  const totalAmount = toAmount(totalDigits);
  const categorySum = byCategory ? Object.values(categoryDigits).reduce((sum, d) => sum + toAmount(d), 0) : 0;

  /** 바뀐 금액만 저장한다. 그 달만 적용할 때 기본 금액과 같으면 덮어쓰기를 지운다. */
  const applyAmount = (id: string, budget: Budget | undefined, amount: number, scope: Scope, extra: Partial<Budget>) => {
    const base: Budget = budget ?? { id, amounts: {}, createdAt: '' };
    const changed = budgetAmount(budget, month) !== amount;
    if (!changed) {
      if (Object.keys(extra).length > 0) saveBudget(id, extra);
      return;
    }
    if (scope === 'from') {
      saveBudget(id, { ...setBudgetFrom(base, month, amount), ...extra });
    } else {
      const fallback = budgetAmount({ ...base, overrides: undefined }, month);
      saveBudget(id, { ...setBudgetOverride(base, month, amount === fallback ? null : amount), ...extra });
    }
  };

  const handleApply = (scope: Scope) => {
    applyAmount(TOTAL_BUDGET_ID, total, totalAmount, scope, {
      byCategory: byCategory || undefined,
      // 이월은 처음 켠 달부터 계산한다. 이미 켜져 있으면 시작 달을 그대로 둔다.
      carryoverFrom: carryover ? (total?.carryoverFrom ?? month) : undefined,
    });
    if (byCategory) {
      for (const c of expenseCategories) {
        const id = categoryBudgetId(c.id);
        applyAmount(id, findBudget(id), toAmount(categoryDigits[c.id] ?? ''), scope, findBudget(id) ? {} : { category: c.id });
      }
    }
    onClose();
  };

  return (
    <Modal open title={`${monthLabel} 예산`} onClose={onClose} placement="bottom">
      <p className="text-xs text-gray-500 dark:text-gray-400">한 달에 쓸 돈 (고정 지출 포함). 비워 두면 예산을 쓰지 않아요.</p>
      <AmountInput value={totalDigits} type="expense" onChange={setTotalDigits} />

      <fieldset className="grid grid-cols-2 gap-2" aria-label="예산 방식">
        {[
          { value: false, label: '총예산만' },
          { value: true, label: '총예산 + 카테고리별' },
        ].map((option) => (
          <label
            key={option.label}
            className={`text-center text-sm rounded-xl border py-2 cursor-pointer transition-colors ${
              byCategory === option.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20 font-semibold text-gray-900 dark:text-white'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400'
            }`}
          >
            <input
              type="radio"
              name="budget-mode"
              className="sr-only"
              checked={byCategory === option.value}
              onChange={() => setByCategory(option.value)}
            />
            {option.label}
          </label>
        ))}
      </fieldset>

      {byCategory && (
        <div className="space-y-1.5">
          <ul className="space-y-1.5 max-h-60 overflow-y-auto pr-1" aria-label="카테고리별 예산">
            {expenseCategories.map((c) => {
              const digits = categoryDigits[c.id] ?? '';
              return (
                <li key={c.id} className="flex items-center gap-2">
                  <CategoryIcon category={c} size="sm" />
                  <span className="flex-1 min-w-0 truncate text-sm text-gray-700 dark:text-gray-300">{c.name}</span>
                  <input
                    inputMode="numeric"
                    aria-label={`${c.name} 예산`}
                    placeholder="없음"
                    value={digits ? Number(digits).toLocaleString('ko-KR') : ''}
                    onChange={(e) =>
                      setCategoryDigits((d) => ({ ...d, [c.id]: e.target.value.replace(/\D/g, '').slice(0, 13) }))
                    }
                    className="w-28 text-right text-sm tabular-nums bg-transparent border-b border-gray-200 dark:border-gray-700 focus:border-indigo-500 focus:outline-none py-1 text-gray-900 dark:text-white"
                  />
                  <span className="text-xs text-gray-400">원</span>
                </li>
              );
            })}
          </ul>
          <p
            className={`text-xs tabular-nums ${categorySum > totalAmount ? 'text-amber-600 dark:text-amber-400' : 'text-gray-400 dark:text-gray-500'}`}
          >
            카테고리 합계 {formatWon(categorySum)}
            {categorySum > totalAmount && ' · 총예산보다 많아요'}
          </p>
        </div>
      )}

      <label className="flex items-start gap-2 text-sm text-gray-700 dark:text-gray-300">
        <input
          type="checkbox"
          checked={carryover}
          onChange={(e) => setCarryover(e.target.checked)}
          className="mt-0.5 accent-indigo-600"
        />
        <span>
          남은 예산·초과분을 다음 달로 넘기기
          <span className="block text-xs text-gray-400 dark:text-gray-500">
            {total?.carryoverFrom ? `${Number(total.carryoverFrom.slice(5))}월부터 이월 중` : `${monthLabel}부터 계산해요`}
          </span>
        </span>
      </label>

      <div className="grid grid-cols-2 gap-2 pt-2">
        <Button variant="ghost" onClick={() => handleApply('month')}>
          {monthLabel}만 적용
        </Button>
        <Button onClick={() => handleApply('from')}>{monthLabel}부터 계속</Button>
      </div>
      <Button variant="ghost" onClick={onClose} className="w-full">
        취소
      </Button>
    </Modal>
  );
}
