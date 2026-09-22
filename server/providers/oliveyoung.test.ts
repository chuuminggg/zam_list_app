import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  checkOliveyoungStock,
  parseOliveyoungProducts,
  resolveImageUrl,
  searchOliveyoungProducts,
} from './oliveyoung.js';

// mcp.aka.page /api/oliveyoung/products 실제 응답(2026-09-24)의 필드 기준 샘플.

describe('parseOliveyoungProducts', () => {
  it('호스팅 API 상품 목록을 변환한다', () => {
    const result = parseOliveyoungProducts({
      products: [
        {
          goodsNumber: 'A000000201055',
          goodsName: '롬앤 베러 댄 컨투어',
          imageUrl: 'https://image.oliveyoung.co.kr/uploads/images/goods/10/0000/0020/A00000020105567ko.jpg?l=ko',
          priceToPay: 20900,
          discountRate: 12,
          o2oStockFlag: true,
          o2oRemainQuantity: 0,
          inStock: true,
        },
        { goodsNumber: 'A000000111111', goodsName: '품절 상품', o2oStockFlag: true, inStock: false },
        { goodsNumber: 'A000000222222', goodsName: 'inStock 없는 항목', o2oRemainQuantity: 2 },
        { goodsName: '번호 없는 항목' },
      ],
    });
    expect(result).toHaveLength(3);
    expect(result[0]).toMatchObject({
      externalId: 'A000000201055',
      price: 20900,
      soldOut: false,
      badges: ['12% 할인'],
      url: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A000000201055',
      imageUrl: 'https://image.oliveyoung.co.kr/uploads/images/goods/10/0000/0020/A00000020105567ko.jpg?l=ko',
    });
    expect(result[1]).toMatchObject({ soldOut: true, badges: ['매장 재고 없음'] });
    expect(result[2]).toMatchObject({ soldOut: false });
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

  const ok = (products: unknown[]) => Response.json({ success: true, data: { products } });
  const mockFetch = (...responses: Response[]) => {
    const fn = vi.spyOn(globalThis, 'fetch');
    for (const r of responses) fn.mockResolvedValueOnce(r);
    return fn;
  };

  it('호스팅 API를 경유해 상품을 검색한다', async () => {
    const fetch = mockFetch(ok([{ goodsNumber: 'A1', goodsName: '선크림', inStock: true }]));
    const result = await searchOliveyoungProducts('선크림', 5);

    expect(result.map((p) => p.externalId)).toEqual(['A1']);
    const url = new URL(fetch.mock.calls[0][0] as string);
    expect(url.origin + url.pathname).toBe('https://mcp.aka.page/api/oliveyoung/products');
    expect(Object.fromEntries(url.searchParams)).toEqual({ keyword: '선크림', size: '5', includeSoldOut: 'true' });
  });

  it('호스팅 API가 실패를 알리면 UPSTREAM_ERROR', async () => {
    mockFetch(Response.json({ success: false, error: { code: 'X' } }));
    await expect(searchOliveyoungProducts('선크림', 5)).rejects.toMatchObject({ code: 'UPSTREAM_ERROR' });
  });

  it('호스팅 서버가 500이면 최대 3번까지 다시 시도한다', async () => {
    const fetch = mockFetch(
      new Response('error', { status: 500 }),
      new Response('error', { status: 500 }),
      ok([{ goodsNumber: 'A1', inStock: true }]),
    );
    expect(await searchOliveyoungProducts('선크림', 5)).toHaveLength(1);
    expect(fetch).toHaveBeenCalledTimes(3);
  });

  it('재고는 상품명으로 다시 검색해 같은 상품번호의 전체 매장 기준 재고를 보여준다', async () => {
    const fetch = mockFetch(
      ok([{ goodsNumber: 'A0', inStock: true }, { goodsNumber: 'A1', inStock: false }]),
    );
    const result = await checkOliveyoungStock('A1', '강남', 10, '롬앤 틴트');

    expect(result.stores).toEqual([]);
    expect(result.summary).toEqual({ status: 'out_of_stock', label: '매장 재고 없음' });
    expect(result.notice).toContain('매장별 재고');
    expect(new URL(fetch.mock.calls[0][0] as string).searchParams.get('keyword')).toBe('롬앤 틴트');
  });

  it('상품명이 없거나 검색이 실패하면 확인 불가로 표시한다', async () => {
    const fail = () => new Response('error', { status: 500 });
    const fetch = mockFetch(fail(), fail(), fail());
    expect((await checkOliveyoungStock('A1', '강남', 10)).summary).toEqual({ status: 'unknown', label: '재고 확인 불가' });
    expect(fetch).not.toHaveBeenCalled();
    expect((await checkOliveyoungStock('A1', '강남', 10, '틴트')).summary?.status).toBe('unknown');
  });
});
