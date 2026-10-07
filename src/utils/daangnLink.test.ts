import { describe, expect, it } from 'vitest';
import { parseDaangnLink } from './daangnLink';

describe('parseDaangnLink', () => {
  it('매물 링크에서 id를 찾는다', () => {
    expect(
      parseDaangnLink('https://www.daangn.com/kr/buy-sell/apple-ipad-%EC%97%90%EC%96%B43-z2625h83h3nf/'),
    ).toBe('z2625h83h3nf');
    expect(parseDaangnLink('https://www.daangn.com/kr/buy-sell/z2625h83h3nf/')).toBe('z2625h83h3nf');
    expect(parseDaangnLink('https://www.daangn.com/kr/buy-sell/1263017473/?in=x')).toBe('1263017473');
    expect(parseDaangnLink('https://www.daangn.com/articles/1263017473')).toBe('1263017473');
  });

  it('공유 문구째 붙여 넣어도 링크를 찾는다', () => {
    expect(parseDaangnLink('당근에서 이 글 보기\nhttps://www.daangn.com/kr/buy-sell/abc-x1y2z3/ 감사합니다')).toBe('x1y2z3');
  });

  it('당근 링크가 아니면 undefined', () => {
    expect(parseDaangnLink('에어팟')).toBeUndefined();
    expect(parseDaangnLink('https://m.bunjang.co.kr/products/286794211')).toBeUndefined();
    expect(parseDaangnLink('https://www.daangn.com/kr/')).toBeUndefined();
  });
});
