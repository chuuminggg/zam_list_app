import Input from '../common/Input';
import Select from '../common/Select';
import { PAYMENT_LABEL, PAYMENT_UNSET_LABEL } from '../../constants/ledger';
import { useLedgerCategories } from '../../hooks/useLedgerCategories';
import { PAYMENT_METHODS } from '../../../shared/data';
import type { LedgerType } from '../../types';
import { EMPTY_FILTER, isFilterActive, type LedgerFilter } from '../../utils/ledgerAnalysis';
import { formatWon } from '../../utils/ledger';

interface LedgerFilterBarProps {
  filter: LedgerFilter;
  onChange: (filter: LedgerFilter) => void;
  /** 범위 버튼에 쓰는 보고 있는 달 이름. 예: "10월" */
  monthLabel: string;
  /** 조건에 맞는 내역 수·합계. 조건이 없으면 표시하지 않는다 */
  result: { count: number; income: number; expense: number };
}

const SCOPE_BUTTON = 'px-2.5 py-1 text-xs rounded-md';

/** 내역 검색어·종류·카테고리·결제수단 조건과 범위(보고 있는 달 / 전체 기간) */
export default function LedgerFilterBar({ filter, onChange, monthLabel, result }: LedgerFilterBarProps) {
  const categories = useLedgerCategories();
  const set = (updates: Partial<LedgerFilter>) => onChange({ ...filter, ...updates });
  const type = filter.type === 'all' ? null : filter.type;

  return (
    <section aria-label="내역 검색" className="space-y-2 rounded-2xl bg-gray-50 dark:bg-gray-800/60 p-3">
      <Input
        type="search"
        aria-label="검색어"
        placeholder="메모·카테고리 검색"
        value={filter.query}
        onChange={(e) => set({ query: e.target.value })}
        autoFocus
      />
      <div className="grid grid-cols-[auto_1fr_1fr] gap-2 [&>select]:min-w-0">
        <Select
          aria-label="종류"
          value={filter.type}
          onChange={(e) => {
            const next = e.target.value as LedgerType | 'all';
            // 종류가 바뀌면 다른 종류의 카테고리·결제수단 조건은 맞지 않으니 지운다.
            set({ type: next, category: null, paymentMethod: next === 'income' ? null : filter.paymentMethod });
          }}
        >
          <option value="all">전체</option>
          <option value="expense">지출</option>
          <option value="income">수입</option>
        </Select>
        <Select
          aria-label="카테고리"
          value={filter.category ?? ''}
          disabled={type === null}
          title={type === null ? '종류를 먼저 고르세요' : undefined}
          onChange={(e) => set({ category: e.target.value || null })}
        >
          <option value="">카테고리</option>
          {type &&
            categories.all(type).map((c) => (
              <option key={c.id} value={c.id}>
                {c.icon} {c.name}
              </option>
            ))}
        </Select>
        <Select
          aria-label="결제수단"
          value={filter.paymentMethod ?? ''}
          disabled={type === 'income'}
          onChange={(e) => set({ paymentMethod: (e.target.value || null) as LedgerFilter['paymentMethod'] })}
        >
          <option value="">결제수단</option>
          {PAYMENT_METHODS.map((m) => (
            <option key={m} value={m}>
              {PAYMENT_LABEL[m]}
            </option>
          ))}
          <option value="unset">{PAYMENT_UNSET_LABEL}</option>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <div role="radiogroup" aria-label="검색 범위" className="flex rounded-lg bg-gray-200/70 dark:bg-gray-900/60 p-0.5">
          {(
            [
              ['month', monthLabel],
              ['all', '전체 기간'],
            ] as const
          ).map(([scope, label]) => (
            <button
              key={scope}
              type="button"
              role="radio"
              aria-checked={filter.scope === scope}
              onClick={() => set({ scope })}
              className={`${SCOPE_BUTTON} ${filter.scope === scope ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-white shadow-sm' : 'text-gray-500 dark:text-gray-400'}`}
            >
              {label}
            </button>
          ))}
        </div>
        {isFilterActive(filter) && (
          <button
            type="button"
            onClick={() => onChange(EMPTY_FILTER)}
            className="ml-auto text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
          >
            조건 지우기
          </button>
        )}
      </div>

      {isFilterActive(filter) && (
        <p aria-live="polite" aria-label="검색 결과" className="text-xs text-gray-500 dark:text-gray-400 tabular-nums">
          {result.count}건
          {result.expense > 0 && ` · 지출 ${formatWon(result.expense)}`}
          {result.income > 0 && ` · 수입 ${formatWon(result.income)}`}
        </p>
      )}
    </section>
  );
}
