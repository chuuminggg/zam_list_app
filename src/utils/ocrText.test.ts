import { describe, expect, it } from 'vitest';
import { linesToText, type InkColor, type OcrBox } from './ocrText';

const box = (x0: number): OcrBox => ({ x0, y0: 0, x1: x0 + 10, y1: 10 });

describe('ocr text', () => {
  it('줄 글자의 띄어쓰기를 살리고, 파란 금액은 +, 빨간 금액은 -를 붙인다', () => {
    const colors: Record<number, InkColor> = { 100: 'blue', 200: 'red', 300: null };
    const text = linesToText(
      [
        { text: '홍길동   50,000원', words: [{ text: '홍길동', bbox: box(0) }, { text: '50,000원', bbox: box(100) }] },
        { text: '스타벅스 출금 6,500', words: [{ text: '스타벅스', bbox: box(0) }, { text: '출금', bbox: box(50) }, { text: '6,500', bbox: box(200) }] },
        { text: '이자 312 원', words: [{ text: '이자', bbox: box(0) }, { text: '312', bbox: box(100) }, { text: '원', bbox: box(150) }] },
        { text: '김영희 -15,000원', words: [{ text: '김영희', bbox: box(0) }, { text: '-15,000원', bbox: box(200) }] },
        { text: 'GS25 3,200원', words: [{ text: 'GS25', bbox: box(0) }, { text: '3,200원', bbox: box(300) }] },
      ],
      (b) => colors[b.x0] ?? null
    );
    expect(text.split('\n')).toEqual(['홍길동   +50,000원', '스타벅스 출금 -6,500', '이자 +312 원', '김영희 -15,000원', 'GS25 3,200원']);
  });
});
