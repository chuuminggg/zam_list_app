// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLedgerCategoryStore } from '../stores/ledgerCategoryStore';
import { useLedgerPrefsStore } from '../stores/ledgerPrefsStore';
import { useLedgerStore } from '../stores/ledgerStore';
import LedgerPage from './LedgerPage';

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
