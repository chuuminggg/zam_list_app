import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * idle: 아직 시작 전 / loading: 서버에서 불러오는 중 / ready: 동기화 중
 * error: 실패 (변경은 이 기기에만 저장됨) / unavailable: 서버 저장소 미설정 (로컬 전용)
 */
export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error' | 'unavailable';

export interface SyncError {
  /** load: 불러오기 실패 → 다시 불러옴 / save: 저장 실패 → 이 기기 데이터를 서버에 다시 올림 */
  phase: 'load' | 'save';
  message: string;
}

interface SyncStore {
  /** 이 기기의 동기화 키. 같은 키를 쓰는 기기끼리 데이터를 공유한다. */
  syncKey: string;
  /** 마지막으로 서버와 동기화에 성공한 키. 다르면 첫 동기화로 보고 로컬 데이터를 올린다. */
  lastSyncedKey: string | null;
  status: SyncStatus;
  error: SyncError | null;
  /** 진행 중인 저장 요청 수 */
  pending: number;
}

export function generateSyncKey(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (): SyncStore => ({
      syncKey: generateSyncKey(),
      lastSyncedKey: null,
      status: 'idle',
      error: null,
      pending: 0,
    }),
    {
      name: 'zam-sync',
      partialize: ({ syncKey, lastSyncedKey }) => ({ syncKey, lastSyncedKey }),
    }
  )
);
