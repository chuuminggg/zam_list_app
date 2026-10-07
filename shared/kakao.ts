import type { AuthUser } from './data.js';

/** 카카오 로그인 시작 목적. login: 로그인·아이디 찾기 / link: 로그인한 계정에 카카오 연결 */
export type KakaoMode = 'login' | 'link';

export interface KakaoLink {
  nickname: string | null;
  linkedAt: string;
}

/** GET /api/kakao — 카카오 로그인 사용 가능 여부와 (로그인했으면) 내 연결 상태 */
export interface KakaoState {
  enabled: boolean;
  link: KakaoLink | null;
  /** 비밀번호가 있는 계정인지. 없으면 연결을 끊을 수 없다. 로그인 전이면 null */
  hasPassword: boolean | null;
}

/**
 * 카카오 인가 코드 처리 결과.
 * signedIn: 연결된 계정으로 로그인 / linked: 로그인한 계정에 연결함
 * unlinked: 연결된 계정이 없음 — ticket으로 새 계정을 만들거나 기존 계정에 연결한다.
 */
export type KakaoCallbackResult =
  | { status: 'signedIn'; token: string; user: AuthUser }
  | { status: 'linked'; user: AuthUser }
  | { status: 'unlinked'; ticket: string; nickname: string | null };
