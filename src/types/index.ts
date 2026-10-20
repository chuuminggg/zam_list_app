export type {
  Category,
  FixedItem,
  JournalType,
  LedgerType,
  PaymentMethod,
  ProductSource,
  StockLink,
  Todo,
  Transaction,
  WishItem,
} from '../../shared/data';
import type { SourceProviderId } from '../../shared/api';

export type WishFilter = 'all' | 'want' | 'bought' | 'dropped';
/** 담은 쇼핑몰 필터 ('all'이면 쇼핑몰과 무관하게 모두) */
export type WishShopFilter = 'all' | SourceProviderId;
export type WishSort = 'newest' | 'oldest' | 'price-asc' | 'price-desc' | 'price-drop';

export type Theme = 'light' | 'dark' | 'system';
