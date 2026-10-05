// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useWishStore } from '../stores/wishStore';
import WishlistPage from './WishlistPage';

afterEach(() => {
  // globals: false 라 자동 cleanup이 걸리지 않는다.
  cleanup();
  vi.restoreAllMocks();
  useWishStore.setState({ items: [], filter: 'all', shopFilter: 'all', sort: 'newest' });
  localStorage.clear();
});

describe('WishlistPage', () => {
  it('상품 검색 모달에 검색 지원 쇼핑몰 탭이 모두 보인다', async () => {
    render(<WishlistPage />);
    await userEvent.click(screen.getByRole('button', { name: /상품 검색/ }));

    const dialog = screen.getByRole('dialog', { name: '상품 검색해서 담기' });
    const tabs = within(dialog).getByRole('group', { name: '쇼핑몰 선택' });
    expect(within(tabs).getAllByRole('button').map((b) => b.textContent)).toEqual([
      '다이소',
      '올리브영',
      '마켓컬리',
      '번개장터',
      '쿠팡',
      '오늘의집',
    ]);
    expect(within(dialog).getByLabelText('상품 검색어')).toBeTruthy();
  });

  it('오늘의집 탭은 검색 없이 오늘의딜 목록을 불러와 담을 수 있다', async () => {
    const deal = (externalId: string, name: string) => ({
      provider: 'ohou',
      externalId,
      name,
      price: 41800,
      url: `https://ohou.se/productions/${externalId}/selling`,
      badges: ['47% 할인'],
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input) => {
      const url = new URL(String(input), 'http://localhost');
      if (url.pathname === '/api/deals') {
        return Response.json({ ok: true, data: [deal('1', '베베앙 물티슈'), deal('2', '원목 침대')] });
      }
      return Response.json({ ok: true, data: { providers: [] } });
    });

    render(<WishlistPage />);
    await userEvent.click(screen.getByRole('button', { name: /상품 검색/ }));
    const dialog = screen.getByRole('dialog', { name: '상품 검색해서 담기' });
    await userEvent.click(within(dialog).getByRole('button', { name: '오늘의집' }));

    expect(await within(dialog).findByText('원목 침대')).toBeTruthy();
    expect(within(dialog).queryByLabelText('상품 검색어')).toBeNull();
    const requested = fetchMock.mock.calls.map(([input]) => new URL(String(input), 'http://localhost'));
    expect(requested.find((u) => u.pathname === '/api/deals')?.searchParams.get('provider')).toBe('ohou');

    // 받은 목록 안에서만 거른다
    await userEvent.type(within(dialog).getByLabelText('특가 목록에서 찾기'), '침대');
    expect(within(dialog).queryByText('베베앙 물티슈')).toBeNull();

    await userEvent.click(within(dialog).getByRole('button', { name: /원목 침대/ }));
    expect(useWishStore.getState().items[0]).toMatchObject({
      name: '원목 침대',
      category: '오늘의집',
      source: { provider: 'ohou', externalId: '2' },
    });
  });

  it('쿠팡 탭과 쿠팡에서 담은 카드에는 제휴 고지 문구가 보인다', async () => {
    useWishStore.setState({
      items: [
        {
          id: 'c1',
          name: '무선청소기',
          status: 'want',
          category: '쿠팡',
          createdAt: new Date().toISOString(),
          url: 'https://link.coupang.com/re/AFFSDP?pageKey=1',
          source: { provider: 'coupang', externalId: '1-2' },
        },
      ],
    });
    render(<WishlistPage />);
    expect(screen.getByText(/쿠팡 파트너스 활동을 통해/)).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: /상품 검색/ }));
    const dialog = screen.getByRole('dialog', { name: '상품 검색해서 담기' });
    expect(within(dialog).queryByText(/쿠팡 파트너스 활동을 통해/)).toBeNull();
    await userEvent.click(within(dialog).getByRole('button', { name: '쿠팡' }));
    expect(within(dialog).getByText(/쿠팡 파트너스 활동을 통해/)).toBeTruthy();
  });

  it('서버에서 비활성화된 쇼핑몰은 사유와 함께 선택할 수 없게 표시한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        ok: true,
        data: {
          providers: [
            { id: 'daiso', label: '다이소', enabled: true },
            { id: 'oliveyoung', label: '올리브영', enabled: false, reason: 'PROVIDERS_ENABLED에 포함되지 않음' },
          ],
        },
      })
    );

    render(<WishlistPage />);
    await userEvent.click(screen.getByRole('button', { name: /상품 검색/ }));

    const dialog = screen.getByRole('dialog', { name: '상품 검색해서 담기' });
    const oliveyoung = await within(dialog).findByRole('button', { name: /올리브영/ });
    expect(oliveyoung.hasAttribute('disabled')).toBe(true);
    expect(within(dialog).getByText(/PROVIDERS_ENABLED/)).toBeTruthy();
    // 사용 가능한 곳은 그대로 선택할 수 있다
    expect(within(dialog).getByRole('button', { name: '마켓컬리' }).hasAttribute('disabled')).toBe(false);
  });

  it('재고 확인 모달에는 매장 재고를 지원하는 쇼핑몰만 나온다', async () => {
    useWishStore.setState({
      items: [
        {
          id: 'w1',
          name: '수납함',
          status: 'want',
          category: '다이소',
          createdAt: new Date().toISOString(),
          source: { provider: 'daiso', externalId: '1047618' },
        },
      ],
    });
    render(<WishlistPage />);
    await userEvent.click(screen.getByRole('button', { name: '매장 재고 확인' }));

    const dialog = screen.getByRole('dialog', { name: '매장 재고 확인' });
    const tabs = within(dialog).getByRole('group', { name: '쇼핑몰 선택' });
    expect(within(tabs).getAllByRole('button').map((b) => b.textContent)).toEqual(['다이소', '올리브영']);
    // 검색으로 담은 항목은 상품 연결 단계를 건너뛰고 매장 입력이 바로 보인다
    expect(within(dialog).getByLabelText('매장 검색어')).toBeTruthy();
  });

  it('매장 재고 확인은 다이소·올리브영에서 담은 항목에만 보인다', () => {
    const base = { status: 'want' as const, createdAt: new Date().toISOString() };
    useWishStore.setState({
      items: [
        { ...base, id: 'a', name: '수납함', category: '다이소', source: { provider: 'daiso', externalId: '1' } },
        { ...base, id: 'b', name: '선크림', category: '올리브영', source: { provider: 'oliveyoung', externalId: '2' } },
        { ...base, id: 'c', name: '우유', category: '마켓컬리', source: { provider: 'kurly', externalId: '3' } },
        { ...base, id: 'd', name: '앨범', category: '번개장터', source: { provider: 'bunjang', externalId: '4' } },
        { ...base, id: 'e', name: '직접 적은 항목', category: '기타' },
      ],
    });
    render(<WishlistPage />);

    const cardOf = (name: string) => screen.getByRole('button', { name }).closest('li')!;
    for (const name of ['수납함', '선크림']) {
      expect(within(cardOf(name)).queryByRole('button', { name: '매장 재고 확인' })).toBeTruthy();
    }
    for (const name of ['우유', '앨범', '직접 적은 항목']) {
      expect(within(cardOf(name)).queryByRole('button', { name: '매장 재고 확인' })).toBeNull();
    }
  });

  it('쇼핑몰 필터로 해당 쇼핑몰 항목만 보고, 상태 필터와 함께 걸린다', async () => {
    const base = { category: '', createdAt: new Date().toISOString() };
    useWishStore.setState({
      items: [
        { ...base, id: 'a', name: '수납함', status: 'want', source: { provider: 'daiso', externalId: '1' } },
        { ...base, id: 'b', name: '바구니', status: 'bought', source: { provider: 'daiso', externalId: '2' } },
        { ...base, id: 'c', name: '선크림', status: 'want', source: { provider: 'oliveyoung', externalId: '3' } },
        {
          ...base,
          id: 'd',
          name: '직접 적은 립밤',
          status: 'want',
          stockLink: { provider: 'oliveyoung', productId: '4', productName: '립밤' },
        },
        { ...base, id: 'e', name: '직접 적은 항목', status: 'want' },
      ],
    });
    render(<WishlistPage />);
    const shops = screen.getByRole('group', { name: '쇼핑몰 필터' });
    const visible = () => screen.queryAllByRole('listitem').length;

    expect(within(shops).getAllByRole('button').map((b) => b.textContent)).toEqual([
      '모든 쇼핑몰',
      '다이소',
      '올리브영',
      '마켓컬리',
      '번개장터',
      '쿠팡',
      '오늘의집',
    ]);
    expect(visible()).toBe(5);

    await userEvent.click(within(shops).getByRole('button', { name: '올리브영' }));
    expect(visible()).toBe(2);
    expect(screen.getByRole('button', { name: '선크림' })).toBeTruthy();
    expect(screen.getByRole('button', { name: '직접 적은 립밤' })).toBeTruthy();

    await userEvent.click(within(shops).getByRole('button', { name: '다이소' }));
    const statuses = screen.getByRole('group', { name: '상태 필터' });
    await userEvent.click(within(statuses).getByRole('button', { name: '구매함' }));
    expect(visible()).toBe(1);
    expect(screen.getByRole('button', { name: '바구니' })).toBeTruthy();

    await userEvent.click(within(shops).getByRole('button', { name: '쿠팡' }));
    expect(screen.getByText('쿠팡 항목이 없어요')).toBeTruthy();
  });

  it('검색으로 담은 항목은 카드에 쇼핑몰 배지를 보여준다', () => {
    useWishStore.setState({
      items: [
        {
          id: 'w2',
          name: '우유',
          status: 'want',
          category: '마켓컬리',
          createdAt: new Date().toISOString(),
          url: 'https://www.kurly.com/goods/1',
          source: { provider: 'kurly', externalId: '1' },
        },
      ],
    });
    render(<WishlistPage />);
    const card = screen.getByRole('listitem');
    expect(within(card).getByText('마켓컬리')).toBeTruthy();
    expect(screen.getByRole('link', { name: '마켓컬리에서 보기' })).toBeTruthy();
  });

  it('새로고침 버튼은 가격을 다시 확인해 변동과 품절을 보여준다', async () => {
    useWishStore.setState({
      items: [
        {
          id: 'w3',
          name: '우유',
          status: 'want',
          category: '마켓컬리',
          createdAt: '2026-09-01T00:00:00.000Z',
          price: 5000,
          source: { provider: 'kurly', externalId: '1' },
        },
      ],
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        ok: true,
        data: {
          provider: 'kurly',
          externalId: '1',
          name: '우유',
          price: 4000,
          url: 'https://www.kurly.com/goods/1',
          soldOut: true,
          badges: ['품절'],
        },
      })
    );

    render(<WishlistPage />);
    await userEvent.click(screen.getByRole('button', { name: '가격·품절 다시 확인' }));

    expect(await screen.findByText('▼ 1,000원')).toBeTruthy();
    expect(screen.getByText('₩4,000')).toBeTruthy();
    expect(screen.getByText('품절')).toBeTruthy();
    const requested = new URL(String(fetchMock.mock.calls[0][0]), 'http://localhost');
    expect(requested.pathname).toBe('/api/product');
    expect(Object.fromEntries(requested.searchParams)).toEqual({ provider: 'kurly', id: '1', name: '우유' });
    // 방금 확인했으므로 전체 새로고침은 잠시 막힌다
    expect(screen.getByRole('button', { name: /전체 새로고침/ }).hasAttribute('disabled')).toBe(true);
  });

  it('재조회에 실패하면 카드에 사유를 보여준다', async () => {
    useWishStore.setState({
      items: [
        {
          id: 'w4',
          name: '앨범',
          status: 'want',
          category: '번개장터',
          createdAt: '2026-09-01T00:00:00.000Z',
          source: { provider: 'bunjang', externalId: '9' },
        },
      ],
    });
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json(
        { ok: false, error: { code: 'NOT_FOUND', message: '판매처에서 상품을 찾지 못했습니다.' } },
        { status: 404 }
      )
    );

    render(<WishlistPage />);
    await userEvent.click(screen.getByRole('button', { name: '가격·품절 다시 확인' }));

    expect(await screen.findByText('판매처에서 상품을 찾지 못했습니다.')).toBeTruthy();
  });
});
