export type {
  Category,
  FixedItem,
  LedgerType,
  ProductSource,
  StockLink,
  Todo,
  Transaction,
  WishItem,
} from '../../shared/data';

export type WishFilter = 'all' | 'want' | 'bought' | 'dropped';
export type WishSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'price-drop';

export type Theme = 'light' | 'dark' | 'system';
