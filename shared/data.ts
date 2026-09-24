/**
 * 서버에 저장하는 사용자 데이터 타입. 프론트(src)와 서버 함수(api, server)가 함께 쓴다.
 */
import type { SearchProviderId, StockProviderId } from './api.js';

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

/** 상품 검색으로 담은 항목의 원본 상품 */
export interface ProductSource {
  provider: SearchProviderId;
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

export const COLLECTION_IDS = ['todos', 'wishlist', 'categories'] as const;
export type CollectionId = (typeof COLLECTION_IDS)[number];

export interface CollectionItem {
  todos: Todo;
  wishlist: WishItem;
  categories: Category;
}

/** 로그인한 사용자 */
export interface AuthUser {
  id: string;
  username: string;
}

/** 아이디: 한글·영문 소문자·숫자·_·- 2~20자 (대소문자는 구분하지 않는다) */
export const USERNAME_PATTERN = /^[a-z0-9가-힣_-]{2,20}$/;
export const PASSWORD_MIN = 4;
export const PASSWORD_MAX = 100;

/** 컬렉션당 최대 항목 수 */
export const MAX_ITEMS_PER_COLLECTION = 1000;
