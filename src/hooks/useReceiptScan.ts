import { useState } from 'react';
import { useLedgerPrefsStore } from '../stores/ledgerPrefsStore';
import { useLedgerStore } from '../stores/ledgerStore';
import { useToastStore } from '../stores/toastStore';
import { todayKey } from '../utils/date';
import { prepareReceiptImage } from '../utils/image';
import { readImageText } from '../utils/ocr';
import { receiptDraft, receiptNotice } from '../utils/receipt';
import { parseReceiptText } from '../utils/receiptText';
import { buildStatementEntries, mergeStatementScans, statementNotice } from '../utils/statement';
import { isReceiptText, parseStatementText, type StatementRow } from '../utils/statementText';
import type { TransactionDraft } from '../utils/wishPurchase';
import { useLedgerCategories } from './useLedgerCategories';

/**
 * 영수증·결제 화면·거래 내역 캡처를 기기 안에서 읽는다(OCR). 실패·안내는 토스트로 보여준다.
 * - 영수증·결제 화면 한 장 → 지출 초안을 onDraft로 넘겨 확인 시트를 연다.
 * - 거래 목록(사진 한 장에서 2건 이상, 또는 여러 장) → 줄마다 한 건씩 바로 저장하고 되돌리기를 준다.
 *   취소·돈 이동·이미 있는 내역·고정 항목과 겹치는 줄은 건너뛴다.
 * 로그인·서버 없이 동작하고 사진은 어디에도 올리지 않는다.
 */
export function useReceiptScan(onDraft: (draft: TransactionDraft) => void) {
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
    const { transactions, fixedItems, addTransactions, deleteTransaction } = useLedgerStore.getState();
    const options = (type: 'income' | 'expense') => categories.visible(type).map((c) => ({ id: c.id, name: c.name }));
    const entries = buildStatementEntries(rows, {
      transactions,
      fixedItems,
      categories: { expense: options('expense'), income: options('income') },
      defaultCategory: {
        expense: categories.defaultFor('expense', 'food'),
        income: categories.defaultFor('income', 'etc'),
      },
    });
    const created = addTransactions(
      entries
        .filter((e) => e.checked)
        .map((e) => ({
          type: e.type,
          category: e.category,
          amount: e.amount,
          date: e.date,
          memo: e.memo.trim() || undefined,
          paymentMethod: e.type === 'expense' ? e.paymentMethod : undefined,
        }))
    );
    showToast({
      message: statementNotice(entries),
      action:
        created.length > 0
          ? { label: '되돌리기', run: () => created.forEach((t) => deleteTransaction(t.id)) }
          : undefined,
    });
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
