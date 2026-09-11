// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Todo } from '../../shared/data';
import { useSyncStore } from '../stores/syncStore';
import { useTodoStore } from '../stores/todoStore';
import { reloadFromServer, startSync } from './sync';

const KEY = 'k'.repeat(43);
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
    const collection = new URL(String(input), 'http://x').searchParams.get('collection')!;
    return Response.json({ ok: true, data: method === 'GET' ? { items: remote[collection] ?? [] } : null });
  });
  return calls;
}

beforeEach(() => {
  useSyncStore.setState({ syncKey: KEY, lastSyncedKey: null, status: 'idle', error: null, pending: 0 });
  useTodoStore.setState({ todos: [] });
});

afterEach(() => vi.restoreAllMocks());

describe('sync', () => {
  it('이 키로 처음 동기화할 때 서버가 비어 있으면 로컬 데이터를 올린다', async () => {
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
    expect(new Headers(vi.mocked(fetch).mock.calls[0][1]?.headers).get('Authorization')).toBe(`Bearer ${KEY}`);
  });

  it('서버 저장소가 없으면 로컬 전용 모드가 되고 쓰기 요청을 보내지 않는다', async () => {
    const calls = mockApi({}, { code: 'NOT_CONFIGURED', message: '미설정' });
    await reloadFromServer();
    expect(useSyncStore.getState().status).toBe('unavailable');

    useTodoStore.getState().addTodo({ title: 'x', done: false, priority: 'low', category: '' });
    expect(calls.filter((c) => c.method !== 'GET')).toEqual([]);
    expect(useTodoStore.getState().todos).toHaveLength(1);
  });
});
