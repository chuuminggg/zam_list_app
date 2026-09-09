import type { StockProviderId, StockStatus } from '../../shared/api';

export const STOCK_PROVIDERS: { value: StockProviderId; label: string }[] = [
  { value: 'daiso', label: '다이소' },
  { value: 'oliveyoung', label: '올리브영' },
];

export const STOCK_STATUS_TONE: Record<StockStatus, string> = {
  in_stock: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  out_of_stock: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  not_sold: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  unknown: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};
