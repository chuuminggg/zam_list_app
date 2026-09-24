import { describe, expect, it } from 'vitest';
import { parseBunjangProduct, parseBunjangProducts, resolveBunjangImage } from './bunjang.js';

describe('parseBunjangProducts', () => {
  it('검색 결과를 ProductResult로 변환한다', () => {
    const [ad, normal, sold] = parseBunjangProducts({
      list: [
        {
          pid: '426891921',
          name: '아이패드 매입',
          price: '5000000',
          product_image: 'https://media.bunjang.co.kr/product/426891921_{cnt}_1787979154_w{res}.jpg',
          status: '0',
          location: '인천광역시 서구 청라1동',
          free_shipping: true,
          ad: true,
        },
        { pid: '1', name: '아이패드 9세대', price: '250000', status: '1' },
        { pid: '2', name: '판매완료 상품', price: '1000', status: '3' },
        { name: 'pid 없는 항목' },
      ],
    });

    expect(ad).toEqual({
      provider: 'bunjang',
      externalId: '426891921',
      name: '아이패드 매입',
      price: 5000000,
      url: 'https://m.bunjang.co.kr/products/426891921',
      imageUrl: 'https://media.bunjang.co.kr/product/426891921_0_1787979154_w300.jpg',
      soldOut: false,
      badges: ['광고', '판매중', '무료배송', '인천광역시 서구 청라1동'],
    });
    expect(normal.badges).toEqual(['예약중']);
    expect(sold.soldOut).toBe(true);
  });

  it('목록이 없으면 빈 배열', () => {
    expect(parseBunjangProducts({})).toEqual([]);
  });
});

describe('resolveBunjangImage', () => {
  it('치환자를 채운다', () => {
    expect(resolveBunjangImage('a_{cnt}_b_w{res}.jpg')).toBe('a_0_b_w300.jpg');
    expect(resolveBunjangImage(undefined)).toBeUndefined();
  });
});

describe('parseBunjangProduct', () => {
  const detail = (product: Record<string, unknown>) => parseBunjangProduct({ data: { product } });

  it('상세 응답을 ProductResult로 변환한다', () => {
    const result = detail({
      pid: 286794211,
      name: '아이폰 15 프로',
      price: 900000,
      imageUrl: 'https://media.bunjang.co.kr/product/286794211_{cnt}_1788929213_w{res}.jpg',
      saleStatus: 'SELLING',
      geoLabel: '중구 을지로동',
      trade: { freeShipping: true },
    });

    expect(result).toMatchObject({
      provider: 'bunjang',
      externalId: '286794211',
      name: '아이폰 15 프로',
      price: 900000,
      url: 'https://m.bunjang.co.kr/products/286794211',
      imageUrl: 'https://media.bunjang.co.kr/product/286794211_0_1788929213_w300.jpg',
      soldOut: false,
      badges: ['판매중', '무료배송', '중구 을지로동'],
    });
  });

  it('판매완료·예약중은 품절로 본다', () => {
    expect(detail({ pid: 1, saleStatus: 'SOLD_OUT' })).toMatchObject({ soldOut: true, badges: ['판매완료'] });
    expect(detail({ pid: 1, saleStatus: 'RESERVED' })).toMatchObject({ soldOut: true, badges: ['예약중'] });
  });

  it('상품이 없으면 PARSE_ERROR', () => {
    expect(() => parseBunjangProduct({})).toThrowError(/형식이 바뀌었습니다/);
  });
});
