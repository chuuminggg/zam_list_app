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
  useWishStore.setState({ items: [], filter: 'all', sort: 'newest' });
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
    ]);
    expect(within(dialog).getByLabelText('상품 검색어')).toBeTruthy();
  });

  it('서버에서 비활성화된 쇼핑몰은 사유와 함께 선택할 수 없게 표시한다', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      Response.json({
        ok: true,
        data: {
          providers: [
            { id: 'daiso', label: '다이소', enabled: true },
            { id: 'oliveyoung', label: '올리브영', enabled: false, reason: '환경변수 필요: ZYTE_API_KEY' },
          ],
        },
      })
    );

    render(<WishlistPage />);
    await userEvent.click(screen.getByRole('button', { name: /상품 검색/ }));

    const dialog = screen.getByRole('dialog', { name: '상품 검색해서 담기' });
    const oliveyoung = await within(dialog).findByRole('button', { name: /올리브영/ });
    expect(oliveyoung.hasAttribute('disabled')).toBe(true);
    expect(within(dialog).getByText(/ZYTE_API_KEY/)).toBeTruthy();
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
    expect(screen.getByText('마켓컬리')).toBeTruthy();
    expect(screen.getByRole('link', { name: '마켓컬리에서 보기' })).toBeTruthy();
  });
});
