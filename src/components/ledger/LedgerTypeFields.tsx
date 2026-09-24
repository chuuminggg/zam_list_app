import Button from '../common/Button';
import Select from '../common/Select';
import { LEDGER_CATEGORIES, TYPE_LABEL } from '../../constants/ledger';
import type { LedgerType } from '../../types';

interface LedgerTypeFieldsProps {
  type: LedgerType;
  category: string;
  onChange: (value: { type: LedgerType; category: string }) => void;
}

/** 수입/지출 선택 + 그 구분의 카테고리 선택. 구분을 바꾸면 카테고리는 첫 항목으로 돌아간다. */
export default function LedgerTypeFields({ type, category, onChange }: LedgerTypeFieldsProps) {
  return (
    <>
      <div className="grid grid-cols-2 gap-2" role="group" aria-label="수입/지출">
        {(['expense', 'income'] as const).map((t) => (
          <Button
            key={t}
            type="button"
            variant={t === type ? 'toggle-active' : 'toggle'}
            aria-pressed={t === type}
            onClick={() => t !== type && onChange({ type: t, category: LEDGER_CATEGORIES[t][0].id })}
          >
            {TYPE_LABEL[t]}
          </Button>
        ))}
      </div>
      <Select
        aria-label="카테고리"
        value={category}
        onChange={(e) => onChange({ type, category: e.target.value })}
        className="text-sm"
      >
        {LEDGER_CATEGORIES[type].map((c) => (
          <option key={c.id} value={c.id}>
            {c.name}
          </option>
        ))}
      </Select>
    </>
  );
}
