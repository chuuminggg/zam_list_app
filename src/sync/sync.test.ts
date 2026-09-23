// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../shared/data';
import { useCategoryStore } from '../stores/categoryStore';
import { useSyncStore } from '../stores/syncStore';
import { useTodoStore } from '../stores/todoStore';
import { useWishStore } from '../stores/wishStore';
import { reloadFromServer, signIn, signOut, startSync } from './sync';

const TOKEN = 't'.repeat(43);
const SESSION = { token: TOKEN, user: { id: 'u1', username: 'zam' } };
const todo = (id: string): Todo => ({
  id,
  title: id,
  done: false,
  priority: 'low',
  category: '',
  createdAt: `2026-09-19T00:00:0${id.length}Z`,
});

type Call = { method: string; url: string; body?: unknown };

/** /api/data 응답을 흉내 낸다. remote[collection]이 서버에 저장된 항목. */
function mockApi(remote: Record<string, unknown[]>, error?: { code: string; message: string }) {
  const calls: Call[] = [];
  vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const method = init?.method ?? 'GET';
    const body = init?.body ? JSON.parse(String(init.body)) : undefined;
    calls.push({ method, url: String(input), body });
    if (error) return Response.json({ ok: false, error }, { status: 503 });
    if (String(input).startsWith('/api/auth')) {
      return Response.json({ ok: true, data: method === 'POST' ? { ...SESSION, created: false } : null });
    }
    const collection = new URL(String(input), 'http://x').searchParams.get('collection')!;
    return Response.json({ ok: true, data: method === 'GET' ? { items: remote[collection] ?? [] } : null });
  });
  return calls;
}

beforeEach(() => {
  useSyncStore.setState({ session: SESSION, lastSyncedUserId: null, status: 'idle', error: null, pending: 0 });
  useTodoStore.setState({ todos: [] });
  useCategoryStore.setState({ categories: [] });
});

afterEach(() => vi.restoreAllMocks());

describe('sync', () => {
  it('이 계정으로 처음 동기화할 때 서버가 비어 있으면 로컬 데이터를 올린다', async () => {
    useTodoStore.setState({ todos: [todo('a')] });
    const calls = mockApi({});
    await reloadFromServer();

    expect(useSyncStore.getState().status).toBe('ready');
    const put = calls.find((c) => c.method === 'PUT');
    expect(put?.url).toContain('collection=todos');
    expect(put?.body).toEqual({ items: [todo('a')] });
    expect(useTodoStore.getState().todos).toEqual([todo('a')]);
  });

  it('서버에 데이터가 있으면 로컬을 서버 데이터로 바꾸고, 이후 변경을 서버로 보낸다', async () => {
    useTodoStore.setState({ todos: [todo('local')] });
    const calls = mockApi({ todos: [todo('server')] });
    startSync();
    await vi.waitFor(() => expect(useSyncStore.getState().status).toBe('ready'));
    expect(useTodoStore.getState().todos).toEqual([todo('server')]);

    useTodoStore.getState().toggleTodo('server');
    useTodoStore.getState().deleteTodo('server');
    await vi.waitFor(() => expect(useSyncStore.getState().pending).toBe(0));

    const writes = calls.filter((c) => c.method !== 'GET');
    expect(writes.map((c) => c.method)).toEqual(['POST', 'DELETE']);
    expect(writes[0].body).toEqual({ items: [{ ...todo('server'), done: true }] });
    expect(writes[1].url).toContain('id=server');
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get('Authorization')).toBe(`Bearer ${TOKEN}`);
  });

  it('카테고리도 서버와 동기화한다', async () => {
    const category = { id: 'c1', name: '공부', color: '#3b82f6', order: 0, createdAt: '2026-09-19' };
    const calls = mockApi({ categories: [category] });
    await reloadFromServer();
    expect(useCategoryStore.getState().categories).toEqual([category]);

    useCategoryStore.getState().updateCategory('c1', { name: '독서' });
    await vi.waitFor(() => expect(useSyncStore.getState().pending).toBe(0));
    const post = calls.find((c) => c.method === 'POST');
    expect(post?.url).toContain('collection=categories');
    expect(post?.body).toEqual({ items: [{ ...category, name: '독서' }] });
  });

  it('서버 저장소가 없으면 로컬 전용 모드가 되고 쓰기 요청을 보내지 않는다', async () => {
    const calls = mockApi({}, { code: 'NOT_CONFIGURED', message: '미설정' });
    await reloadFromServer();
    expect(useSyncStore.getState().status).toBe('unavailable');

    useTodoStore.getState().addTodo({ title: 'x', date: '2026-09-19', categoryId: '' });
    expect(calls.filter((c) => c.method !== 'GET')).toEqual([]);
    expect(useTodoStore.getState().todos).toHaveLength(1);
  });

  it('로그인 전에는 서버에 요청하지 않고 이 기기에만 저장한다', async () => {
    useSyncStore.setState({ session: null });
    const calls = mockApi({});
    await reloadFromServer();
    expect(useSyncStore.getState().status).toBe('signedOut');

    useTodoStore.getState().addTodo({ title: 'x', date: '2026-09-19', categoryId: '' });
    expect(calls).toEqual([]);
  });

  it('로그인하면 계정 데이터를 불러오고, 로그아웃하면 이 기기 목록을 비운다', async () => {
    useSyncStore.setState({ session: null });
    useWishStore.setState({ items: [] });
    const calls = mockApi({ todos: [todo('server')] });
    await signIn('zam', '1234');
    expect(useSyncStore.getState()).toMatchObject({ status: 'ready', session: SESSION, lastSyncedUserId: 'u1' });
    expect(useTodoStore.getState().todos).toEqual([todo('server')]);

    await signOut();
    expect(useSyncStore.getState()).toMatchObject({ status: 'signedOut', session: null });
    expect(useTodoStore.getState().todos).toEqual([]);
    const writes = calls.filter((c) => c.method !== 'GET');
    expect(writes.map((c) => `${c.method} ${c.url}`)).toEqual(['POST /api/auth', 'DELETE /api/auth']);
  });

  it('세션이 만료되면(401) 로그인 전 상태로 돌아간다', async () => {
    mockApi({}, { code: 'UNAUTHORIZED', message: '로그인이 필요해요.' });
    await reloadFromServer();
    expect(useSyncStore.getState()).toMatchObject({ status: 'signedOut', session: null });
  });
});
