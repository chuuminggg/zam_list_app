import { createHmac } from 'node:crypto';
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  coupangAuthorization,
  coupangExternalId,
  coupangRefetchQuery,
  parseOpenApiProducts,
  parseProxyProducts,
  searchCoupangProducts,
  signedDate,
} from './coupang.js';

const link = (productId: string, vendorItemId: string) =>
  `https://link.coupang.com/re/AFFSDP?lptag=AF0680724&pageKey=${productId}&itemId=1&vendorItemId=${vendorItemId}&slot=1`;

afterEach(() => vi.restoreAllMocks());

describe('coupangExternalId', () => {
  it('링크의 vendorItemId를 붙여 같은 상품번호 아래 다른 상품을 구분한다', () => {
    expect(coupangExternalId('8234329353', link('8234329353', '94498313419'))).toBe('8234329353-94498313419');
    expect(coupangExternalId('8234329353', 'https://www.coupang.com/vp/products/8234329353')).toBe('8234329353');
  });
});

describe('coupangRefetchQuery', () => {
  it('쉼표 뒤 옵션을 떼고 기호를 공백으로 바꾼다', () => {
    expect(coupangRefetchQuery('홈리아 BLDC 무선 청소기 + UV C 살균 침구 브러시 + 자동 충전거치대 세트, 화이트, 220BL-PRO')).toBe(
      '홈리아 BLDC 무선 청소기 UV C 살균 침구 브러시 자동 충전거치대 세트',
    );
    expect(coupangRefetchQuery('[최신형] 차이슨 무선 청소기')).toBe('최신형 차이슨 무선 청소기');
  });
});

describe('parseProxyProducts', () => {
  it('k-skill-proxy 응답을 ProductResult로 변환하고, 운영자 제휴 링크는 비운다', () => {
    const [rocket, normal, ...rest] = parseProxyProducts({
      items: [
        {
          product_id: '8234329353',
          title: '홈리아 BLDC 무선 진공청소기',
          price: 129720,
          url: link('8234329353', '95725585888'),
          image_url: 'https://ads-partners.coupang.com/image1/a.jpg',
          is_rocket: true,
          is_free_shipping: false,
        },
        { product_id: 4548468621, title: '핸디 청소기', price: 39800, url: link('4548468621', '1'), is_free_shipping: true },
        // 같은 상품은 한 번만
        { product_id: 4548468621, title: '핸디 청소기', price: 39800, url: link('4548468621', '1') },
        { title: 'product_id 없음', url: link('0', '0') },
      ],
    });

    expect(rocket).toEqual({
      provider: 'coupang',
      externalId: '8234329353-95725585888',
      name: '홈리아 BLDC 무선 진공청소기',
      price: 129720,
      url: '',
      imageUrl: 'https://ads-partners.coupang.com/image1/a.jpg',
      badges: ['로켓배송'],
    });
    expect(normal.externalId).toBe('4548468621-1');
    expect(normal.badges).toEqual(['무료배송']);
    expect(rest).toEqual([]);
  });

  it('목록이 없으면 빈 배열', () => {
    expect(parseProxyProducts({})).toEqual([]);
  });
});

describe('parseOpenApiProducts', () => {
  it('파트너스 Open API 응답을 변환한다', () => {
    const [product] = parseOpenApiProducts({
      rCode: '0',
      data: {
        productData: [
          {
            productId: 123,
            productName: '무선청소기',
            productPrice: 50000,
            productImage: 'https://img/a.jpg',
            productUrl: link('123', '456'),
            isRocket: true,
            isFreeShipping: true,
          },
        ],
      },
    });
    expect(product).toMatchObject({ externalId: '123-456', price: 50000, badges: ['로켓배송', '무료배송'] });
  });

  it('rCode가 0이 아니면 UPSTREAM_ERROR', () => {
    expect(() => parseOpenApiProducts({ rCode: '400', rMessage: 'Invalid' })).toThrow(/Invalid/);
  });
});

describe('HMAC 서명', () => {
  const now = new Date('2026-09-30T01:02:03.456Z');

  it('서명 시각은 yyMMddTHHmmssZ', () => {
    expect(signedDate(now)).toBe('260930T010203Z');
  });

  it('시각 + 메서드 + 경로 + 쿼리를 비밀키로 서명한다', () => {
    const path = '/v2/providers/affiliate_open_api/apis/openapi/products/search';
    const query = 'keyword=a&limit=10';
    const expected = createHmac('sha256', 'secret').update(`260930T010203ZGET${path}${query}`).digest('hex');

    expect(coupangAuthorization('GET', path, query, 'access', 'secret', now)).toBe(
      `CEA algorithm=HmacSHA256, access-key=access, signed-date=260930T010203Z, signature=${expected}`,
    );
  });
});

describe('searchCoupangProducts', () => {
  const okJson = (body: unknown) => new Response(JSON.stringify(body), { status: 200 });

  it('키가 없으면 k-skill-proxy를 호출하고 limit은 10까지만 보낸다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson({ items: [] }));

    await searchCoupangProducts('무선청소기', 20, {});

    const url = new URL(String(fetchMock.mock.calls[0][0]));
    expect(url.origin + url.pathname).toBe('https://k-skill-proxy.nomadamas.org/v1/coupang/products/search');
    expect(url.searchParams.get('keyword')).toBe('무선청소기');
    expect(url.searchParams.get('limit')).toBe('10');
  });

  it('키가 있으면 파트너스 API를 서명해 직접 호출한다', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(okJson({ rCode: '0', data: { productData: [] } }));

    await searchCoupangProducts('무선청소기', 5, { COUPANG_ACCESS_KEY: 'a', COUPANG_SECRET_KEY: 's' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/^https:\/\/api-gateway\.coupang\.com\/v2\/providers\/affiliate_open_api\//);
    expect((init?.headers as Record<string, string>).Authorization).toMatch(/^CEA algorithm=HmacSHA256, access-key=a, /);
  });
});
