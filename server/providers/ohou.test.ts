import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { extractNextData, fetchOhouDeals, parseOhouDeals } from './ohou.js';

// 실제 오늘의딜 페이지(2026-09-30)에서 피드별로 DEAL 2개·GOODS 2개만 남긴 샘플
const html = readFileSync(new URL('./__fixtures__/ohou-today-deals.html', import.meta.url), 'utf8');

afterEach(() => vi.restoreAllMocks());

describe('parseOhouDeals', () => {
  const deals = parseOhouDeals(extractNextData(html));

  it('두 피드의 특가 상품을 모두 ProductResult로 변환한다', () => {
    expect(deals.length).toBeGreaterThan(0);
    for (const deal of deals) {
      expect(deal.provider).toBe('ohou');
      expect(deal.externalId).toMatch(/^\d+$/);
      expect(deal.name).not.toBe('');
      expect(deal.url).toBe(`https://ohou.se/productions/${deal.externalId}/selling`);
      expect(deal.price).toBeGreaterThan(0);
    }
    expect(new Set(deals.map((d) => d.externalId)).size).toBe(deals.length);
  });

  it('할인율·혜택가·무료배송·리뷰를 배지로 만든다', () => {
    const [first] = deals;
    expect(first.badges[0]).toMatch(/^\d+% 할인$/);
    expect(first.badges.some((b) => /^★[\d.]+ \([\d,]+\)$/.test(b))).toBe(true);
  });

  it('deal·goods 형태를 모두 읽고, 브랜드가 이름에 없으면 앞에 붙인다', () => {
    const result = parseOhouDeals({
      props: {
        pageProps: {
          dehydratedState: {
            queries: [
              { queryKey: ['navigation'], state: { data: {} } },
              {
                queryKey: ['today-deal-feed'],
                state: {
                  data: {
                    todayDealFeed: {
                      slots: [
                        {
                          type: 'GOODS',
                          goods: {
                            id: '1',
                            name: '물티슈 20팩',
                            brand: { name: '베베앙' },
                            price: { originalPrice: '79800', sellingPrice: '41800', discountRate: '47' },
                            badgeProperties: { isFreeDelivery: true },
                            reviewStatistic: { reviewCount: 3346, reviewAverage: 4.9 },
                          },
                          bestDiscountPrice: { price: '19800', discountPlanDescription: '쿠폰+토스 할인가' },
                        },
                        { type: 'BANNER' },
                      ],
                    },
                  },
                },
              },
              {
                queryKey: ['special-today-deal-feed'],
                state: {
                  data: {
                    todayDealFeed: {
                      slots: [
                        {
                          type: 'DEAL',
                          deal: {
                            id: '2',
                            name: '원하는날도착 침대 모음',
                            brand: { name: '원하는날도착' },
                            isSoldOut: true,
                            price: { representativeSellingPrice: '489000', discountRate: '31' },
                          },
                        },
                      ],
                    },
                  },
                },
              },
            ],
          },
        },
      },
    });

    // 스페셜딜이 먼저
    expect(result.map((r) => r.externalId)).toEqual(['2', '1']);
    expect(result[0]).toMatchObject({ name: '원하는날도착 침대 모음', price: 489000, soldOut: true, badges: ['31% 할인', '품절'] });
    expect(result[1]).toMatchObject({
      name: '[베베앙] 물티슈 20팩',
      price: 41800,
      soldOut: false,
      badges: ['47% 할인', '쿠폰+토스 할인가 19,800원', '무료배송', '★4.9 (3,346)'],
    });
  });

  it('페이지 구조가 바뀌면 PARSE_ERROR', () => {
    expect(() => extractNextData('<html></html>')).toThrow(expect.objectContaining({ code: 'PARSE_ERROR' }));
    expect(() => parseOhouDeals({})).toThrow(expect.objectContaining({ code: 'PARSE_ERROR' }));
  });
});

describe('fetchOhouDeals', () => {
  it('앱 이름과 연락처가 든 UA로 오늘의딜 페이지를 요청한다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(html, { status: 200 }));

    await fetchOhouDeals();

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://store.ohou.se/today_deals');
    expect((init?.headers as Record<string, string>)['User-Agent']).toMatch(/^zam-list-app\/1\.0 \(\+https:\/\//);
  });

  it('403이면 우회하지 않고 BLOCKED', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('Access Denied', { status: 403 }));

    await expect(fetchOhouDeals()).rejects.toMatchObject({ code: 'BLOCKED' });
  });
});
