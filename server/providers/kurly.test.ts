import { describe, expect, it } from 'vitest';
import searchFixture from './__fixtures__/kurly-search.json';
import { parseKurlyProducts } from './kurly.js';

describe('parseKurlyProducts', () => {
  it('PRODUCT_LIST 섹션만 골라 ProductResult로 변환한다', () => {
    const [first, second] = parseKurlyProducts(searchFixture);
    expect(first).toEqual({
      provider: 'kurly',
      externalId: '5063110',
      name: '[연세우유 x 마켓컬리] 전용목장우유 900mL',
      price: 2780,
      url: 'https://www.kurly.com/goods/5063110',
      imageUrl: 'https://product-image.kurly.com/product/image/320bf4ca.jpg',
      soldOut: false,
      badges: ['샛별배송', '컬리 온리'],
    });
    // 할인가가 있으면 할인가를 쓴다
    expect(second.price).toBe(7000);
    expect(second.badges).toEqual(['30% 할인', '샛별배송', '품절']);
    expect(second.soldOut).toBe(true);
  });

  it('상품 섹션이 없으면 빈 배열', () => {
    expect(parseKurlyProducts({ data: { listSections: [] } })).toEqual([]);
    expect(parseKurlyProducts({})).toEqual([]);
  });
});
