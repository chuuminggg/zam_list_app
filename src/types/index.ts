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

/** 매장 재고 확인용으로 연결한 외부 상품 */
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
  stockLink?: StockLink;
}

export type WishFilter = 'all' | 'want' | 'bought' | 'dropped';
export type WishSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc';

export type Theme = 'light' | 'dark' | 'system';
