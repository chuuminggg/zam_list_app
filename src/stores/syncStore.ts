import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AuthUser } from '../../shared/data';

/**
 * idle: 아직 시작 전 / loading: 서버에서 불러오는 중 / ready: 동기화 중
 * error: 실패 (변경은 이 기기에만 저장됨) / signedOut: 로그인 전 (이 기기에만 저장)
 * unavailable: 서버 저장소 미설정 (로컬 전용)
 */
export type SyncStatus = 'idle' | 'loading' | 'ready' | 'error' | 'signedOut' | 'unavailable';

export interface SyncError {
  /** load: 불러오기 실패 → 다시 불러옴 / save: 저장 실패 → 이 기기 데이터를 서버에 다시 올림 */
  phase: 'load' | 'save';
  message: string;
}

export interface Session {
  token: string;
  user: AuthUser;
}

interface SyncStore {
  /** 로그인 세션. 없으면 이 기기에만 저장한다. */
  session: Session | null;
  /** 마지막으로 서버와 동기화에 성공한 사용자 id. 다르면 첫 동기화로 보고 로컬 데이터를 올린다. */
  lastSyncedUserId: string | null;
  status: SyncStatus;
  error: SyncError | null;
  /** 진행 중인 저장 요청 수 */
  pending: number;
  /** 이 기기에서 로그인했던 아이디 (최근 순). 로그아웃해도 남겨서 아이디 찾기에 쓴다. */
  recentUsernames: string[];
}

const MAX_RECENT_USERNAMES = 5;

/** 로그인에 성공한 아이디를 맨 앞에 둔다. */
export function rememberUsername(username: string) {
  useSyncStore.setState((s) => ({
    recentUsernames: [username, ...s.recentUsernames.filter((u) => u !== username)].slice(0, MAX_RECENT_USERNAMES),
  }));
}

export const useSyncStore = create<SyncStore>()(
  persist(
    (): SyncStore => ({
      session: null,
      lastSyncedUserId: null,
      status: 'idle',
      error: null,
      pending: 0,
      recentUsernames: [],
    }),
    {
      name: 'zam-sync',
      // v0은 동기화 키 방식. 키는 버리고 로그인 후 서버가 비어 있으면 이 기기 데이터를 올린다.
      version: 1,
      migrate: () => ({ session: null, lastSyncedUserId: null, recentUsernames: [] }),
      partialize: ({ session, lastSyncedUserId, recentUsernames }) => ({ session, lastSyncedUserId, recentUsernames }),
    }
  )
);
