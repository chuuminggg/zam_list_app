import { MAX_LEDGER_AMOUNT } from '../../shared/data';
import type { PaymentMethod } from '../types';

/** 인식 결과. 찾지 못한 값은 null */
export interface ReceiptScan {
  /** 금액이나 날짜를 하나라도 찾았는지 (영수증·결제 내역으로 보이는지) */
  found: boolean;
  /** 실제로 낸 합계 (원) */
  amount: number | null;
  /** YYYY-MM-DD */
  date: string | null;
  /** 가게·결제처 이름 (모르면 빈 문자열) */
  merchant: string;
  /** 넘겨준 카테고리 중 하나의 id */
  category: string | null;
  paymentMethod: PaymentMethod | null;
}

/** 고를 수 있는 지출 카테고리 (숨긴 것 제외, 사용자 카테고리 포함) */
export interface ReceiptCategoryOption {
  id: string;
  name: string;
}

/**
 * 합계 금액 옆에 붙는 말. 앞에 있을수록 우선한다.
 * OCR은 한글 띄어쓰기를 자주 틀려 공백을 뺀 줄에서 찾는다.
 */
const TOTAL_KEYWORDS = [
  '받을금액',
  '결제금액',
  '승인금액',
  '청구금액',
  '합계금액',
  '총금액',
  '총액',
  '합계',
  '결제액',
  '이용금액',
  '거래금액',
  '이체금액',
  '보낸금액',
  '출금금액',
  '판매금액',
  '금액',
];

/** 합계가 아닌 금액 줄 (세금·할인·받은 돈·누적 등) */
const NOT_TOTAL = /부가세|부가가치세|세액|과세|면세|공급가|봉사료|할인|포인트|적립|거스름|잔돈|받은금액|잔액|한도|단가|누적/;

const FULL_DATE = /(?<!\d)(20\d{2}|\d{2})\s*[.\-/년]\s*(\d{1,2})\s*[.\-/월]\s*(\d{1,2})(?!\d)/;
const KOREAN_MONTH_DAY = /(?<!\d)(\d{1,2})\s*월\s*(\d{1,2})\s*일/;
/** 카드 문자처럼 연도 없는 10/19. 다른 날짜를 못 찾았을 때만 쓴다. */
const SLASH_MONTH_DAY = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?![\d/])/;
export const DATE_ANYWHERE = new RegExp(`${FULL_DATE.source}|${KOREAN_MONTH_DAY.source}|${SLASH_MONTH_DAY.source}`, 'g');
export const TIME = /(?<!\d)\d{1,2}\s*:\s*\d{2}(?:\s*:\s*\d{2})?(?!\d)/g;

/** 천 단위 쉼표 금액이거나 '원'·'₩'이 붙은 숫자 */
const MONEY = /(?:₩\s*)?(?<![\d,])(\d{1,3}(?:,\d{3})+|\d{1,13})(?![\d,])(\s*원)?/g;

/** 가게 이름이 아닌 머리말 줄 */
const NOT_MERCHANT =
  /영수증|전표|고객용|가맹점용|승인|주문|결제|거래|일시|날짜|금액|합계|감사|환영|고객|번호|사업자|대표|주소|전화|TEL|POS|내역|일시불|할부|발신|카드|품명|수량|단가/i;
const MERCHANT_LABEL = /^\s*[[(]?\s*(?:상\s*호\s*명?|가\s*맹\s*점\s*명?|매\s*장\s*명?|상\s*점\s*명?)\s*[\])]?\s*[:：]?\s*/;
const MAX_MERCHANT = 30;

