// @vitest-environment jsdom
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useCategoryStore } from '../stores/categoryStore';
import { useTodoStore } from '../stores/todoStore';
import { addDays, todayKey } from '../utils/date';
import TodoPage from './TodoPage';

beforeEach(() => {
  useTodoStore.setState({ todos: [] });
  useCategoryStore.setState({ categories: [] });
});

afterEach(() => {
  // globals: false 라 자동 cleanup이 걸리지 않는다.
  cleanup();
  localStorage.clear();
});

describe('TodoPage', () => {
  it('카테고리를 만들고 그 아래에 선택한 날짜의 할 일을 추가한다', async () => {
    const user = userEvent.setup();
    render(<TodoPage />);

    await user.click(screen.getByRole('button', { name: '카테고리 만들기' }));
    const dialog = screen.getByRole('dialog', { name: '카테고리 관리' });
    await user.type(within(dialog).getByLabelText('새 카테고리 이름'), '공부{Enter}');
    await user.click(within(dialog).getByRole('button', { name: '닫기' }));

    await user.click(screen.getByRole('button', { name: '공부에 할 일 추가' }));
    await user.type(screen.getByLabelText('공부 새 할 일'), '영단어 외우기{Enter}');
    await user.keyboard('{Escape}');

    const section = screen.getByRole('region', { name: '공부' });
    const checkbox = within(section).getByRole('checkbox', { name: '영단어 외우기 완료' });
    expect(useTodoStore.getState().todos[0]).toMatchObject({ title: '영단어 외우기', date: todayKey() });

    await user.click(checkbox);
    expect(checkbox.getAttribute('aria-checked')).toBe('true');
    expect(screen.getByLabelText('1개 중 1개 완료')).toBeTruthy();
  });

  it('날짜를 바꾸면 그 날의 할 일만 보이고, 내일 하기로 옮길 수 있다', async () => {
    const user = userEvent.setup();
    const today = todayKey();
    useCategoryStore.setState({
      categories: [{ id: 'c1', name: '운동', color: '#22c55e', order: 0, createdAt: '2026-09-01' }],
    });
    useTodoStore.setState({
      todos: [
        { id: 't1', title: '달리기', done: false, date: today, categoryId: 'c1', priority: 'medium', category: '', createdAt: '2026-09-01' },
      ],
    });
    render(<TodoPage />);
    expect(screen.getByText('달리기')).toBeTruthy();

    await user.click(screen.getByRole('button', { name: '달리기 메뉴' }));
    await user.click(screen.getByRole('menuitem', { name: '내일 하기' }));
    expect(screen.queryByText('달리기')).toBeNull();
    expect(useTodoStore.getState().todos[0].date).toBe(addDays(today, 1));

    await user.click(screen.getByRole('button', { name: '다음 날' }));
    expect(screen.getByText('달리기')).toBeTruthy();
  });

  it('카테고리가 없는 할 일은 미분류로 보인다', () => {
    useTodoStore.setState({
      todos: [
        { id: 't1', title: '예전 할 일', done: false, date: todayKey(), priority: 'high', category: '', createdAt: '2026-09-01' },
      ],
    });
    render(<TodoPage />);
    expect(within(screen.getByRole('region', { name: '미분류' })).getByText('예전 할 일')).toBeTruthy();
  });
});
