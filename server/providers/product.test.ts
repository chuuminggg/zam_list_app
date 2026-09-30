import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ProductResult } from '../../shared/api.js';
import { ApiException } from '../errors.js';
import { DEAL_ADAPTERS } from './deals.js';
import { PRODUCT_ADAPTERS } from './product.js';
import { SEARCH_ADAPTERS } from './search.js';

function product(externalId: string, price: number): ProductResult {
  return {
    provider: 'kurly',
    externalId,
    name: '[서울우유] 나 100% 우유 1L',
    price,
    url: `https://www.kurly.com/goods/${externalId}`,
    badges: [],
  };
}

afterEach(() => vi.restoreAllMocks());

describe('PRODUCT_ADAPTERS - 이름 재검색 방식', () => {
  it('상품명으로 다시 검색해 같은 상품번호의 결과를 돌려준다', async () => {
    const search = vi
      .spyOn(SEARCH_ADAPTERS, 'kurly')
      .mockResolvedValue([product('5044571', 3000), product('5044572', 9000)]);

    const result = await PRODUCT_ADAPTERS.kurly('5044571', '[서울우유] 나 100% 우유 1L');

    expect(result.price).toBe(3000);
    expect(search).toHaveBeenCalledWith('[서울우유] 나 100% 우유 1L', 20);
  });

  it('검색어는 100자로 잘라서 보낸다', async () => {
    const search = vi.spyOn(SEARCH_ADAPTERS, 'daiso').mockResolvedValue([]);

    await expect(PRODUCT_ADAPTERS.daiso('1', 'a'.repeat(150))).rejects.toThrow(ApiException);

    expect(search).toHaveBeenCalledWith('a'.repeat(100), 20);
  });

  it('검색 결과에 없으면 NOT_FOUND', async () => {
    vi.spyOn(SEARCH_ADAPTERS, 'kurly').mockResolvedValue([product('5044572', 9000)]);

    await expect(PRODUCT_ADAPTERS.kurly('5044571', '우유')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });

  it('상품명이 없으면 BAD_REQUEST', async () => {
    const search = vi.spyOn(SEARCH_ADAPTERS, 'kurly');

    await expect(PRODUCT_ADAPTERS.kurly('5044571')).rejects.toMatchObject({ code: 'BAD_REQUEST' });

    expect(search).not.toHaveBeenCalled();
  });
});

describe('PRODUCT_ADAPTERS.coupang', () => {
  it('옵션을 뗀 상품명으로 다시 검색한다', async () => {
    const search = vi.spyOn(SEARCH_ADAPTERS, 'coupang').mockResolvedValue([]);

    await expect(PRODUCT_ADAPTERS.coupang('1-2', '클래파 무선청소기, 그레이, BVC-H10')).rejects.toMatchObject({
      code: 'NOT_FOUND',
    });

    expect(search).toHaveBeenCalledWith('클래파 무선청소기', 20);
  });
});

describe('PRODUCT_ADAPTERS.ohou - 오늘의딜 목록에서 찾기', () => {
  const deal = (externalId: string, price: number): ProductResult => ({
    provider: 'ohou',
    externalId,
    name: '침대 모음',
    price,
    url: `https://ohou.se/productions/${externalId}/selling`,
    badges: [],
  });

  it('지금 목록에 있으면 그 결과를 돌려준다', async () => {
    vi.spyOn(DEAL_ADAPTERS, 'ohou').mockResolvedValue([deal('1', 1000), deal('2', 2000)]);

    await expect(PRODUCT_ADAPTERS.ohou('2')).resolves.toMatchObject({ price: 2000 });
  });

  it('목록에서 내려갔으면 NOT_FOUND', async () => {
    vi.spyOn(DEAL_ADAPTERS, 'ohou').mockResolvedValue([deal('1', 1000)]);

    await expect(PRODUCT_ADAPTERS.ohou('2')).rejects.toMatchObject({ code: 'NOT_FOUND' });
  });
});
