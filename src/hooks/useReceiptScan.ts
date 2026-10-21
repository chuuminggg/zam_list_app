import { useState } from 'react';
import { useLedgerPrefsStore } from '../stores/ledgerPrefsStore';
import { useToastStore } from '../stores/toastStore';
import { todayKey } from '../utils/date';
import { prepareReceiptImage } from '../utils/image';
import { readImageText } from '../utils/ocr';
import { receiptDraft, receiptNotice } from '../utils/receipt';
import { parseReceiptText } from '../utils/receiptText';
import type { TransactionDraft } from '../utils/wishPurchase';
import { useLedgerCategories } from './useLedgerCategories';

/**
 * 영수증·결제 화면 사진을 기기 안에서 읽어(OCR) 지출 초안을 onDraft로 넘긴다. 실패·안내는 토스트로 보여준다.
 * 로그인·서버 없이 동작하고 사진은 어디에도 올리지 않는다.
 */
export function useReceiptScan(onDraft: (draft: TransactionDraft) => void) {
  const lastPaymentMethod = useLedgerPrefsStore((s) => s.lastPaymentMethod);
  const showToast = useToastStore((s) => s.showToast);
  const categories = useLedgerCategories();
  const [scanning, setScanning] = useState(false);

  const scan = async (file: File) => {
    setScanning(true);
    try {
      const text = await readImageText(await prepareReceiptImage(file));
      const today = todayKey();
      const options = categories.visible('expense').map((c) => ({ id: c.id, name: c.name }));
      const result = parseReceiptText(text, options, today);
      if (!result.found) {
        showToast({ message: '사진에서 영수증이나 결제 내역을 찾지 못했어요.' });
        return;
      }
      onDraft(
        receiptDraft(result, {
          today,
          defaultCategory: categories.defaultFor('expense', 'food'),
          lastPaymentMethod,
        })
      );
      const notice = receiptNotice(result);
      if (notice) showToast({ message: notice });
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : '영수증을 읽지 못했어요.' });
    } finally {
      setScanning(false);
    }
  };

  return { scan, scanning };
}
