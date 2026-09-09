import type { StockProviderId } from '../../shared/api';

export interface Todo {
  id: string;
  title: string;
  done: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
  createdAt: string;
}

export type TodoFilter = 'all' | 'active' | 'done';

/** 상품 검색으로 담은 항목의 원본 상품 */
export interface ProductSource {
  provider: StockProviderId;
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

export type WishFilter = 'all' | 'want' | 'bought' | 'dropped';
export type WishSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc';

export type Theme = 'light' | 'dark' | 'system';
