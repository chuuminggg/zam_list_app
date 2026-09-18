import type { CollectionId, CollectionItem } from '../../shared/data';
import {
  ApiClientError,
  deleteItem,
  fetchCollection,
  replaceCollection,
  upsertItems,
} from '../api/client';
import { useCategoryStore } from '../stores/categoryStore';
import { useSyncStore } from '../stores/syncStore';
import { useTodoStore } from '../stores/todoStore';
import { useWishStore } from '../stores/wishStore';
import { diffItems } from './diff';

/**
 * 로컬 스토어(localStorage)와 서버(/api/data)를 동기화한다.
 * - 시작/탭 복귀 시 서버 데이터를 불러와 로컬을 덮어쓴다 (서버가 기준).
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

const BINDINGS = [todosBinding, wishBinding, categoryBinding] as const;

const setSync = useSyncStore.setState;
const errorMessage = (error: unknown) =>
  error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.';

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

async function pull() {
  const { syncKey, lastSyncedKey } = useSyncStore.getState();
  const firstSync = lastSyncedKey !== syncKey;
  const snapshots = BINDINGS.map((b) => b.get());
  const remote = await Promise.all(BINDINGS.map((b) => fetchCollection(syncKey, b.collection)));

  for (const [index, binding] of BINDINGS.entries()) {
    const items = remote[index];
    const local = binding.get();
    if (firstSync && items.length === 0 && local.length > 0) {
      // 이 키로 처음 동기화하는데 서버가 비어 있으면 기존 로컬 데이터를 올린다.
      await replaceCollection(syncKey, binding.collection, local);
    } else if (local === snapshots[index]) {
      // 불러오는 사이에 로컬이 바뀌었으면 그 변경을 서버로 보내는 중이므로 덮어쓰지 않는다.
      applyRemote(binding as Binding<CollectionId>, items);
    }
  }
  setSync({ lastSyncedKey: syncKey });
}

/**
 * 서버에서 다시 불러온다. 이 기기에만 있던 미저장 변경은 서버 데이터로 덮어써진다.
 * background면 상태를 loading으로 바꾸지 않아 그동안의 변경도 계속 서버로 보낸다.
 */
export function reloadFromServer({ background = false } = {}): Promise<void> {
  if (!background) setSync({ status: 'loading', error: null });
  return enqueue(async () => {
    try {
      await pull();
      if (!background) setSync({ status: 'ready' });
    } catch (error) {
      if (background) {
        // 백그라운드 새로고침 실패는 저장에 영향이 없으므로 다음 기회에 다시 시도한다.
        console.warn('[sync] 새로고침 실패', error);
      } else if (error instanceof ApiClientError && error.code === 'NOT_CONFIGURED') {
        setSync({ status: 'unavailable', error: null });
      } else {
        setSync({ status: 'error', error: { phase: 'load', message: errorMessage(error) } });
      }
    }
  });
}

/** 이 기기의 데이터로 서버를 덮어쓴다 (저장 실패 후 복구용). */
export function pushAllToServer(): Promise<void> {
  setSync({ status: 'loading', error: null });
  return enqueue(async () => {
    const { syncKey } = useSyncStore.getState();
    try {
      await Promise.all(BINDINGS.map((b) => replaceCollection(syncKey, b.collection, b.get())));
      setSync({ status: 'ready', lastSyncedKey: syncKey });
    } catch (error) {
      setSync({ status: 'error', error: { phase: 'save', message: errorMessage(error) } });
    }
  });
}

/** 실패 단계에 맞게 다시 시도한다. */
export function retrySync(): Promise<void> {
  return useSyncStore.getState().error?.phase === 'save' ? pushAllToServer() : reloadFromServer();
}

/** 다른 기기의 동기화 키로 전환하고 그 데이터를 불러온다. */
export function connectSyncKey(syncKey: string): Promise<void> {
  setSync({ syncKey });
  return reloadFromServer();
}

function pushChanges<C extends CollectionId>(collection: C, next: CollectionItem[C][], prev: CollectionItem[C][]) {
  if (applyingRemote || useSyncStore.getState().status !== 'ready') return;
  const { upserts, deletes } = diffItems(prev, next);
  if (upserts.length === 0 && deletes.length === 0) return;

  const { syncKey } = useSyncStore.getState();
  setSync((s) => ({ pending: s.pending + 1 }));
  void enqueue(async () => {
    if (upserts.length > 0) await upsertItems(syncKey, collection, upserts);
    for (const id of deletes) await deleteItem(syncKey, collection, id);
  })
    .catch((error) => {
      setSync({ status: 'error', error: { phase: 'save', message: errorMessage(error) } });
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