/** 기본 카테고리를 가게 이름으로 짐작하는 말. 위에 있을수록 먼저 본다 (쿠팡이츠 → 식비, 쿠팡 → 쇼핑). */
const CATEGORY_KEYWORDS: [string, RegExp][] = [
  [
    'cafe',
    /카페|커피|스타벅스|STARBUCKS|이디야|투썸|메가커피|메가MGC|빽다방|컴포즈|할리스|파스쿠찌|폴바셋|베이커리|파리바게뜨|뚜레쥬르|배스킨|던킨|디저트|공차/i,
  ],
  [
    'food',
    /식당|음식|분식|치킨|피자|버거|맥도날드|롯데리아|김밥|국밥|한식|중식|일식|고기|횟집|족발|배달의민족|배민|요기요|쿠팡이츠|도시락|반찬|정육|마트|이마트|홈플러스|편의점|GS25|세븐일레븐|이마트24|(?<![A-Z])CU(?![A-Z])/i,
  ],
  ['transport', /택시|카카오T|버스|지하철|교통|주유|주차|코레일|KTX|SRT|고속도로|하이패스|티머니|오일|OIL/i],
  ['medical', /병원|의원|약국|치과|한의원|안과|피부과|정형외과|내과|소아과|이비인후과/],
  ['subscription', /넷플릭스|NETFLIX|유튜브|YOUTUBE|멜론|스포티파이|SPOTIFY|디즈니|티빙|웨이브|왓챠/i],
  ['culture', /CGV|메가박스|롯데시네마|영화|노래|PC방|볼링|공연|티켓|교보문고|영풍문고|YES24|알라딘/i],
  ['education', /학원|교습|강의|인강/],
  ['living', /다이소|생활용품|세탁|철물|이케아|IKEA/i],
  [
    'shopping',
    /쿠팡|무신사|올리브영|백화점|아울렛|11번가|G마켓|지마켓|옥션|SSG|에이블리|지그재그|29CM|유니클로|ZARA|자라|ABC마트|나이키|아디다스/i,
  ],
];

const pad = (n: number) => String(n).padStart(2, '0');

export function addDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** 실제로 있는 날짜면 YYYY-MM-DD */
function toDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const d = new Date(Date.UTC(year, month - 1, day));
  if (d.getUTCMonth() !== month - 1) return null;
  return `${year}-${pad(month)}-${pad(day)}`;
}

/** 2000년 이후이고 내일(시차 여유)보다 미래가 아닌 날짜만 */
function plausible(date: string | null, today: string): date is string {
  return date !== null && date >= '2000-01-01' && date <= addDays(today, 1);
}

/** 연도 없는 월·일. 올해로 보고, 미래가 되면 작년으로 본다. */
export function monthDay(month: number, day: number, today: string): string | null {
  const year = Number(today.slice(0, 4));
  const date = toDate(year, month, day);
  if (date && date > addDays(today, 1)) return toDate(year - 1, month, day);
  return date;
}

export function findDate(lines: string[], today: string): string | null {
  for (const pattern of [FULL_DATE, KOREAN_MONTH_DAY, SLASH_MONTH_DAY]) {
    for (const line of lines) {
      const m = line.match(pattern);
      if (!m) continue;
      let date: string | null;
      if (pattern === FULL_DATE) {
        const year = Number(m[1]) < 100 ? 2000 + Number(m[1]) : Number(m[1]);
        date = toDate(year, Number(m[2]), Number(m[3]));
      } else {
        date = monthDay(Number(m[1]), Number(m[2]), today);
      }
      if (plausible(date, today)) return date;
    }
  }
  return null;
}

/** 날짜·시각을 지우고 OCR이 띄운 쉼표·점(12. 800)을 붙인다. */
function moneyText(line: string): string {
  return line
    .replace(DATE_ANYWHERE, ' ')
    .replace(TIME, ' ')
    .replace(/(\d)\s*[,.]\s*(?=\d{3}(?!\d))/g, '$1,');
}

/** 줄 안의 금액 후보. strict면 쉼표가 있거나 '원'·'₩'이 붙은 것만 */
function amountsIn(line: string, strict: boolean): number[] {
  const result: number[] = [];
  for (const m of moneyText(line).matchAll(MONEY)) {
    const marked = m[0].includes('₩') || m[2] !== undefined;
    if (strict && !m[1].includes(',') && !marked) continue;
    // 쉼표 없는 긴 숫자는 승인번호·카드번호일 가능성이 높다.
    if (!m[1].includes(',') && !marked && m[1].length > 9) continue;
    const value = Number(m[1].replace(/,/g, ''));
    if (Number.isSafeInteger(value) && value > 0 && value <= MAX_LEDGER_AMOUNT) result.push(value);
  }
  return result;
}

