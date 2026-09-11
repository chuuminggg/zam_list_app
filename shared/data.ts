/**
 * 서버에 저장하는 사용자 데이터 타입. 프론트(src)와 서버 함수(api, server)가 함께 쓴다.
 */
import type { SearchProviderId, StockProviderId } from './api.js';

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
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
}

export const COLLECTION_IDS = ['todos', 'wishlist'] as const;
export type CollectionId = (typeof COLLECTION_IDS)[number];

export interface CollectionItem {
  todos: Todo;
  wishlist: WishItem;
}

/**
 * 동기화 키: 기기에서 생성하는 비밀값. 같은 키를 쓰는 기기끼리 데이터를 공유한다.
 * `Authorization: Bearer <key>` 헤더로 보낸다.
 */
export const SYNC_KEY_PATTERN = /^[A-Za-z0-9_-]{32,128}$/;

/** 컬렉션당 최대 항목 수 */
export const MAX_ITEMS_PER_COLLECTION = 1000;
