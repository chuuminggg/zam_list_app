import { useLedgerSheetStore } from '../../stores/ledgerSheetStore';
import { todayKey } from '../../utils/date';
import TransactionForm from './TransactionForm';

/** 가계부 탭 밖에서 요청한 내역 입력 시트(위시 구매 기록 등)를 띄운다. */
export default function LedgerSheetHost() {
  const target = useLedgerSheetStore((s) => s.target);
  const closeSheet = useLedgerSheetStore((s) => s.closeSheet);
  if (!target) return null;

  const transaction = 'transaction' in target ? target.transaction : undefined;
  const draft = 'draft' in target ? target.draft : undefined;
  return (
    <TransactionForm
      // key로 대상이 바뀔 때마다 폼 상태를 새로 초기화한다.
      key={transaction?.id ?? `draft-${draft?.wishId}`}
      open
      transaction={transaction}
      draft={draft}
      defaultDate={todayKey()}
      onClose={closeSheet}
    />
  );
}
