import { useState } from 'react';
import Button from '../common/Button';
import Modal from '../common/Modal';
import { useLedgerStore } from '../../stores/ledgerStore';
import type { FixedItem } from '../../types';
import { formatWon, parseAmount, splitFixedItem, withFixedOverride, type MonthKey } from '../../utils/ledger';
import AmountInput from './AmountInput';

interface FixedMonthSheetProps {
  item: FixedItem;
  month: MonthKey;
  onClose: () => void;
  /** 이름·날짜·기간 등 항목 전체를 고치는 고정 항목 관리를 연다. */
  onManage: () => void;
}

/** 고정 항목 한 달 예외: 이번 달만 금액 변경·건너뛰기, 또는 이번 달부터 금액 변경 */
export default function FixedMonthSheet({ item, month, onClose, onManage }: FixedMonthSheetProps) {
  const updateFixedItem = useLedgerStore((s) => s.updateFixedItem);
  const addFixedItem = useLedgerStore((s) => s.addFixedItem);
  const override = item.overrides?.[month];
  const [value, setValue] = useState(String(override?.amount ?? item.amount));
  const amount = parseAmount(value);
  const monthLabel = `${Number(month.slice(5))}월`;

  const setOverride = (next: Parameters<typeof withFixedOverride>[2]) => {
    updateFixedItem(item.id, { overrides: withFixedOverride(item, month, next) });
    onClose();
  };

  const applyThisMonth = () => {
    if (amount === null) return;
    // 기본 금액과 같으면 예외를 둘 필요가 없다.
    setOverride(amount === item.amount ? null : { amount });
  };

  const applyFromNow = () => {
    if (amount === null) return;
    const { update, added } = splitFixedItem(item, month, amount);
    updateFixedItem(item.id, update);
    if (added) addFixedItem(added);
    onClose();
  };

  return (
    <Modal open title={`${item.name} · ${monthLabel}`} onClose={onClose} placement="bottom">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        매월 {item.day}일 · 기본 {formatWon(item.amount)}
      </p>

      {override?.skip ? (
        <>
          <p className="text-sm text-gray-700 dark:text-gray-300">{monthLabel}은 건너뛰었어요. 합계에 들어가지 않아요.</p>
          <Button onClick={() => setOverride(null)} className="w-full">
            {monthLabel} 다시 포함
          </Button>
        </>
      ) : (
        <>
          <AmountInput value={value} type={item.type} onChange={setValue} onEnter={applyThisMonth} />
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" onClick={applyThisMonth} disabled={amount === null}>
              {monthLabel}만 적용
            </Button>
            <Button onClick={applyFromNow} disabled={amount === null}>
              {monthLabel}부터 계속
            </Button>
          </div>
          <p className="text-xs text-gray-400 dark:text-gray-500">
            "{monthLabel}부터 계속"을 고르면 지난 달 금액은 그대로 두고 {monthLabel}부터 새 금액으로 기록해요.
          </p>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" variant="ghost" onClick={() => setOverride({ skip: true })}>
              {monthLabel} 건너뛰기
            </Button>
            {override?.amount !== undefined && (
              <Button size="sm" variant="ghost" onClick={() => setOverride(null)}>
                원래 금액으로
              </Button>
            )}
          </div>
        </>
      )}

      <div className="flex gap-2 pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="ghost" onClick={onManage} className="flex-1">
          고정 항목 관리
        </Button>
        <Button variant="ghost" onClick={onClose} className="flex-1">
          닫기
        </Button>
      </div>
    </Modal>
  );
}
