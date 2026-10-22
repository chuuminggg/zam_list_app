// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useBudgetStore } from '../stores/budgetStore';
import { useLedgerCategoryStore } from '../stores/ledgerCategoryStore';
import { useLedgerPrefsStore } from '../stores/ledgerPrefsStore';
import { useLedgerStore } from '../stores/ledgerStore';
import { useToastStore } from '../stores/toastStore';
import { readImageText } from '../utils/ocr';
import LedgerPage from './LedgerPage';

// 사진 줄이기(canvas)와 글자 인식(wasm)은 가짜로 바꾸고, 읽은 글자에서 값을 뽑는 부분만 실제로 돌린다.
vi.mock('../utils/image', () => ({ prepareReceiptImage: async () => ({}) }));
vi.mock('../utils/ocr', () => ({ readImageText: vi.fn() }));

beforeEach(() => {
  // 달이 바뀌는 경계에 걸리지 않도록 시계를 고정한다 (Date만 가짜로 바꿔 userEvent 타이머는 그대로 둔다).
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(new Date(2026, 8, 24, 12));
});

afterEach(() => {
  // globals: false 라 자동 cleanup이 걸리지 않는다.
  cleanup();
  vi.useRealTimers();
  useLedgerStore.setState({ transactions: [], fixedItems: [] });
  useLedgerPrefsStore.setState({ lastPaymentMethod: undefined });
  useLedgerCategoryStore.setState({ categories: [] });
  useBudgetStore.setState({ budgets: [] });
  useToastStore.setState({ toast: null });
  vi.mocked(readImageText).mockReset();
  localStorage.clear();
});

const total = (label: string) => screen.getByLabelText(label).textContent;

