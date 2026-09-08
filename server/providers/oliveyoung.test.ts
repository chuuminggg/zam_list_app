import { describe, expect, it } from 'vitest';
import { parseOliveyoungProducts, parseOliveyoungStockStores, resolveImageUrl } from './oliveyoung.js';

// 실제 응답을 받지 못해(ZYTE_API_KEY 없음) daiso-mcp가 사용하는 필드명 기준으로 구성한 샘플.
// 키 발급 후 실제 응답으로 교체할 것.

describe('parseOliveyoungProducts', () => {
  it('상품 목록(원본 오타 serachList 포함)을 변환한다', () => {
    const result = parseOliveyoungProducts({
      serachList: [
        {
          goodsNumber: 'A000000184228',
          goodsName: '선크림 50ml',
          imagePath: '10/0000/0018/A00000018422801ko.jpg',
          priceToPay: 18900,
          discountRate: 30,
          o2oStockFlag: true,
        },
        { goodsNumber: 'A000000111111', goodsName: '품절 상품', o2oStockFlag: false, o2oRemainQuantity: 0 },
        { goodsName: '번호 없는 항목' },
      ],
    });
    expect(result).toHaveLength(2);
    expect(result[0]).toMatchObject({
      externalId: 'A000000184228',
      price: 18900,
      soldOut: false,
      badges: ['30% 할인'],
      url: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000184228',
      imageUrl: 'https://image.oliveyoung.co.kr/uploads/images/goods/10/0000/0018/A00000018422801ko.jpg',
    });
    expect(result[1]).toMatchObject({ soldOut: true, badges: ['매장 재고 없음'] });
  });
});

describe('parseOliveyoungStockStores', () => {
  it('판매 여부와 수량으로 상태를 정한다', () => {
    const stores = parseOliveyoungStockStores({
      storeList: [
        { storeCode: 'D1', storeName: '명동본점', salesStoreYn: true, remainQuantity: 12 },
        { storeCode: 'D2', storeName: '명동역점', salesStoreYn: true, remainQuantity: 0, o2oRemainQuantity: 3 },
        { storeCode: 'D3', storeName: '을지로점', salesStoreYn: true, remainQuantity: 0 },
        { storeCode: 'D4', storeName: '회현점', salesStoreYn: false },
      ],
    });
    expect(stores.map((s) => [s.name, s.status, s.label])).toEqual([
      ['명동본점', 'in_stock', '재고 9개 이상'],
      ['명동역점', 'in_stock', '재고 3개'],
      ['을지로점', 'out_of_stock', '품절'],
      ['회현점', 'not_sold', '미판매'],
    ]);
  });
});

describe('resolveImageUrl', () => {
  it('경로 형태별로 절대 URL을 만든다', () => {
    expect(resolveImageUrl('//img.example.com/a.jpg')).toBe('https://img.example.com/a.jpg');
    expect(resolveImageUrl('/uploads/images/goods/a.jpg')).toBe('https://image.oliveyoung.co.kr/uploads/images/goods/a.jpg');
    expect(resolveImageUrl(undefined)).toBeUndefined();
  });
});
