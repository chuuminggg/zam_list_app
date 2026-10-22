import { MAX_LEDGER_AMOUNT } from '../../shared/data';
import type { LedgerType } from '../types';
import { DATE_ANYWHERE, TIME, addDays, findDate, monthDay } from './receiptText';

/** 결제·거래 내역 목록 캡처에서 읽은 거래 한 건 */
export interface StatementRow {
  /** YYYY-MM-DD */
  date: string;
  /** 날짜 머리줄보다 위에 있어 날짜를 짐작했는지 (확인 필요) */
  dateUncertain: boolean;
  amount: number;
  /** 금액 앞 +나 '입금'·'받음'이면 수입, 그 외는 지출 */
  type: LedgerType;
  /** 가게·받는 사람·적요 (모르면 빈 문자열) */
  name: string;
  /** 같은 줄·아래 줄의 부가 정보 (출금·입금, 카드 이름 등). 결제수단·돈 이동 판단에 쓴다. */
  detail: string;
}

export interface StatementScan {
  rows: StatementRow[];
  /** 이 사진에서 마지막으로 본 날짜. 다음 사진의 머리줄 위 줄이 이어받는다. */
  lastDate: string | null;
}

/** 종이 영수증에만 나오는 말. 있으면 거래 목록이 아니라 영수증 한 장으로 본다. */
const RECEIPT_ONLY = /부가세|부가가치세|공급가|사업자|가맹점번호|승인번호|과세|면세/;

/** 한 달 합계·결제 예정처럼 거래가 아닌 요약 줄 */
const SUMMARY = /^총|이번달|지난달|합계|결제예정|청구예정|이용가능|한도|쓴금액|받은금액합계/;

/** 줄 오른쪽에 붙는 잔액·누적 금액. 여기부터는 거래 금액이 아니다. */
const BALANCE = /잔액|잔고|누적|적립|포인트/;

/** 은행 목록처럼 줄 맨 앞에 오는 연도 없는 날짜 (10.21, 10/21) */
const LEADING_MONTH_DAY = /^(\d{1,2})\s*[./]\s*(\d{1,2})(?![\d,])/;
const RELATIVE_DAY = /^(오늘|어제)(?![가-힣])/;
const WEEKDAY = /\(?\s*[월화수목금토일]\s*\)|[월화수목금토일]요일/g;

/** 부호가 붙을 수 있는 금액. 목록의 다른 숫자와 헷갈리지 않게 쉼표가 있거나 '원'이 붙은 것만 */
const ROW_MONEY = /([+\-−–])?\s*(?<![\d,])(\d{1,3}(?:,\d{3})+|\d{1,9})(?![\d,])(\s*원)?/g;

/** 이름에서 뺄 거래 종류 낱말 (체크카드출금, 타행이체, 입금 등) */
const KIND_WORD = /^(?:체크카드|신용카드|카드|계좌|전자금융|타행|당행|인터넷|모바일|스마트|오픈뱅킹)?(?:입금|출금|지급|받음|보냄|결제|승인|이체)$|^\|$/;
const INCOME_MARK = /입금|받음|받은돈|환급/;

const compact = (text: string) => text.replace(/\s+/g, '');
const letters = (text: string) => (text.match(/\p{L}/gu) ?? []).length;

export function isReceiptText(text: string): boolean {
  return RECEIPT_ONLY.test(compact(text));
}

/** 줄에 날짜(머리줄)가 있으면 YYYY-MM-DD */
function lineDate(line: string, today: string): string | null {
  const relative = compact(line).match(RELATIVE_DAY);
  if (relative) return relative[1] === '오늘' ? today : addDays(today, -1);
  const leading = line.match(LEADING_MONTH_DAY);
  if (leading) {
    const date = monthDay(Number(leading[1]), Number(leading[2]), today);
    if (date) return date;
  }
  return findDate([line], today);
}

function stripDate(line: string): string {
  return line
    .replace(DATE_ANYWHERE, ' ')
    .replace(LEADING_MONTH_DAY, ' ')
    .replace(RELATIVE_DAY, ' ')
    .replace(WEEKDAY, ' ')
    .replace(TIME, ' ');
}

