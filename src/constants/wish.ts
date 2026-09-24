import type { WishItem, WishFilter, WishSort } from '../types';

export const STATUSES = ['want', 'bought', 'dropped'] as const;

export const STATUS_LABEL: Record<WishItem['status'], string> = {
  want: '원함',
  bought: '구매함',
  dropped: '포기',
};

export const STATUS_TONE: Record<WishItem['status'], string> = {
  want: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  bought: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  dropped: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

export const WISH_FILTERS: { value: WishFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'want', label: '원함' },
  { value: 'bought', label: '구매함' },
  { value: 'dropped', label: '포기' },
];

export const WISH_SORTS: { value: WishSort; label: string }[] = [
  { value: 'newest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
  { value: 'price-asc', label: '가격 낮은순' },
  { value: 'price-desc', label: '가격 높은순' },
  { value: 'price-drop', label: '가격 하락순' },
];
