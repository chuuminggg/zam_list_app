import type { CollectionId, CollectionItem } from '../../shared/data';
import {
  ApiClientError,
  deleteItem,
  fetchCollection,
  replaceCollection,
  resetPasswordRequest,
  signInRequest,
  signOutRequest,
  upsertItems,
} from '../api/client';
import { useCategoryStore } from '../stores/categoryStore';
import { useLedgerStore } from '../stores/ledgerStore';
import { useSyncStore } from '../stores/syncStore';
import { useTodoStore } from '../stores/todoStore';
import { useWishStore } from '../stores/wishStore';
import { diffItems } from './diff';

/**
 * 로컬 스토어(localStorage)와 서버(/api/data)를 동기화한다.
 * - 로그인 전에는 이 기기에만 저장한다.
 * - 시작/로그인/탭 복귀 시 서버 데이터를 불러와 로컬을 덮어쓴다 (서버가 기준).
 * - 로컬 변경은 스토어 구독으로 감지해 즉시 서버에 반영한다.
 * - 서버에 저장소가 설정되지 않았으면 로컬 전용으로 동작한다.
 */

interface Binding<C extends CollectionId> {
  collection: C;
  get: () => CollectionItem[C][];
  set: (items: CollectionItem[C][]) => void;
  subscribe: (listener: (next: CollectionItem[C][], prev: CollectionItem[C][]) => void) => () => void;
}

const todosBinding: Binding<'todos'> = {
  collection: 'todos',
  get: () => useTodoStore.getState().todos,
  set: (todos) => useTodoStore.setState({ todos }),
  subscribe: (listener) =>
    useTodoStore.subscribe((s, p) => {
      if (s.todos !== p.todos) listener(s.todos, p.todos);
    }),
};

const wishBinding: Binding<'wishlist'> = {
  collection: 'wishlist',
  get: () => useWishStore.getState().items,
  set: (items) => useWishStore.setState({ items }),
  subscribe: (listener) =>
    useWishStore.subscribe((s, p) => {
      if (s.items !== p.items) listener(s.items, p.items);
    }),
};

const categoryBinding: Binding<'categories'> = {
  collection: 'categories',
  get: () => useCategoryStore.getState().categories,
  set: (categories) => useCategoryStore.setState({ categories }),
  subscribe: (listener) =>
    useCategoryStore.subscribe((s, p) => {
      if (s.categories !== p.categories) listener(s.categories, p.categories);
    }),
};

const transactionsBinding: Binding<'transactions'> = {
  collection: 'transactions',
  get: () => useLedgerStore.getState().transactions,
  set: (transactions) => useLedgerStore.setState({ transactions }),
  subscribe: (listener) =>
    useLedgerStore.subscribe((s, p) => {
      if (s.transactions !== p.transactions) listener(s.transactions, p.transactions);
    }),
};

const fixedItemsBinding: Binding<'fixedItems'> = {
  collection: 'fixedItems',
  get: () => useLedgerStore.getState().fixedItems,
  set: (fixedItems) => useLedgerStore.setState({ fixedItems }),
  subscribe: (listener) =>
    useLedgerStore.subscribe((s, p) => {
      if (s.fixedItems !== p.fixedItems) listener(s.fixedItems, p.fixedItems);
    }),
};

const BINDINGS = [todosBinding, wishBinding, categoryBinding, transactionsBinding, fixedItemsBinding] as const;

const setSync = useSyncStore.setState;
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';
const isCode = (error: unknown, code: string) => error instanceof ApiClientError && error.code === code;

/** 요청 순서를 보장하기 위한 직렬 큐 (추가 직후 삭제 등이 뒤바뀌지 않도록) */
let queue: Promise<unknown> = Promise.resolve();
function enqueue<T>(task: () => Promise<T>): Promise<T> {
  const run = queue.then(task);
  queue = run.catch(() => undefined);
  return run;
}

/** 서버 데이터를 로컬에 반영하는 중에는 변경 감지를 끈다. */
let applyingRemote = false;

function applyRemote<C extends CollectionId>(binding: Binding<C>, items: CollectionItem[C][]) {
  applyingRemote = true;
  try {
    binding.set(items);
  } finally {
    applyingRemote = false;
  }
}

/** 세션이 만료됐거나 로그아웃했을 때: 서버 동기화를 멈추고 로그인 전 상태로 돌린다. */
function endSession() {
  setSync({ session: null, status: 'signedOut', error: null });
}

async function pull() {
  const { session, lastSyncedUserId } = useSyncStore.getState();
  if (!session) return;
  const firstSync = lastSyncedUserId !== session.user.id;
  const snapshots = BINDINGS.map((b) => b.get());
  const remote = await Promise.all(BINDINGS.map((b) => fetchCollection(session.token, b.collection)));

  for (const [index, binding] of BINDINGS.entries()) {
    const items = remote[index];
    const local = binding.get();
    if (firstSync && items.length === 0 && local.length > 0) {
      // 이 계정으로 처음 동기화하는데 서버가 비어 있으면 기존 로컬 데이터를 올린다.
      await replaceCollection(session.token, binding.collection, local);
    } else if (local === snapshots[index]) {
      // 불러오는 사이에 로컬이 바뀌었으면 그 변경을 서버로 보내는 중이므로 덮어쓰지 않는다.
      applyRemote(binding as Binding<CollectionId>, items);
    }
  }
  setSync({ lastSyncedUserId: session.user.id });
}

