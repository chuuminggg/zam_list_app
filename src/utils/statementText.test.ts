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

  // 아래 글자는 토스·은행 화면을 흉내 낸 캡처를 실제 OCR(tesseract)로 읽은 결과다 (아이콘 조각·'원' 오인식 포함).
  const rowsOf = (text: string, today = '2026-10-26') =>
    parseStatementText(text, today).rows.map((r) => [r.date, r.type, r.amount, r.name]);

  it('토스 통장: 잔액(글자 없이 시각 옆)·통장 잔액 머리는 빼고, 아이콘 조각·깨진 날짜 머리줄을 고친다', () => {
    const text = [
      '토스뱅크 통장',
      '으',
      '1,182,300원',
      '108 24일 금요일',
      'Oo  스타벅스 강남점        -6,500원',
      '14:22ㆍ체크카드          1,182,3008',
      'oO  홍길동               +50,000원',
      '09:10ㆍ입금              1,188,800원',
      '102 232 목요일',
      '배달의민족               -23,900원',
      '20:41ㆍ체크카드          1,138,800원',
      '이자                     +3128',
      '00:02 - 243              1,162,7008',
      's    김영희              -15,000원',
      '07:30 - £3               1,165,588',
    ].join('\n');
    expect(rowsOf(text)).toEqual([
      ['2026-10-24', 'expense', 6500, '스타벅스 강남점'],
      ['2026-10-24', 'income', 50000, '홍길동'],
      ['2026-10-23', 'expense', 23900, '배달의민족'],
      ['2026-10-23', 'income', 312, '이자'],
      ['2026-10-23', 'expense', 15000, '김영희'],
    ]);
  });

  it('부호 없는 금액은 아래 줄의 입금·출금 표시로 수입·지출을 나눈다', () => {
    const text = '10월 23일 목요일\n이자   312원\n00:02ㆍ입금   1,162,7008\nGS25 역삼점   3,200원\n08:15ㆍ체크카드   1,162,388';
    expect(rowsOf(text)).toEqual([
      ['2026-10-23', 'income', 312, '이자'],
      ['2026-10-23', 'expense', 3200, 'GS25 역삼점'],
    ]);
  });

  it('은행: 금액 옆 입금·출금으로 나누고, 날짜·시각·금액 줄 아래에 있는 이름을 붙인다', () => {
    const below = [
      '거래내역조회',
      '2026.10.24 14:22        출금 6,.500원',
      '스타벅스강남            잔액 1,182,3008',
      '2026.10.24 09:10        입금 50,000원',
      '홍길동                  잔액 1188,800원',
    ].join('\n');
    const inline = '2026.10.23 20:41\n우아한형제들   출금 23,900원\n잔액 ,138,800원\n2026.10.23 00:02\n예금이자   입금 312원';
    expect(rowsOf(below)).toEqual([
      ['2026-10-24', 'expense', 6500, '스타벅스강남'],
      ['2026-10-24', 'income', 50000, '홍길동'],
    ]);
    expect(rowsOf(inline)).toEqual([
      ['2026-10-23', 'expense', 23900, '우아한형제들'],
      ['2026-10-23', 'income', 312, '예금이자'],
    ]);
  });

  it('종이 영수증 글자는 거래 목록이 아니다', () => {
    expect(isReceiptText('스타벅스\n부가세 1,164\n합계 12,800')).toBe(true);
    expect(isReceiptText('오늘\n스타벅스 -4,500원')).toBe(false);
  });
});
