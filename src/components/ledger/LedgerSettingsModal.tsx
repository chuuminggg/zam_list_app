import Button from '../common/Button';
import Modal from '../common/Modal';
import { useLedgerPrefsStore, type WishPurchaseMode } from '../../stores/ledgerPrefsStore';

const WISH_MODES: { value: WishPurchaseMode; label: string; description: string }[] = [
  { value: 'ask', label: '확인 후 기록', description: '금액·날짜가 채워진 입력 시트를 띄워요. 건너뛸 수 있어요.' },
  { value: 'auto', label: '자동 기록', description: '위시 가격으로 바로 지출을 추가해요. 가격이 없으면 입력 시트를 띄워요.' },
];

export default function LedgerSettingsModal({ onClose }: { onClose: () => void }) {
  const mode = useLedgerPrefsStore((s) => s.wishPurchaseMode);
  const setMode = useLedgerPrefsStore((s) => s.setWishPurchaseMode);

  return (
    <Modal open title="가계부 설정" onClose={onClose} placement="bottom">
      <fieldset className="space-y-2">
        <legend className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
          위시리스트에서 "구매함"으로 바꾸면
        </legend>
        {WISH_MODES.map((m) => (
          <label
            key={m.value}
            className={`flex gap-3 items-start rounded-xl border p-3 cursor-pointer transition-colors ${
              mode === m.value
                ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/20'
                : 'border-gray-200 dark:border-gray-700'
            }`}
          >
            <input
              type="radio"
              name="wish-purchase-mode"
              value={m.value}
              checked={mode === m.value}
              onChange={() => setMode(m.value)}
              className="mt-1 accent-indigo-600"
            />
            <span>
              <span className="block text-sm font-medium text-gray-900 dark:text-white">{m.label}</span>
              <span className="block text-xs text-gray-500 dark:text-gray-400">{m.description}</span>
            </span>
          </label>
        ))}
        <p className="text-xs text-gray-400 dark:text-gray-500">"구매함"을 해제하면 연결된 지출은 지워져요.</p>
      </fieldset>
      <Button variant="ghost" onClick={onClose} className="w-full">
        닫기
      </Button>
    </Modal>
  );
}