/**
 * 서버에서 다시 불러온다. 이 기기에만 있던 미저장 변경은 서버 데이터로 덮어써진다.
 * background면 상태를 loading으로 바꾸지 않아 그동안의 변경도 계속 서버로 보낸다.
 */
export function reloadFromServer({ background = false } = {}): Promise<void> {
  if (!useSyncStore.getState().session) {
    setSync({ status: 'signedOut', error: null });
    return Promise.resolve();
  }
  if (!background) setSync({ status: 'loading', error: null });
  return enqueue(async () => {
    try {
      await pull();
      if (!background) setSync({ status: 'ready' });
    } catch (error) {
      if (isCode(error, 'UNAUTHORIZED')) {
        endSession();
      } else if (background) {
        // 백그라운드 새로고침 실패는 저장에 영향이 없으므로 다음 기회에 다시 시도한다.
        console.warn('[sync] 새로고침 실패', error);
      } else if (isCode(error, 'NOT_CONFIGURED')) {
        setSync({ status: 'unavailable', error: null });
      } else {
        setSync({ status: 'error', error: { phase: 'load', message: errorMessage(error) } });
      }
    }
  });
}

/** 이 기기의 데이터로 서버를 덮어쓴다 (저장 실패 후 복구용). */
export function pushAllToServer(): Promise<void> {
  const { session } = useSyncStore.getState();
  if (!session) return reloadFromServer();
  setSync({ status: 'loading', error: null });
  return enqueue(async () => {
    try {
      await Promise.all(BINDINGS.map((b) => replaceCollection(session.token, b.collection, b.get())));
      setSync({ status: 'ready', lastSyncedUserId: session.user.id });
    } catch (error) {
      if (isCode(error, 'UNAUTHORIZED')) endSession();
      else setSync({ status: 'error', error: { phase: 'save', message: errorMessage(error) } });
    }
  });
}

/** 실패 단계에 맞게 다시 시도한다. */
export function retrySync(): Promise<void> {
  return useSyncStore.getState().error?.phase === 'save' ? pushAllToServer() : reloadFromServer();
}

/**
 * 아이디·비밀번호로 로그인하고 그 계정의 데이터를 불러온다.
 * 처음 보는 아이디면 계정을 만들지 않고 'new'를 돌려준다. 화면에서 확인받아 create: true로 다시 부른다.
 * 초기화된 계정이면 'mustChange'를 돌려준다. 새 비밀번호를 받아 newPassword와 함께 다시 부른다.
 * 실패하면 ApiClientError를 던진다 (화면에서 메시지를 보여준다).
 */
export async function signIn(
  username: string,
  password: string,
  { create = false, newPassword }: { create?: boolean; newPassword?: string } = {},
): Promise<{ status: 'new' } | { status: 'mustChange' } | { status: 'signedIn'; created: boolean }> {
  const result = await signInRequest(username, password, create, newPassword);
  if (result.status === 'new' || result.status === 'mustChange') return { status: result.status };
  setSync({ session: { token: result.token, user: result.user } });
  await reloadFromServer();
  return { status: 'signedIn', created: result.created };
}

/** 비밀번호를 오늘 날짜로 초기화하고 임시 비밀번호를 돌려준다. */
export async function resetPassword(username: string): Promise<string> {
  return (await resetPasswordRequest(username)).temporaryPassword;
}

/** 로그아웃. 다음 사람이 보지 않도록 이 기기의 목록도 비운다. */
export async function signOut(): Promise<void> {
  const { session } = useSyncStore.getState();
  endSession();
  setSync({ lastSyncedUserId: null });
  for (const binding of BINDINGS) applyRemote(binding as Binding<CollectionId>, []);
  if (session) {
    await enqueue(() => signOutRequest(session.token)).catch((error) => {
      // 서버 세션은 만료되면 사라지므로 실패해도 로컬 로그아웃은 유지한다.
      console.warn('[sync] 로그아웃 요청 실패', error);
    });
  }
}

function pushChanges<C extends CollectionId>(collection: C, next: CollectionItem[C][], prev: CollectionItem[C][]) {
  const { session, status } = useSyncStore.getState();
  if (applyingRemote || status !== 'ready' || !session) return;
  const { upserts, deletes } = diffItems(prev, next);
  if (upserts.length === 0 && deletes.length === 0) return;

  setSync((s) => ({ pending: s.pending + 1 }));
  void enqueue(async () => {
    if (upserts.length > 0) await upsertItems(session.token, collection, upserts);
    for (const id of deletes) await deleteItem(session.token, collection, id);
  })
    .catch((error) => {
      if (isCode(error, 'UNAUTHORIZED')) endSession();
      else setSync({ status: 'error', error: { phase: 'save', message: errorMessage(error) } });
    })
    .finally(() => setSync((s) => ({ pending: s.pending - 1 })));
}

let started = false;

/** 앱 시작 시 한 번 호출. 이후 호출은 무시된다. */
export function startSync() {
  if (started) return;
  started = true;

  for (const binding of BINDINGS) {
    (binding as Binding<CollectionId>).subscribe((next, prev) => pushChanges(binding.collection, next, prev));
  }

  // 다른 기기에서 바꾼 내용을 탭으로 돌아올 때 반영한다.
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && useSyncStore.getState().status === 'ready') {
      void reloadFromServer({ background: true });
    }
  });

  void reloadFromServer();
}
