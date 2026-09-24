// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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
