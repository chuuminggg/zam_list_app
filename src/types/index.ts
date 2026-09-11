export type { ProductSource, StockLink, Todo, WishItem } from '../../shared/data';

export type TodoFilter = 'all' | 'active' | 'done';

export type WishFilter = 'all' | 'want' | 'bought' | 'dropped';
export type WishSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc';

export type Theme = 'light' | 'dark' | 'system';
