import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkOliveyoungStock,
  parseOliveyoungProducts,
  parseOliveyoungStockStores,
  resolveImageUrl,
  searchOliveyoungProducts,
} from './oliveyoung.js';

// daiso-mcp가 사용하는 필드명 기준으로 구성한 샘플.

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

describe('올리브영 호출', () => {
  afterEach(() => vi.restoreAllMocks());

  const ok = (data: unknown) => Response.json({ status: 'SUCCESS', data });
  const mockFetch = (...responses: Response[]) => {
    const fn = vi.spyOn(globalThis, 'fetch');
    for (const r of responses) fn.mockResolvedValueOnce(r);
    return fn;
  };

  it('키 없이 공식 API를 브라우저 헤더와 함께 직접 호출한다', async () => {
    const fetch = mockFetch(ok({ serachList: [{ goodsNumber: 'A1', goodsName: '선크림', o2oStockFlag: true }] }));
    const result = await searchOliveyoungProducts('선크림', 5);

    expect(result.map((p) => p.externalId)).toEqual(['A1']);
    const [url, init] = fetch.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('https://www.oliveyoung.co.kr/oystore/api/stock/product-search-v3');
    expect(init.redirect).toBe('manual');
    expect(init.headers).toMatchObject({
      'User-Agent': expect.stringContaining('Mozilla/5.0'),
      Origin: 'https://www.oliveyoung.co.kr',
      Referer: 'https://www.oliveyoung.co.kr/',
      'Accept-Language': 'ko-KR,ko;q=0.9',
      'X-Requested-With': 'XMLHttpRequest',
    });
  });

  it('리다이렉트 응답은 따라가지 않고 오류로 처리한다', async () => {
    mockFetch(new Response(null, { status: 302 }));
    await expect(searchOliveyoungProducts('선크림', 5)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
  });

  it('상세 조회가 되면 매장별 재고를 돌려준다', async () => {
    const fetch = mockFetch(
      ok({ goodsInfo: { masterGoodsNumber: 'M1' } }),
      ok({ storeList: [{ storeCode: 'D1', storeName: '강남점', salesStoreYn: true, remainQuantity: 3 }] }),
    );
    const result = await checkOliveyoungStock('A1', '강남', 10);

    expect(result.summary).toBeUndefined();
    expect(result.stores.map((s) => s.label)).toEqual(['재고 3개']);
    expect(JSON.parse(String((fetch.mock.calls[1][1] as RequestInit).body))).toMatchObject({ productId: 'M1' });
  });

  it('상세 조회가 막히면 상품 검색의 재고 여부로 대신 표시한다', async () => {
    const fetch = mockFetch(
      new Response('blocked', { status: 403 }),
      ok({ serachList: [{ goodsNumber: 'A0' }, { goodsNumber: 'A1', o2oStockFlag: false, o2oRemainQuantity: 2 }] }),
    );
    const result = await checkOliveyoungStock('A1', '강남', 10);

    expect(result.stores).toEqual([]);
    expect(result.summary).toEqual({ status: 'in_stock', label: '매장 재고 있음' });
    expect(result.notice).toContain('매장별 재고');
    expect(JSON.parse(String((fetch.mock.calls[1][1] as RequestInit).body))).toMatchObject({ keyword: 'A1' });
  });

  it('대체 조회도 실패하거나 상품이 없으면 확인 불가로 표시한다', async () => {
    mockFetch(new Response('blocked', { status: 403 }), new Response('blocked', { status: 403 }));
    const result = await checkOliveyoungStock('A1', '강남', 10);
    expect(result.summary).toEqual({ status: 'unknown', label: '재고 확인 불가' });
  });

  it('상품 정보가 없으면 대체하지 않고 NOT_FOUND', async () => {
    mockFetch(ok({ goodsInfo: {} }));
    await expect(checkOliveyoungStock('A1', '강남', 10)).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