function cleanName(text: string): string {
  return text
    .split(/\s+/)
    .filter((word) => word && !KIND_WORD.test(word))
    .join(' ')
    .replace(/^[^\p{L}\d(]+|[^\p{L}\d)]+$/gu, '')
    .slice(0, 30)
    .trim();
}

/** 줄의 마지막 거래 금액 (쉼표나 '원'이 있는 것) */
function rowAmount(line: string) {
  let found: { sign: string | undefined; amount: number; index: number; length: number } | null = null;
  for (const m of line.matchAll(ROW_MONEY)) {
    if (!m[2].includes(',') && m[3] === undefined) continue;
    const amount = Number(m[2].replace(/,/g, ''));
    if (amount <= 0 || amount > MAX_LEDGER_AMOUNT) continue;
    found = { sign: m[1], amount, index: m.index, length: m[0].length };
  }
  return found;
}

/**
 * 토스·은행 앱의 거래 목록 캡처 글자에서 거래를 뽑는다.
 * 날짜 머리줄(10월 21일, 오늘, 2026.10.21, 10.21) 아래에 '이름 … 금액' 줄이 반복되는 화면을 가정한다.
 * 이름이 금액 위 줄에 따로 있거나, 카드 이름·시각 같은 부가 줄이 거래 아래 붙는 경우도 받는다.
 * carryDate는 앞 사진의 마지막 날짜 (스크롤 캡처의 머리줄 위 줄이 이어받는다).
 */
export function parseStatementText(text: string, today: string, carryDate: string | null = null): StatementScan {
  const rows: (Omit<StatementRow, 'date' | 'dateUncertain'> & { date: string | null })[] = [];
  let current: string | null = null;
  let firstDate: string | null = null;
  /** 아직 거래에 붙지 않은 글자 줄. 마지막 것은 다음 거래의 이름, 나머지는 앞 거래의 부가 정보 */
  let pending: string[] = [];

  const flushToPrevious = (lines: string[]) => {
    const previous = rows[rows.length - 1];
    if (previous && lines.length > 0) previous.detail = [previous.detail, ...lines].join(' ').trim();
  };

  for (const raw of text.split(/\r?\n/)) {
    const line = raw.trim().replace(/(\d)\s*[,.]\s*(?=\d{3}(?!\d))/g, '$1,');
    if (!line) continue;
    const date = lineDate(line, today);
    if (date) {
      current = date;
      firstDate ??= date;
    }
    let rest = stripDate(line);
    if (SUMMARY.test(compact(rest))) continue;
    const balance = rest.search(BALANCE);
    if (balance >= 0) rest = rest.slice(0, balance);

    const money = rowAmount(rest);
    if (!money) {
      if (date) {
        // 새 날짜 머리줄: 그 전까지 남은 줄은 앞 거래의 부가 정보
        flushToPrevious(pending);
        pending = [];
      } else if (letters(rest) >= 2) {
        pending.push(rest.trim());
      }
      continue;
    }

    const before = rest.slice(0, money.index);
    const after = rest.slice(money.index + money.length);
    // 이름이 금액 줄에 없으면 바로 위 글자 줄이 이름
    let source = before;
    let name = cleanName(before);
    if (!name && pending.length > 0) {
      source = `${before} ${pending.pop() ?? ''}`;
      name = cleanName(source);
    }
    flushToPrevious(pending);
    pending = [];

    const detail = `${name ? source.replace(name, ' ') : source} ${after}`.replace(/\s+/g, ' ').trim();
    const sign = money.sign;
    const type: LedgerType =
      sign === '+' ? 'income' : sign ? 'expense' : INCOME_MARK.test(compact(detail)) ? 'income' : 'expense';
    rows.push({ date: current, amount: money.amount, type, name, detail });
  }
  flushToPrevious(pending);

  // 머리줄 위 줄: 앞 사진의 마지막 날짜 → 이 사진의 첫 날짜 → 오늘 (뒤 둘은 확인 필요)
  const fallback = carryDate ?? firstDate ?? today;
  return {
    rows: rows.map((row) => ({
      ...row,
      date: row.date ?? fallback,
      dateUncertain: row.date === null && carryDate === null,
    })),
    lastDate: current ?? carryDate,
  };
}