export function findAmount(lines: string[]): number | null {
  // 1) 합계를 뜻하는 말이 있는 줄(또는 그다음 줄)의 금액. 우선순위가 같으면 아래쪽 줄(최종 합계)을 쓴다.
  let best: { rank: number; amount: number } | null = null;
  for (const [i, line] of lines.entries()) {
    const compact = line.replace(/\s+/g, '');
    if (NOT_TOTAL.test(compact)) continue;
    const rank = TOTAL_KEYWORDS.findIndex((k) => compact.includes(k));
    if (rank < 0 || (best && rank > best.rank)) continue;
    let amounts = amountsIn(line, false);
    // 금액만 다음 줄에 있는 결제 앱 화면
    if (amounts.length === 0 && i + 1 < lines.length && !NOT_TOTAL.test(lines[i + 1].replace(/\s+/g, ''))) {
      amounts = amountsIn(lines[i + 1], false);
    }
    // 수량·금액이 한 줄에 있으면 금액이 오른쪽 끝에 온다.
    if (amounts.length > 0) best = { rank, amount: amounts[amounts.length - 1] };
  }
  if (best) return best.amount;

  // 2) 그런 말이 없으면 쉼표·'원'이 붙은 금액 중 가장 큰 것
  const all = lines.filter((line) => !NOT_TOTAL.test(line.replace(/\s+/g, ''))).flatMap((line) => amountsIn(line, true));
  return all.length > 0 ? Math.max(...all) : null;
}

export function findPaymentMethod(text: string): PaymentMethod | null {
  const compact = text.replace(/\s+/g, '');
  if (/계좌이체|이체|송금|무통장/.test(compact)) return 'transfer';
  if (/카드|신용|일시불|할부|VISA|MASTER/i.test(compact)) return 'card';
  if (/현금/.test(compact)) return 'cash';
  if (/승인/.test(compact)) return 'card';
  return null;
}

function cleanMerchant(text: string): string {
  return text
    .replace(/^[^\p{L}\d(]+|[^\p{L}\d)]+$/gu, '')
    .replace(/\s+/g, ' ')
    .slice(0, MAX_MERCHANT)
    .trim();
}

export function findMerchant(lines: string[]): string {
  // 1) '상호: ○○' 처럼 이름표가 붙은 줄
  for (const line of lines) {
    if (!MERCHANT_LABEL.test(line)) continue;
    const name = cleanMerchant(line.replace(MERCHANT_LABEL, '').split(/\s{2,}|대표|사업자|TEL|전화/i)[0]);
    if (name) return name;
  }
  // 2) 위쪽 줄 중 날짜·시각·금액을 지우고 글자가 남는 첫 줄
  for (const line of lines.slice(0, 8)) {
    const rest = cleanMerchant(moneyText(line).replace(MONEY, ' '));
    if ((rest.match(/[\p{L}]/gu) ?? []).length < 2 || NOT_MERCHANT.test(rest.replace(/\s+/g, ''))) continue;
    return rest;
  }
  return '';
}

export function guessCategory(merchant: string, lines: string[], categories: ReceiptCategoryOption[]): string | null {
  const ids = new Set(categories.map((c) => c.id));
  const target = [merchant, ...lines.slice(0, 8)].join('\n');
  for (const [id, pattern] of CATEGORY_KEYWORDS) {
    if (ids.has(id) && pattern.test(target)) return id;
  }
  // 사용자 카테고리 이름이 가게 이름에 들어 있으면 그 카테고리
  const compact = merchant.replace(/\s+/g, '');
  for (const c of categories) {
    const name = c.name.replace(/[\s·]+/g, '');
    if (name.length >= 2 && compact.includes(name)) return c.id;
  }
  return null;
}

/** OCR로 읽은 글자에서 금액·날짜·가게·결제수단·카테고리를 뽑는다. today는 YYYY-MM-DD. */
export function parseReceiptText(text: string, categories: ReceiptCategoryOption[], today: string): ReceiptScan {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const amount = findAmount(lines);
  const date = findDate(lines, today);
  const merchant = findMerchant(lines);
  return {
    found: amount !== null || date !== null,
    amount,
    date,
    merchant,
    category: guessCategory(merchant, lines, categories),
    paymentMethod: findPaymentMethod(text),
  };
}
