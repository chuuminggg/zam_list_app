import { describe, expect, it } from 'vitest';
import searchFixture from './__fixtures__/daiso-search.json';
import { mergeDaisoStock, parseDaisoProducts, parseDaisoStores } from './daiso.js';

describe('parseDaisoProducts', () => {
  it('검색 응답을 ProductResult로 변환한다', () => {
    const [first, second] = parseDaisoProducts(searchFixture);
    expect(first).toEqual({
      provider: 'daiso',
      externalId: '1047618',
      name: '심플 팬트리수납함(약14*21*15 cm)',
      price: 2000,
      url: 'https://www.daisomall.co.kr/pd/pdr/SCR_PDR_0001?pdNo=1047618',
      imageUrl:
        'https://cdn.daisomall.co.kr/file/PD/20260119/eA4jhxzclhkWBLdfXdne1047618_00_00eA4jhxzclhkWBLdfXdne.jpg',
      soldOut: false,
      badges: ['매장픽업'],
    });
    expect(second.soldOut).toBe(true);
    expect(second.badges).toEqual(['신상품', '온라인 품절']);
  });

  it('결과가 없으면 빈 배열', () => {
    expect(parseDaisoProducts({})).toEqual([]);
  });
});

describe('mergeDaisoStock', () => {
  const stores = parseDaisoStores([
    { strCd: '11199', strNm: '강남역점', strAddr: '서울 강남구', opngTime: '10:00', clsngTime: '22:00', pkupYn: 'N' },
    { strCd: '10803', strNm: '매봉역점', strAddr: '서울 강남구', pkupYn: 'Y' },
    { strCd: '10600', strNm: '역삼점', pkupYn: 'N' },
  ]);

  it('수량이 있으면 재고 있음, 0이면 수량 비공개로 표시한다', () => {
    const merged = mergeDaisoStock(stores, [
      { strCd: '11199', stck: '0' },
      { strCd: '10803', stck: '0' },
      { strCd: '10600', stck: '4' },
    ]);
    expect(merged.map((s) => [s.name, s.status, s.label])).toEqual([
      ['강남역점', 'unknown', '수량 비공개'],
      ['매봉역점', 'unknown', '픽업 매장 · 수량 비공개'],
      ['역삼점', 'in_stock', '재고 있음'],
    ]);
  });

  it('재고 응답에 없는 매장도 유지한다', () => {
    expect(mergeDaisoStock(stores, [])).toHaveLength(3);
  });
});
