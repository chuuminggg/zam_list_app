import { PAYMENT_METHODS } from '../../../shared/data';
import { PAYMENT_LABEL } from '../../constants/ledger';
import type { PaymentMethod } from '../../types';

interface PaymentMethodFieldProps {
  value?: PaymentMethod;
  /** 고른 칸을 다시 누르면 미지정(undefined)으로 돌아간다. */
  onChange: (value: PaymentMethod | undefined) => void;
}

/** 지출 결제수단 한 줄 선택 (카드·현금·계좌이체·기타) */
export default function PaymentMethodField({ value, onChange }: PaymentMethodFieldProps) {
  return (
    <div className="grid grid-cols-4 gap-1.5" role="radiogroup" aria-label="결제수단">
      {PAYMENT_METHODS.map((method) => {
        const active = method === value;
        return (
          <button
            key={method}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(active ? undefined : method)}
            className={`py-1.5 rounded-lg border text-xs transition-colors ${
              active
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30 font-semibold text-indigo-700 dark:text-indigo-300'
                : 'border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700/50'
            }`}
          >
            {PAYMENT_LABEL[method]}
          </button>
        );
      })}
    </div>
  );
}
