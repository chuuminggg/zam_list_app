import type { LedgerType } from '../../types';

interface AmountInputProps {
  value: string;
  type: LedgerType;
  onChange: (value: string) => void;
  onEnter?: () => void;
}

/** 큰 글씨 금액 입력. 입력하는 동안 천 단위 쉼표를 넣어 보여준다. */
export default function AmountInput({ value, type, onChange, onEnter }: AmountInputProps) {
  const digits = value.replace(/\D/g, '');
  const display = digits ? Number(digits).toLocaleString('ko-KR') : '';

  return (
    <label className="flex items-baseline gap-1 border-b-2 border-gray-200 dark:border-gray-700 focus-within:border-indigo-500 py-1 transition-colors">
      <input
        inputMode="numeric"
        aria-label="금액"
        placeholder="0"
        value={display}
        onChange={(e) => onChange(e.target.value.replace(/\D/g, '').slice(0, 13))}
        onKeyDown={(e) => e.key === 'Enter' && onEnter?.()}
        className={`flex-1 min-w-0 bg-transparent text-3xl font-bold tabular-nums text-right placeholder:text-gray-300 dark:placeholder:text-gray-600 focus:outline-none ${
          type === 'income' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-900 dark:text-white'
        }`}
      />
      <span className="text-lg font-semibold text-gray-500 dark:text-gray-400">원</span>
    </label>
  );
}