describe('LedgerPage', () => {
  it('고정 항목과 직접 입력한 내역을 합쳐 월 요약을 보여준다', async () => {
    useLedgerStore.setState({
      fixedItems: [
        {
          id: 'rent',
          type: 'expense',
          name: '월세',
          amount: 500000,
          category: 'housing',
          day: 1,
          startMonth: '2026-01',
          endMonth: '2026-09',
          createdAt: '2026-01-01T00:00:00Z',
        },
        {
          id: 'pay',
          type: 'income',
          name: '월급',
          amount: 3000000,
          category: 'salary',
          day: 25,
          startMonth: '2026-01',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    });
    render(<LedgerPage />);
    expect(screen.getByRole('heading', { name: '2026년 9월' })).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: '+ 내역' }));
    const dialog = screen.getByRole('dialog', { name: '내역 추가' });
    await userEvent.type(within(dialog).getByLabelText('금액'), '12,000');
    await userEvent.type(within(dialog).getByLabelText('메모'), '점심');
    await userEvent.click(within(dialog).getByRole('button', { name: '추가' }));

    expect(useLedgerStore.getState().transactions).toMatchObject([
      { type: 'expense', amount: 12000, category: 'food', date: '2026-09-24', memo: '점심' },
    ]);
    expect(total('수입 합계')).toBe('3,000,000원');
    expect(total('지출 합계')).toBe('512,000원');
    expect(total('잔액')).toBe('2,488,000원');
    expect(screen.getAllByText('고정')).toHaveLength(2);

    // 다음 달에는 9월에 끝난 월세가 빠지고 월급만 남는다.
    await userEvent.click(screen.getByRole('button', { name: '다음 달' }));
    expect(screen.getByRole('heading', { name: '2026년 10월' })).toBeTruthy();
    expect(total('지출 합계')).toBe('0원');
    expect(total('잔액')).toBe('3,000,000원');
  });

  it('달력에서 날짜를 누르면 그날 내역만 보이고, 다시 누르면 전체로 돌아간다', async () => {
    useLedgerStore.setState({
      transactions: [
        { id: 'a', type: 'expense', amount: 12000, category: 'food', date: '2026-09-24', memo: '점심', createdAt: 'x' },
        { id: 'b', type: 'expense', amount: 4500, category: 'cafe', date: '2026-09-10', memo: '커피', createdAt: 'x' },
      ],
    });
    render(<LedgerPage />);
    const day = screen.getByRole('button', { name: '9월 24일, 지출 12,000원' });
    expect(within(day).getByText('-1.2만')).toBeTruthy();

    await userEvent.click(day);
    const list = screen.getByRole('region', { name: '내역' });
    expect(within(list).getByText('점심')).toBeTruthy();
    expect(within(list).queryByText('커피')).toBeNull();
    // 요약은 여전히 한 달 전체 기준
    expect(total('지출 합계')).toBe('16,500원');

    await userEvent.click(day);
    expect(within(screen.getByRole('region', { name: '내역' })).getByText('커피')).toBeTruthy();
  });

  it('지출에 결제수단을 고르면 내역·결제수단별 합계에 보이고, 다음 지출의 기본값이 된다', async () => {
    render(<LedgerPage />);
    expect(screen.queryByRole('region', { name: '결제수단별 지출' })).toBeNull();

    await userEvent.click(screen.getByRole('button', { name: '+ 내역' }));
    let dialog = screen.getByRole('dialog', { name: '내역 추가' });
    await userEvent.type(within(dialog).getByLabelText('금액'), '12000');
    await userEvent.click(within(dialog).getByRole('radio', { name: '카드' }));
    await userEvent.click(within(dialog).getByRole('button', { name: '추가' }));

    expect(useLedgerStore.getState().transactions).toMatchObject([{ amount: 12000, paymentMethod: 'card' }]);
    expect(within(screen.getByRole('region', { name: '내역' })).getByText('카드')).toBeTruthy();
    expect(within(screen.getByRole('region', { name: '결제수단별 지출' })).getByText('12,000원')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: '+ 내역' }));
    dialog = screen.getByRole('dialog', { name: '내역 추가' });
    expect(within(dialog).getByRole('radio', { name: '카드' }).getAttribute('aria-checked')).toBe('true');

    // 수입에는 결제수단을 두지 않는다.
    await userEvent.click(within(dialog).getByRole('button', { name: '수입' }));
    expect(within(dialog).queryByRole('radiogroup', { name: '결제수단' })).toBeNull();
    await userEvent.type(within(dialog).getByLabelText('금액'), '50000');
    await userEvent.click(within(dialog).getByRole('button', { name: '추가' }));
    expect(useLedgerStore.getState().transactions[1].paymentMethod).toBeUndefined();
  });

  it('고정 항목을 눌러 이번 달만 금액을 바꾸거나 건너뛰고, 이번 달부터 금액을 바꾼다', async () => {
    useLedgerStore.setState({
      fixedItems: [
        {
          id: 'rent',
          type: 'expense',
          name: '월세',
          amount: 500000,
          category: 'housing',
          day: 1,
          startMonth: '2026-01',
          createdAt: '2026-01-01T00:00:00Z',
        },
      ],
    });
    render(<LedgerPage />);
    const openRent = () => userEvent.click(within(screen.getByRole('region', { name: '내역' })).getByText('월세'));

    // 이번 달만
    await openRent();
    let sheet = screen.getByRole('dialog', { name: '월세 · 9월' });
    await userEvent.clear(within(sheet).getByLabelText('금액'));
    await userEvent.type(within(sheet).getByLabelText('금액'), '450000');
    await userEvent.click(within(sheet).getByRole('button', { name: '9월만 적용' }));
    expect(total('지출 합계')).toBe('450,000원');
    expect(screen.getByText('이번 달 변경')).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '다음 달' }));
    expect(total('지출 합계')).toBe('500,000원');

    // 10월 건너뛰기 → 다시 포함
    await openRent();
    await userEvent.click(within(screen.getByRole('dialog', { name: '월세 · 10월' })).getByRole('button', { name: '10월 건너뛰기' }));
    expect(total('지출 합계')).toBe('0원');
    expect(screen.getByText('건너뜀')).toBeTruthy();
    await openRent();
    await userEvent.click(within(screen.getByRole('dialog', { name: '월세 · 10월' })).getByRole('button', { name: '10월 다시 포함' }));
    expect(total('지출 합계')).toBe('500,000원');

    // 10월부터 계속
    await openRent();
    sheet = screen.getByRole('dialog', { name: '월세 · 10월' });
    await userEvent.clear(within(sheet).getByLabelText('금액'));
    await userEvent.type(within(sheet).getByLabelText('금액'), '550000');
    await userEvent.click(within(sheet).getByRole('button', { name: '10월부터 계속' }));
    expect(total('지출 합계')).toBe('550,000원');
    expect(useLedgerStore.getState().fixedItems).toMatchObject([
      { id: 'rent', amount: 500000, endMonth: '2026-09', overrides: { '2026-09': { amount: 450000 } } },
      { name: '월세', amount: 550000, startMonth: '2026-10' },
    ]);
    await userEvent.click(screen.getByRole('button', { name: '이전 달' }));
    expect(total('지출 합계')).toBe('450,000원');
  });

  it('카테고리를 추가·숨기고, 지울 때 내역을 다른 카테고리로 옮긴다', async () => {
    render(<LedgerPage />);
    const openCategories = async () => {
      await userEvent.click(screen.getByRole('button', { name: '가계부 설정' }));
      await userEvent.click(screen.getByRole('button', { name: /카테고리 관리/ }));
      return screen.getByRole('dialog', { name: '카테고리 관리' });
    };

    // 사용자 카테고리 추가
    await userEvent.click(within(await openCategories()).getByRole('button', { name: '+ 카테고리' }));
    let form = screen.getByRole('dialog', { name: '지출 카테고리 추가' });
    await userEvent.type(within(form).getByLabelText('카테고리 이름'), '반려동물');
    await userEvent.click(within(form).getByRole('radio', { name: '🐶' }));
    await userEvent.click(within(form).getByRole('button', { name: '추가' }));

    // 기본 카테고리 식비 숨기기
    await userEvent.click(within(screen.getByRole('dialog', { name: '카테고리 관리' })).getByText('식비'));
    form = screen.getByRole('dialog', { name: '지출 카테고리 수정' });
    await userEvent.click(within(form).getByRole('checkbox'));
    await userEvent.click(within(form).getByRole('button', { name: '저장' }));
    await userEvent.click(within(screen.getByRole('dialog', { name: '카테고리 관리' })).getByRole('button', { name: '닫기' }));

    // 입력 시트: 숨긴 식비는 없고 반려동물이 있다
    await userEvent.click(screen.getByRole('button', { name: '+ 내역' }));
    const sheet = screen.getByRole('dialog', { name: '내역 추가' });
    const chips = within(sheet).getByRole('radiogroup', { name: '카테고리' });
    expect(within(chips).queryByRole('radio', { name: /식비/ })).toBeNull();
    await userEvent.click(within(chips).getByRole('radio', { name: /반려동물/ }));
    await userEvent.type(within(sheet).getByLabelText('금액'), '30000');
    await userEvent.click(within(sheet).getByRole('button', { name: '추가' }));
    const petId = useLedgerCategoryStore.getState().categories.find((c) => c.name === '반려동물')?.id;
    expect(useLedgerStore.getState().transactions).toMatchObject([{ category: petId }]);
    expect(within(screen.getByRole('region', { name: '카테고리별 지출' })).getByText('반려동물')).toBeTruthy();

    // 지우면 내역을 고른 카테고리(기본 기타)로 옮긴다
    await userEvent.click(within(await openCategories()).getByText('반려동물'));
    await userEvent.click(within(screen.getByRole('dialog', { name: '지출 카테고리 수정' })).getByRole('button', { name: '삭제' }));
    const confirm = screen.getByRole('dialog', { name: '카테고리 삭제' });
    expect(within(confirm).getByText(/내역 1건/)).toBeTruthy();
    await userEvent.click(within(confirm).getByRole('button', { name: '옮기고 삭제' }));
    expect(useLedgerStore.getState().transactions).toMatchObject([{ category: 'etc' }]);
    expect(useLedgerCategoryStore.getState().categories.map((c) => c.name)).toEqual(['식비']);
  });

  it('예산을 정하면 남은 금액을 보여주고, 그 달만 바꾸거나 카테고리별로 나누고 이월한다', async () => {
    useLedgerStore.setState({
      transactions: [
        { id: 'a', type: 'expense', amount: 200000, category: 'food', date: '2026-09-10', createdAt: 'x' },
        { id: 'b', type: 'expense', amount: 50000, category: 'cafe', date: '2026-10-02', createdAt: 'x' },
      ],
    });
    render(<LedgerPage />);
    const remaining = () => screen.getByLabelText('남은 예산').textContent;

    await userEvent.click(screen.getByRole('button', { name: '예산 정하기' }));
    let modal = screen.getByRole('dialog', { name: '9월 예산' });
    await userEvent.type(within(modal).getByLabelText('금액'), '500000');
    await userEvent.click(within(modal).getByRole('button', { name: '9월부터 계속' }));
    expect(remaining()).toBe('300,000원');

    // 10월만 300,000원, 카테고리별(카페 30,000원), 이월 켜기
    await userEvent.click(screen.getByRole('button', { name: '다음 달' }));
    expect(remaining()).toBe('450,000원');
    await userEvent.click(screen.getByRole('button', { name: '예산 수정' }));
    modal = screen.getByRole('dialog', { name: '10월 예산' });
    await userEvent.clear(within(modal).getByLabelText('금액'));
    await userEvent.type(within(modal).getByLabelText('금액'), '300000');
    await userEvent.click(within(modal).getByText('총예산 + 카테고리별'));
    await userEvent.type(within(modal).getByLabelText('카페·간식 예산'), '30000');
    await userEvent.click(within(modal).getByRole('checkbox'));
    await userEvent.click(within(modal).getByRole('button', { name: '10월만 적용' }));

    expect(remaining()).toBe('250,000원');
    const byCategory = screen.getByRole('list', { name: '카테고리별 예산' });
    expect(within(byCategory).getByText('20,000원 초과')).toBeTruthy();

    // 11월은 다시 500,000원, 10월에 남은 250,000원이 넘어온다
    await userEvent.click(screen.getByRole('button', { name: '다음 달' }));
    expect(remaining()).toBe('750,000원');
    expect(screen.getByText('이월 +250,000원')).toBeTruthy();
  });

  it('월별 추이·전월 대비 증감을 보여주고, 내역을 검색어·조건·전체 기간으로 찾는다', async () => {
    useLedgerStore.setState({
      transactions: [
        { id: 'a', type: 'expense', amount: 5000, category: 'cafe', memo: '라떼', date: '2026-07-02', createdAt: 'x' },
        { id: 'b', type: 'expense', amount: 10000, category: 'food', memo: '점심', date: '2026-08-05', createdAt: 'x' },
        {
          id: 'c',
          type: 'expense',
          amount: 25000,
          category: 'food',
          memo: '저녁 회식',
          paymentMethod: 'card',
          date: '2026-09-03',
          createdAt: 'x',
        },
        {
          id: 'd',
          type: 'expense',
          amount: 4500,
          category: 'cafe',
          memo: '라떼',
          paymentMethod: 'cash',
          date: '2026-09-04',
          createdAt: 'x',
        },
      ],
    });
    render(<LedgerPage />);

    const trend = screen.getByRole('region', { name: '월별 추이' });
    expect(within(trend).getByText('지난달보다 19,500원(195%) 더 썼어요')).toBeTruthy();
    expect(within(trend).getByText('9월 수입 0원, 지출 29,500원')).toBeTruthy();
    const byCategory = screen.getByRole('region', { name: '카테고리별 지출' });
    expect(within(byCategory).getByTitle('지난달보다 15,000원 늘었어요').textContent).toBe('지난달보다 ▲1.5만');
    expect(within(byCategory).getByText('새로')).toBeTruthy();

    await userEvent.click(screen.getByRole('button', { name: '내역 검색' }));
    const result = () => screen.getByLabelText('검색 결과').textContent;
    await userEvent.type(screen.getByLabelText('검색어'), '라떼');
    expect(result()).toBe('1건 · 지출 4,500원');
    expect(screen.getByRole('heading', { name: '검색 결과' })).toBeTruthy();

    await userEvent.click(screen.getByRole('radio', { name: '전체 기간' }));
    expect(result()).toBe('2건 · 지출 9,500원');
    expect(within(screen.getByRole('region', { name: '내역' })).getAllByText('라떼')).toHaveLength(2);

    await userEvent.selectOptions(screen.getByLabelText('결제수단'), 'cash');
    expect(result()).toBe('1건 · 지출 4,500원');

    // 검색어를 지우고 카테고리로만: 지출 > 식비, 전체 기간
    await userEvent.clear(screen.getByLabelText('검색어'));
    await userEvent.selectOptions(screen.getByLabelText('결제수단'), '');
    await userEvent.selectOptions(screen.getByLabelText('종류'), 'expense');
    await userEvent.selectOptions(screen.getByLabelText('카테고리'), 'food');
    expect(result()).toBe('2건 · 지출 35,000원');

    await userEvent.click(screen.getByRole('button', { name: '조건 지우기' }));
    expect(screen.getByRole('heading', { name: '전체 내역' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: '검색 닫기' }));
    expect(screen.queryByLabelText('검색어')).toBeNull();
  });

  it('영수증 사진을 올리면 인식한 값으로 채운 확인 시트를 열고, 저장하면 지출이 된다', async () => {
    const photo = new File(['x'], 'receipt.jpg', { type: 'image/jpeg' });
    const toast = () => useToastStore.getState().toast?.message;
    render(<LedgerPage />);

    vi.mocked(readImageText).mockResolvedValueOnce('스타벅스 역삼점\n2026.09.20 14:02\n합계 12,800\n신용카드 승인');
    await userEvent.upload(screen.getByLabelText('영수증 사진'), photo);
    expect(toast()).toBeUndefined();

    const sheet = screen.getByRole('dialog', { name: '영수증 확인' });
    expect((within(sheet).getByLabelText('금액') as HTMLInputElement).value).toBe('12,800');
    expect((within(sheet).getByDisplayValue('스타벅스 역삼점') as HTMLInputElement).value).toBe('스타벅스 역삼점');
    await userEvent.click(within(sheet).getByRole('button', { name: '추가' }));

    expect(useLedgerStore.getState().transactions).toEqual([
      expect.objectContaining({
        type: 'expense',
        amount: 12800,
        category: 'cafe',
        date: '2026-09-20',
        memo: '스타벅스 역삼점',
        paymentMethod: 'card',
      }),
    ]);

    // 영수증이 아니면 시트를 열지 않는다
    vi.mocked(readImageText).mockResolvedValueOnce('고양이 사진');
    await userEvent.upload(screen.getByLabelText('영수증 사진'), photo);
    expect(toast()).toBe('사진에서 영수증이나 결제 내역을 찾지 못했어요.');
    expect(screen.queryByRole('dialog', { name: '영수증 확인' })).toBeNull();

    // 인식 도구를 못 불러오면 그 안내를 보여준다
    vi.mocked(readImageText).mockRejectedValueOnce(new Error('글자 인식 도구를 불러오지 못했어요.'));
    await userEvent.upload(screen.getByLabelText('영수증 사진'), photo);
    expect(toast()).toBe('글자 인식 도구를 불러오지 못했어요.');
  });

  it('거래 내역 캡처 여러 장을 올리면 확인 목록을 열고, 고른 줄만 한 번에 추가하고 되돌릴 수 있다', async () => {
    const shot = (name: string) => new File(['x'], name, { type: 'image/png' });
    render(<LedgerPage />);

    vi.mocked(readImageText)
      .mockResolvedValueOnce('2026.09.21\n스타벅스 -4,500원\nGS25 -3,200원')
      // 스크롤 캡처: 앞 사진의 마지막 줄이 겹친다
      .mockResolvedValueOnce('GS25 -3,200원\n2026.09.20\n신한카드 카드대금 -500,000원\n홍길동 +20,000원');
    await userEvent.upload(screen.getByLabelText('영수증 사진'), [shot('a.png'), shot('b.png')]);

    const sheet = screen.getByRole('dialog', { name: '거래 내역 확인' });
    expect(within(sheet).getAllByRole('listitem')).toHaveLength(4);
    expect((within(sheet).getByRole('checkbox', { name: '신한카드 카드대금 추가' }) as HTMLInputElement).checked).toBe(false);
    expect(within(sheet).getByText('돈 이동?')).toBeTruthy();

    await userEvent.click(within(sheet).getByRole('checkbox', { name: 'GS25 추가' }));
    await userEvent.click(within(sheet).getByRole('button', { name: /선택한 2건 추가/ }));

    expect(useLedgerStore.getState().transactions).toEqual([
      expect.objectContaining({ type: 'expense', amount: 4500, category: 'cafe', date: '2026-09-21', paymentMethod: 'card' }),
      expect.objectContaining({ type: 'income', amount: 20000, date: '2026-09-20', memo: '홍길동' }),
    ]);
    const toast = useToastStore.getState().toast;
    expect(toast?.message).toBe('2건 추가했어요');
    toast?.action?.run();
    expect(useLedgerStore.getState().transactions).toEqual([]);
  });

  it('고정 항목을 추가하면 이번 달 내역에 들어간다', async () => {
    render(<LedgerPage />);
    await userEvent.click(screen.getByRole('button', { name: '고정 항목' }));
    await userEvent.click(screen.getByRole('button', { name: '+ 고정 항목' }));

    const form = screen.getByRole('dialog', { name: '고정 항목 추가' });
    await userEvent.click(within(form).getByRole('button', { name: '수입' }));
    await userEvent.type(within(form).getByLabelText('이름'), '월급');
    await userEvent.type(within(form).getByLabelText('금액'), '2500000');
    await userEvent.clear(within(form).getByLabelText('매월 며칠'));
    await userEvent.type(within(form).getByLabelText('매월 며칠'), '25');
    await userEvent.click(within(form).getByRole('button', { name: '추가' }));

    expect(useLedgerStore.getState().fixedItems).toMatchObject([
      { type: 'income', name: '월급', amount: 2500000, category: 'salary', day: 25, startMonth: '2026-09' },
    ]);
    await userEvent.click(within(screen.getByRole('dialog', { name: '고정 수입·지출' })).getByRole('button', { name: '닫기' }));
    expect(total('수입 합계')).toBe('2,500,000원');
  });
});
