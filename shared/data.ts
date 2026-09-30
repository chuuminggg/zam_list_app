/**
 * 서버에 저장하는 사용자 데이터 타입. 프론트(src)와 서버 함수(api, server)가 함께 쓴다.
 */
import type { SourceProviderId, StockProviderId } from './api.js';

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  /** 할 일 날짜 (로컬 기준 YYYY-MM-DD). 예전 항목은 없을 수 있다. */
  date?: string;
  /** 소속 카테고리 id. 없거나 ''이면 미분류 */
  categoryId?: string;
  /** 예전 UI의 우선순위. 지금은 표시하지 않고 호환용으로만 둔다. */
  priority: 'high' | 'medium' | 'low';
  /** 예전 UI의 자유 입력 카테고리 이름. 새 항목은 ''이고 categoryId를 쓴다. */
  category: string;
  createdAt: string;
}

/** 할 일 카테고리 */
export interface Category {
  id: string;
  name: string;
  /** #rrggbb */
  color: string;
  /** 표시 순서 (오름차순) */
  order: number;
  createdAt: string;
}

/** 상품 검색·특가 목록에서 담은 항목의 원본 상품 */
export interface ProductSource {
  provider: SourceProviderId;
  externalId: string;
}

/** 매장 재고 확인용으로 연결한 외부 상품 (직접 추가한 항목에 연결할 때 사용) */
export interface StockLink {
  provider: StockProviderId;
  productId: string;
  productName: string;
}

/** 재조회로 확인한 시점의 가격 */
export interface PricePoint {
  /** 확인 시각 (ISO) */
  at: string;
  price: number;
}

/** 항목당 보관하는 가격 이력 개수 (오래된 것부터 버린다) */
export const MAX_PRICE_HISTORY = 20;

export interface WishItem {
  id: string;
  name: string;
  url?: string;
  price?: number;
  memo?: string;
  imageUrl?: string;
  status: 'want' | 'bought' | 'dropped';
  category: string;
  createdAt: string;
  source?: ProductSource;
  stockLink?: StockLink;
  /** 마지막 재조회에서 확인한 품절·판매완료 여부 */
  soldOut?: boolean;
  /** 마지막 재조회 시각 (ISO) */
  lastCheckedAt?: string;
  /** 가격이 바뀔 때마다 쌓는 이력 (오래된 순) */
  priceHistory?: PricePoint[];
}

/** 가계부 내역 구분 */
export type LedgerType = 'income' | 'expense';

/** 가계부 내역 (한 번 들어오거나 나간 돈) */
export interface Transaction {
  id: string;
  type: LedgerType;
  /** 금액 (원, 양의 정수) */
  amount: number;
  /** 카테고리 id (src/constants/ledger.ts) */
  category: string;
  /** 날짜 (로컬 기준 YYYY-MM-DD) */
  date: string;
  memo?: string;
  createdAt: string;
}

/** 매월 반복되는 고정 수입·지출. 월별 내역은 저장하지 않고 화면에서 계산한다. */
export interface FixedItem {
  id: string;
  type: LedgerType;
  name: string;
  /** 금액 (원, 양의 정수) */
  amount: number;
  category: string;
  /** 매월 며칠 (1~31). 그 달에 없는 날이면 말일로 본다. */
  day: number;
  /** 적용 시작 월 (YYYY-MM) */
  startMonth: string;
  /** 적용 마지막 월 (YYYY-MM). 없으면 계속 적용 */
  endMonth?: string;
  createdAt: string;
}

/** 가계부 금액 상한 (원) */
export const MAX_LEDGER_AMOUNT = 1_000_000_000_000;

export const COLLECTION_IDS = ['todos', 'wishlist', 'categories', 'transactions', 'fixedItems'] as const;
export type CollectionId = (typeof COLLECTION_IDS)[number];

export interface CollectionItem {
  todos: Todo;
  wishlist: WishItem;
  categories: Category;
  transactions: Transaction;
  fixedItems: FixedItem;
}

/** 로그인한 사용자 */
export interface AuthUser {
  id: string;
  username: string;
}

/** 아이디: 한글·영문 소문자·숫자·_·- 2~20자 (대소문자는 구분하지 않는다) */
export const USERNAME_PATTERN = /^[a-z0-9가-힣_-]{2,20}$/;
export const PASSWORD_MAX = 100;
/** 새 계정 비밀번호 최소 길이. 기존 계정은 예전 규칙으로 만든 비밀번호로도 로그인할 수 있다. */
export const PASSWORD_MIN = 8;

/**
 * 새 계정 비밀번호 규칙 (KISA 가이드 기준): 영문·숫자·특수문자 중 3종류 이상 8자 이상,
 * 또는 2종류 이상 10자 이상. 규칙에 맞으면 null, 아니면 안내 문구를 돌려준다.
 */
export function passwordPolicyError(password: string): string | null {
  const kinds = [/[A-Za-z]/, /[0-9]/, /[^A-Za-z0-9]/].filter((re) => re.test(password)).length;
  if (password.length > PASSWORD_MAX) return `비밀번호는 ${PASSWORD_MAX}자 이하여야 해요.`;
  if ((kinds >= 3 && password.length >= PASSWORD_MIN) || (kinds >= 2 && password.length >= 10)) return null;
  return '비밀번호는 영문·숫자·특수문자를 모두 섞어 8자 이상, 또는 두 종류를 섞어 10자 이상이어야 해요.';
}

/**
 * 링크·이미지 주소를 http(s)로 정리한다. 스킴이 없으면 https://를 붙이고,
 * javascript: 같은 다른 스킴이거나 비어 있으면 undefined.
 */
export function safeHttpUrl(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed) return undefined;
  if (/^https?:\/\//i.test(trimmed)) return trimmed;
  if (/^[a-z][a-z0-9+-]*:/i.test(trimmed)) return undefined;
  return `https://${trimmed.replace(/^\/+/, '')}`;
}

/** 컬렉션당 최대 항목 수 */
export const MAX_ITEMS_PER_COLLECTION = 1000;
