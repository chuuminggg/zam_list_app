import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  fetchOliveyoungTodayDeals,
  kstDate,
  parseMcpResponse,
  parseTodayDeals,
} from './oliveyoungTodayDeals.js';

// 실제 daiso-mcp get_catalog(oliveyoung, today_deals) SSE 응답(2026-11-02)에서 목록별 2개만 남긴 샘플
const sse = readFileSync(new URL('./__fixtures__/oliveyoung-today-deals.sse', import.meta.url), 'utf8');

afterEach(() => vi.restoreAllMocks());

describe('parseTodayDeals', () => {
  const deals = parseTodayDeals(parseMcpResponse(sse));

  it('SSE의 structuredContent에서 날짜와 브랜드 특가·오늘의 특가를 읽는다', () => {
    expect(deals.date).toBe('2026-11-02');
    expect(deals.brandDeals).toHaveLength(2);
    expect(deals.todayDeals).toHaveLength(2);
    for (const deal of [...deals.brandDeals, ...deals.todayDeals]) {
      expect(deal.goodsNo).toMatch(/^A\d+$/);
      expect(deal.name).not.toBe('');
      expect(deal.price).toBeGreaterThan(0);
      expect(deal.productUrl).toBe(
        `https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=${deal.goodsNo}`,
      );
      expect(deal.imageUrl).toMatch(/^https:\/\/image\.oliveyoung\.co\.kr\//);
    }
  });

  it('최저가 표시·정가·할인율·배지를 그대로 옮긴다', () => {
    expect(deals.brandDeals[0]).toMatchObject({
      rank: 1,
      brand: '아렌시아',
      price: 14900,
      priceFrom: true,
      originalPrice: 23000,
      discountRate: 35,
      flags: ['세일', '쿠폰'],
      soldOut: false,
    });
  });

  it('필수 값이 없는 상품은 빼고 https가 아닌 링크는 버린다', () => {
    const result = parseTodayDeals({
      result: {
        structuredContent: {
          date: '2026-11-02',
          brandDeals: [{ goodsNo: 'A1', name: '이름 없음 가격' }],
          todayDeals: [
            { goodsNo: 'A2', name: '토너', price: 1000, imageUrl: 'javascript:alert(1)', productUrl: 'http://x' },
          ],
        },
      },
    });
    expect(result.brandDeals).toEqual([]);
    expect(result.todayDeals[0]).toMatchObject({
      imageUrl: undefined,
      productUrl: 'https://www.oliveyoung.co.kr/store/goods/getGoodsDetail.do?goodsNo=A2',
    });
  });

  it('도구 오류는 UPSTREAM_ERROR, 형식이 다르면 PARSE_ERROR를 던진다', () => {
    expect(() => parseTodayDeals({ result: { isError: true, content: [{ type: 'text', text: '차단' }] } })).toThrow(
      expect.objectContaining({ code: 'UPSTREAM_ERROR' }),
    );
    expect(() => parseTodayDeals({ error: { message: 'boom' } })).toThrow(
      expect.objectContaining({ code: 'UPSTREAM_ERROR' }),
    );
    expect(() => parseTodayDeals({ result: { structuredContent: { date: 'x' } } })).toThrow(
      expect.objectContaining({ code: 'PARSE_ERROR' }),
    );
    expect(() => parseMcpResponse('event: message\ndata: {broken')).toThrow(
      expect.objectContaining({ code: 'PARSE_ERROR' }),
    );
  });
});

describe('kstDate', () => {
  it('한국 시간 자정을 기준으로 날짜를 바꾼다', () => {
    expect(kstDate(new Date('2026-11-01T14:59:59Z'))).toBe('2026-11-01');
    expect(kstDate(new Date('2026-11-01T15:00:00Z'))).toBe('2026-11-02');
  });
});

describe('fetchOliveyoungTodayDeals', () => {
  it('호스팅 MCP 루트에 get_catalog를 SSE 수락 헤더로 POST한다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response(sse, { status: 200 }));
    const deals = await fetchOliveyoungTodayDeals();
    expect(deals.todayDeals).toHaveLength(2);

    const [url, init] = fetchMock.mock.calls[0];
    expect(url).toBe('https://mcp.aka.page/');
    expect(init?.method).toBe('POST');
    expect((init?.headers as Record<string, string>).Accept).toContain('text/event-stream');
    expect(JSON.parse(init?.body as string).params).toEqual({
      name: 'get_catalog',
      arguments: { service: 'oliveyoung', operation: 'today_deals' },
    });
  });
});
