import { describe, expect, it } from 'vitest';
import { findAmount, findDate, findMerchant, findPaymentMethod, parseReceiptText } from './receiptText';

const TODAY = '2026-10-21';
const CATEGORIES = [
  { id: 'food', name: '식비' },
  { id: 'cafe', name: '카페·간식' },
  { id: 'shopping', name: '쇼핑' },
  { id: 'pet-1', name: '반려동물' },
];
const lines = (text: string) => text.split('\n');

describe('receipt text', () => {
  it('종이 영수증: 합계·날짜·상호·카드를 찾는다 (OCR이 띄어쓰기·쉼표를 틀려도)', () => {
    const text = [
      '[매장명] 스타벅스 강남역점',
      '사업자번호 123-45-67890 대표 홍길동',
      'TEL 02-123-4567',
      '2026-10-19 (일) 12:31:05',
      '품명 단가 수량 금액',
      '아메리카노 4,500 2 9,000',
      '치즈케이크 3,800 1 3,800',
      '부가세 1,164',
      '합 계 12, 800',
      '신용카드 승인 12,800',
      '승인번호 30012345',
    ].join('\n');
    expect(parseReceiptText(text, CATEGORIES, TODAY)).toEqual({
      found: true,
      amount: 12800,
      date: '2026-10-19',
      merchant: '스타벅스 강남역점',
      category: 'cafe',
      paymentMethod: 'card',
    });
  });

  it('카드 승인 문자: 연도 없는 날짜, 누적 금액은 빼고, 가게 이름은 날짜·시각 뒤에서', () => {
    const text = '[Web발신]\n삼성카드 승인 홍*동\n12,800원 일시불\n10/19 12:30 메가커피 역삼점\n누적 345,000원';
    expect(parseReceiptText(text, CATEGORIES, TODAY)).toMatchObject({
      amount: 12800,
      date: '2026-10-19',
      merchant: '메가커피 역삼점',
      category: 'cafe',
      paymentMethod: 'card',
    });
  });

  it('결제 앱 화면: 금액이 이름표 다음 줄에 있다', () => {
    const text = '결제 완료\n무신사 스토어\n결제금액\n59,000원\n결제일시 2026.10.20 21:05';
    expect(parseReceiptText(text, CATEGORIES, TODAY)).toMatchObject({
      amount: 59000,
      date: '2026-10-20',
      merchant: '무신사 스토어',
      category: 'shopping',
      paymentMethod: null,
    });
  });

  it('은행 이체 화면은 계좌이체로 본다', () => {
    const text = '이체 완료\n김철수님께\n50,000원을 보냈어요\n2026년 10월 21일';
    expect(parseReceiptText(text, CATEGORIES, TODAY)).toMatchObject({
      amount: 50000,
      date: '2026-10-21',
      paymentMethod: 'transfer',
    });
  });

  it('합계 우선순위: 받을금액 > 합계, 같은 말이면 아래쪽 줄', () => {
    expect(findAmount(lines('합계 10,000\n할인 -1,000\n받을금액 9,000'))).toBe(9000);
    expect(findAmount(lines('합계 3,000\n합계 15,000'))).toBe(15000);
    // 이름표가 없으면 쉼표·원이 붙은 가장 큰 금액, 승인번호 같은 긴 숫자는 빼고
    expect(findAmount(lines('떡볶이 4,000\n순대 3500원\n승인번호 12345678'))).toBe(4000);
    expect(findAmount(lines('카드번호 1234567890123'))).toBeNull();
  });

  it('날짜: 두 자리 연도, 월·일만 있으면 올해(미래면 작년), 없는 날짜·먼 미래는 버린다', () => {
    expect(findDate(['26.10.19 14:02'], TODAY)).toBe('2026-10-19');
    expect(findDate(['12월 30일'], TODAY)).toBe('2025-12-30');
    expect(findDate(['2026-02-30', '2026/10/18'], TODAY)).toBe('2026-10-18');
    expect(findDate(['2026-10-25'], TODAY)).toBeNull();
    expect(findDate(['010-1234-5678', '123-45-67890'], TODAY)).toBeNull();
  });

  it('가게 이름·결제수단', () => {
    expect(findMerchant(['영수증', '가맹점명: 다이소 역삼점  대표 김OO'])).toBe('다이소 역삼점');
    expect(findMerchant(['고객용', '*** 행복반찬 ***'])).toBe('행복반찬');
    expect(findMerchant(['12,000원'])).toBe('');
    expect(findPaymentMethod('현금영수증 (소득공제)')).toBe('cash');
    expect(findPaymentMethod('승인번호 1234')).toBe('card');
  });

  it('카테고리: 기본 카테고리 키워드, 숨긴 카테고리는 고르지 않고, 사용자 카테고리 이름도 본다', () => {
    const scan = (text: string, categories = CATEGORIES) => parseReceiptText(text, categories, TODAY).category;
    expect(scan('쿠팡이츠\n20,000원')).toBe('food');
    expect(scan('쿠팡\n20,000원')).toBe('shopping');
    expect(scan('스타벅스\n5,000원', CATEGORIES.filter((c) => c.id !== 'cafe'))).toBeNull();
    expect(scan('행복 반려동물 병원\n30,000원', CATEGORIES)).toBe('pet-1');
  });

  it('금액·날짜가 모두 없으면 영수증이 아닌 것으로 본다', () => {
    expect(parseReceiptText('', CATEGORIES, TODAY).found).toBe(false);
    expect(parseReceiptText('고양이 사진\n귀여워', CATEGORIES, TODAY).found).toBe(false);
  });
});
