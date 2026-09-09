import type { StockProviderId, StockStatus } from '../../shared/api';
import type { StockLink, WishItem } from '../types';

export const STOCK_PROVIDER_LABEL: Record<StockProviderId, string> = {
  daiso: '다이소',
  oliveyoung: '올리브영',
};

export const STOCK_PROVIDERS = (Object.keys(STOCK_PROVIDER_LABEL) as StockProviderId[]).map((value) => ({
  value,
  label: STOCK_PROVIDER_LABEL[value],
}));

export const STOCK_STATUS_TONE: Record<StockStatus, string> = {
  in_stock: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  out_of_stock: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  not_sold: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  unknown: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

/** 해당 공급자에서 재고 확인에 쓸 상품. 직접 연결한 상품이 우선이고, 없으면 검색으로 담은 원본 상품. */
export function getStockLink(item: WishItem, provider: StockProviderId): StockLink | undefined {
  if (item.stockLink?.provider === provider) return item.stockLink;
  if (item.source?.provider === provider) {
    return { provider, productId: item.source.externalId, productName: item.name };
  }
  return undefined;
}
