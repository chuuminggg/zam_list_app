import { describe, expect, it } from 'vitest';
import { isReceiptText, parseStatementText } from './statementText';

const TODAY = '2026-10-22';

describe('statement text', () => {
  it('토스 결제내역: 날짜 머리줄 아래 이름·부호 금액, 아래 붙은 카드·시각 줄은 부가 정보로', () => {
    const text = [
      '이번 달 쓴 금액 128,300원',
      '오늘',
      '스타벅스 강남점 -4,500원',
      '신한카드 | 14:23',
      'GS25 역삼점 -3,200원',
      '어제',
      '홍길동 +50,000원',
      '토스뱅크 | 받음',
      '10월 19일 일요일',
      '쿠팡 -32,900원',
    ].join('\n');
    expect(parseStatementText(text, TODAY)).toEqual({
      rows: [
        { date: '2026-10-22', dateUncertain: false, amount: 4500, type: 'expense', name: '스타벅스 강남점', detail: '신한카드 |' },
        { date: '2026-10-22', dateUncertain: false, amount: 3200, type: 'expense', name: 'GS25 역삼점', detail: '' },
        { date: '2026-10-21', dateUncertain: false, amount: 50000, type: 'income', name: '홍길동', detail: '토스뱅크 | 받음' },
        { date: '2026-10-19', dateUncertain: false, amount: 32900, type: 'expense', name: '쿠팡', detail: '' },
      ],
      lastDate: '2026-10-19',
    });
  });

  it('은행 거래내역: 이름이 금액 위 줄에 있고, 입금·출금 표시와 잔액이 같은 줄에 (OCR이 쉼표를 띄워도)', () => {
    const text = [
      '2026.10.21 14:23',
      '홍길동',
      '입금 50, 000원 잔액 1,234,567원',
      '2026.10.20 09:10',
      '체크카드출금 스타벅스',
      '4,500원 잔액 1,184,567원',
    ].join('\n');
    const { rows } = parseStatementText(text, TODAY);
    expect(rows).toMatchObject([
      { date: '2026-10-21', amount: 50000, type: 'income', name: '홍길동' },
      { date: '2026-10-20', amount: 4500, type: 'expense', name: '스타벅스' },
    ]);
  });

  it('연도 없는 날짜는 미래가 되지 않는 가장 가까운 해로, 줄 앞 10.21 형태도 날짜로', () => {
    const { rows } = parseStatementText('12월 30일\n편의점 -1,200원\n10.21 메가커피 2,000원', TODAY);
    expect(rows.map((r) => r.date)).toEqual(['2025-12-30', '2026-10-21']);
  });

  it('머리줄 위 줄: 앞 사진의 마지막 날짜를 이어받고, 없으면 첫 머리줄 날짜로 두되 확인 표시', () => {
    const text = '다이소 -5,000원\n10월 20일\n올리브영 -12,000원';
    expect(parseStatementText(text, TODAY, '2026-10-21').rows[0]).toMatchObject({ date: '2026-10-21', dateUncertain: false });
    expect(parseStatementText(text, TODAY).rows[0]).toMatchObject({ date: '2026-10-20', dateUncertain: true });
  });

  it('쉼표·원이 없는 숫자(시각·카드번호)와 요약 줄은 거래로 보지 않는다', () => {
    expect(parseStatementText('오늘\n승인 1234\n합계 30,000원\n총 2건', TODAY).rows).toEqual([]);
  });

  it('종이 영수증 글자는 거래 목록이 아니다', () => {
    expect(isReceiptText('스타벅스\n부가세 1,164\n합계 12,800')).toBe(true);
    expect(isReceiptText('오늘\n스타벅스 -4,500원')).toBe(false);
  });
});
