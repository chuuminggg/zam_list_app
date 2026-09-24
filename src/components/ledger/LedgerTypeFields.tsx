import { LEDGER_CATEGORIES, TYPE_LABEL } from '../../constants/ledger';
import type { LedgerType } from '../../types';

interface LedgerTypeFieldsProps {
  type: LedgerType;
  category: string;
  onChange: (value: { type: LedgerType; category: string }) => void;
}

/** 수입/지출 선택 + 그 구분의 카테고리 칩. 구분을 바꾸면 카테고리는 첫 항목으로 돌아간다. */
export default function LedgerTypeFields({ type, category, onChange }: LedgerTypeFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 p-1 rounded-xl bg-gray-100 dark:bg-gray-900" role="group" aria-label="수입/지출">
        {(['expense', 'income'] as const).map((t) => (
          <button
            key={t}
            type="button"
            aria-pressed={t === type}
            onClick={() => t !== type && onChange({ type: t, category: LEDGER_CATEGORIES[t][0].id })}
            className={`py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              t === type
                ? 'bg-white dark:bg-gray-700 shadow-sm ' +
                  (t === 'income' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white')
                : 'text-gray-500 dark:text-gray-400'
            }`}
          >
            {TYPE_LABEL[t]}
          </button>
        ))}
      </div>
      <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="카테고리">
        {LEDGER_CATEGORIES[type].map((c) => {
          const active = c.id === category;
          return (
            <button
              key={c.id}
              type="button"
              role="radio"
              aria-checked={active}
              onClick={() => onChange({ type, category: c.id })}
              className={`flex flex-col items-center gap-0.5 py-2 rounded-xl border text-[11px] transition-colors ${
                active
                  ? 'font-semibold text-gray-900 dark:text-white'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
              }`}
              style={active ? { borderColor: c.color, backgroundColor: `${c.color}1a` } : undefined}
            >
              <span aria-hidden="true" className="text-lg leading-6">
                {c.icon}
              </span>
              {c.name}
            </button>
          );
        })}
      </div>
    </>
  );
}
