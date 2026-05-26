export interface Todo {
  id: string;
  title: string;
  done: boolean;
  priority: 'high' | 'medium' | 'low';
  category: string;
  createdAt: string;
}

export type TodoFilter = 'all' | 'active' | 'done';

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
}

export type WishFilter = 'all' | 'want' | 'bought' | 'dropped';
export type WishSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc';
