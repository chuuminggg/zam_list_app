/** OCR 결과의 낱말 위치 (픽셀) */
export interface OcrBox {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export interface OcrWord {
  text: string;
  bbox: OcrBox;
}

export interface OcrLine {
  /** 띄어쓰기를 살린 줄 글자 */
  text: string;
  words: OcrWord[];
}

/** 금액 글씨 색. 은행·토스 앱은 입금을 파랑, 출금을 빨강(또는 검정)으로 보여준다. */
export type InkColor = 'blue' | 'red' | null;

/** 부호 없이 숫자로 시작하는 금액 낱말 (6,500원, 6,500, 312원, '원'이 떨어진 312) */
function isUnsignedAmount(text: string, next: string | undefined): boolean {
  return /^\d{1,3}(?:[,.]\d{3})+\D*$|^\d+원$/.test(text) || (/^\d+$/.test(text) && next === '원');
}

/**
 * OCR 줄을 글자로 다시 잇는다 (띄어쓰기는 OCR 줄 글자를 그대로 쓴다).
 * 부호 없는 금액이 파란 글씨면 앞에 +, 빨간 글씨면 -를 붙여
 * 색으로만 입금·출금을 나누는 화면도 글자만으로 구분할 수 있게 한다.
 */
export function linesToText(lines: OcrLine[], colorOf: (box: OcrBox) => InkColor): string {
  return lines
    .map((line) => {
      let text = line.text.replace(/\s+$/, '');
      let from = 0;
      const words = line.words.filter((w) => w.text.trim());
      words.forEach((word, i) => {
        const value = word.text.trim();
        const at = text.indexOf(value, from);
        if (at < 0) return;
        from = at + value.length;
        const sign = text.slice(0, at).trimEnd().slice(-1);
        if (!isUnsignedAmount(value, words[i + 1]?.text.trim()) || sign === '+' || sign === '-') return;
        const color = colorOf(word.bbox);
        const mark = color === 'blue' ? '+' : color === 'red' ? '-' : '';
        if (!mark) return;
        text = `${text.slice(0, at)}${mark}${text.slice(at)}`;
        from += 1;
      });
      return text;
    })
    .join('\n');
}
