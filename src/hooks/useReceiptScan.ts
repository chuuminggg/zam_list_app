import { useState } from 'react';
import { useLedgerPrefsStore } from '../stores/ledgerPrefsStore';
import { useLedgerStore } from '../stores/ledgerStore';
import { useToastStore } from '../stores/toastStore';
import { todayKey } from '../utils/date';
import { prepareReceiptImage } from '../utils/image';
import { readImageText } from '../utils/ocr';
import { receiptDraft, receiptNotice } from '../utils/receipt';
import { parseReceiptText } from '../utils/receiptText';
import { buildStatementEntries, mergeStatementScans, type StatementEntry } from '../utils/statement';
import { isReceiptText, parseStatementText, type StatementRow } from '../utils/statementText';
import type { TransactionDraft } from '../utils/wishPurchase';
import { useLedgerCategories } from './useLedgerCategories';

interface ReceiptScanHandlers {
  /** 영수증·결제 화면 한 장 → 지출 초안 하나 */
  onDraft: (draft: TransactionDraft) => void;
  /** 거래 목록 캡처(여러 건이나 여러 장) → 확인 목록 */
  onEntries: (entries: StatementEntry[]) => void;
}

/**
 * 영수증·결제 화면·거래 내역 캡처를 기기 안에서 읽는다(OCR). 실패·안내는 토스트로 보여준다.
 * 사진 한 장에서 거래가 2건 이상 나오거나 여러 장을 고르면 거래 목록으로, 아니면 영수증 한 장으로 본다.
 * 로그인·서버 없이 동작하고 사진은 어디에도 올리지 않는다.
 */
export function useReceiptScan({ onDraft, onEntries }: ReceiptScanHandlers) {
  const lastPaymentMethod = useLedgerPrefsStore((s) => s.lastPaymentMethod);
  const showToast = useToastStore((s) => s.showToast);
  const categories = useLedgerCategories();
  const [scanning, setScanning] = useState(false);

  const scanReceipt = (text: string, today: string) => {
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
  };

  const scanStatement = (scans: StatementRow[][]) => {
    const rows = mergeStatementScans(scans);
    if (rows.length === 0) {
      showToast({ message: '사진에서 거래 내역을 찾지 못했어요.' });
      return;
    }
    const { transactions, fixedItems } = useLedgerStore.getState();
    const options = (type: 'income' | 'expense') => categories.visible(type).map((c) => ({ id: c.id, name: c.name }));
    onEntries(
      buildStatementEntries(rows, {
        transactions,
        fixedItems,
        categories: { expense: options('expense'), income: options('income') },
        defaultCategory: {
          expense: categories.defaultFor('expense', 'food'),
          income: categories.defaultFor('income', 'etc'),
        },
      })
    );
  };

  const scan = async (files: File[]) => {
    if (files.length === 0) return;
    setScanning(true);
    try {
      const today = todayKey();
      // 고른 순서대로 읽어 앞 사진의 마지막 날짜를 다음 사진이 이어받는다.
      const texts: string[] = [];
      for (const file of files) texts.push(await readImageText(await prepareReceiptImage(file)));
      if (files.length === 1 && isReceiptText(texts[0])) {
        scanReceipt(texts[0], today);
        return;
      }
      const scans: StatementRow[][] = [];
      let carry: string | null = null;
      for (const text of texts) {
        const { rows, lastDate } = parseStatementText(text, today, carry);
        scans.push(rows);
        carry = lastDate;
      }
      if (files.length === 1 && scans[0].length < 2) scanReceipt(texts[0], today);
      else scanStatement(scans);
    } catch (error) {
      showToast({ message: error instanceof Error ? error.message : '영수증을 읽지 못했어요.' });
    } finally {
      setScanning(false);
    }
  };

  return { scan, scanning };
}
