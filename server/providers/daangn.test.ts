import { readFileSync } from 'node:fs';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  daangnNodeId,
  distanceKm,
  fetchDaangnProduct,
  parseDaangnDetail,
  parseDaangnPrice,
  parseDaangnSearch,
  pickRegion,
  searchDaangnProducts,
} from './daangn.js';

// 실제 응답(2026-10-06, 합정동 '아이패드')에서 매물 5개만 남기고 판매자 정보는 뺀 샘플
const fixture = (name: string) =>
  JSON.parse(readFileSync(new URL(`./__fixtures__/${name}`, import.meta.url), 'utf8'));
const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

afterEach(() => vi.restoreAllMocks());

describe('pickRegion', () => {
  const locations = [
    { id: 4802, name: '합정동', name1: '경기도', name2: '평택시', name3: '합정동', depth: 3 },
    { id: 231, name: '합정동', name1: '서울특별시', name2: '마포구', name3: '합정동', depth: 3 },
    { id: 1, name: '합정역 근처', name1: '서울특별시', depth: 3 },
  ];

  it('이름이 정확히 같은 후보 중 서울 동을 고른다', () => {
    expect(pickRegion('합정동', locations)?.id).toBe(231);
  });

  it('정확히 맞는 이름이 없으면 전체 후보에서 고른다', () => {
    expect(pickRegion('합정', locations)?.id).toBe(231);
    expect(pickRegion('합정', [])).toBeUndefined();
  });
});

describe('파싱 도우미', () => {
  it('링크 끝의 짧은 id를 뽑는다', () => {
    expect(daangnNodeId('/kr/buy-sell/apple-ipad-%EC%97%90-z2625h83h3nf/')).toBe('z2625h83h3nf');
    expect(daangnNodeId('https://www.daangn.com/kr/buy-sell/z2625h83h3nf/?a=1')).toBe('z2625h83h3nf');
    expect(daangnNodeId(undefined)).toBeUndefined();
  });

  it('가격 문자열을 숫자로 바꾼다 (단위는 그대로)', () => {
    expect(parseDaangnPrice('25.0')).toBe(25);
    expect(parseDaangnPrice('200000')).toBe(200000);
    expect(parseDaangnPrice('')).toBeUndefined();
  });

  it('두 좌표 사이 거리를 km로 계산한다', () => {
    // 합정동 중심 → 망원제1동 매물 (약 1km)
    const km = distanceKm({ lat: 37.5477, lng: 126.9094 }, { lat: 37.5565, lng: 126.9095 });
    expect(km).toBeGreaterThan(0.9);
    expect(km).toBeLessThan(1.1);
  });
});

describe('parseDaangnSearch', () => {
  const results = parseDaangnSearch(fixture('daangn-search.json'), 10);

  it('매물을 ProductResult로 변환한다', () => {
    expect(results).toHaveLength(5);
    expect(results[2]).toMatchObject({
      provider: 'daangn',
      externalId: expect.stringMatching(/^[a-z0-9]+$/),
      name: '풀박 아이패드 9세대 64gb 스그 충전기포함 효율 87',
      price: 250000,
      soldOut: false,
      // 2월에 올린 글을 10월에 끌어올린 매물
      badges: ['판매중', '망원제1동', '1.0km', '끌올'],
    });
    expect(results[2].url).toMatch(/^https:\/\/www\.daangn\.com\/kr\/buy-sell\/.+\/$/);
    expect(results[2].imageUrl).toMatch(/^https:\/\//);
  });

  it('다른 지역 매물은 거리로 구분되고, 좌표가 없으면 거리 배지를 뺀다', () => {
    expect(results[0].badges).toEqual(['판매중', '아라일동', '457km']);
    expect(results[4].badges).toEqual(['판매중', '성산동']);
  });

  it('limit만큼만 돌려준다', () => {
    expect(parseDaangnSearch(fixture('daangn-search.json'), 2)).toHaveLength(2);
  });

  it('거래완료·예약중·나눔·끌올 배지', () => {
    const [closed, reserved] = parseDaangnSearch(
      {
        buySellArticles: [
          { href: '/kr/buy-sell/a-aaa1/', title: '나눔', price: '0', status: 'Closed' },
          {
            href: '/kr/buy-sell/b-bbb2/',
            title: '의자',
            price: '5000',
            status: 'Reserved',
            createdAt: '2026-10-01T10:00:00.000Z',
            boostedAt: '2026-10-05T10:00:00.000Z',
          },
        ],
      },
      10,
    );
    expect(closed).toMatchObject({ soldOut: true, badges: ['거래완료', '나눔'] });
    expect(reserved).toMatchObject({ soldOut: false, badges: ['예약중', '끌올'] });
  });
});

describe('parseDaangnDetail', () => {
  it('상세 응답을 ProductResult로 변환한다', () => {
    expect(parseDaangnDetail(fixture('daangn-detail.json'))).toMatchObject({
      provider: 'daangn',
      externalId: 'z2625h83h3nf',
      name: 'Apple iPad 에어3세대 64GB 실버 + 애플펜슬 1세대',
      price: 25,
      soldOut: false,
      badges: ['판매중', '아라일동'],
    });
  });

  it('형식이 바뀌면 PARSE_ERROR', () => {
    expect(() => parseDaangnDetail({})).toThrow(expect.objectContaining({ code: 'PARSE_ERROR' }));
  });
});

describe('searchDaangnProducts', () => {
  it('동네 이름이 없으면 BAD_REQUEST', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch');

    await expect(searchDaangnProducts('아이패드', 10)).rejects.toMatchObject({ code: 'BAD_REQUEST' });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('동네를 id로 바꾼 뒤 새 검색 라우트의 _data를 부른다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input));
      if (url.pathname === '/kr/api/v1/regions/keyword') {
        return okJson({ locations: [{ id: 231, name: '합정동', name1: '서울특별시', name3: '합정동', depth: 3 }] });
      }
      return okJson(fixture('daangn-search.json'));
    });

    const results = await searchDaangnProducts('아이패드', 3, '합정동');

    expect(results).toHaveLength(3);
    const search = new URL(String(fetchMock.mock.calls[1][0]));
    expect(search.pathname).toBe('/kr/search/buy-sell/');
    expect(Object.fromEntries(search.searchParams)).toEqual({
      in: '합정동-231',
      q: '아이패드',
      _data: 'routes/kr.search.buy-sell._index',
    });
    const headers = fetchMock.mock.calls[1][1]?.headers as Record<string, string>;
    expect(headers['User-Agent']).toMatch(/^zam-list-app\//);
  });

  it('없는 동네면 NOT_FOUND', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson({ locations: [] }));

    await expect(searchDaangnProducts('아이패드', 3, '없는동')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});

describe('fetchDaangnProduct', () => {
  it('짧은 id로 상세 _data를 부른다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson(fixture('daangn-detail.json')));

    await expect(fetchDaangnProduct('z2625h83h3nf')).resolves.toMatchObject({ price: 25 });

    expect(String(fetchMock.mock.calls[0][0])).toBe(
      'https://www.daangn.com/kr/buy-sell/z2625h83h3nf/?_data=routes%2Fkr.buy-sell.%24buy_sell_id',
    );
  });
});
