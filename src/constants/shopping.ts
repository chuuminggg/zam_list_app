import {
  DEAL_PROVIDER_IDS,
  PROVIDER_LABEL,
  SEARCH_PROVIDER_IDS,
  SOURCE_PROVIDER_IDS,
  STOCK_PROVIDER_IDS,
  type ProviderId,
  type DealProviderId,
  type ProviderInfo,
  type StockProviderId,
  type StockStatus,
} from '../../shared/api';
import type { StockLink, WishItem } from '../types';

const toOptions = <T extends ProviderId>(ids: readonly T[]) =>
  ids.map((value) => ({ value, label: PROVIDER_LABEL[value] }));

/** 상품 검색 탭 */
export const SEARCH_PROVIDERS = toOptions(SEARCH_PROVIDER_IDS);

/** 위시에 담기 모달 탭 — 검색 공급자 뒤에 특가 목록 공급자 */
export const SOURCE_PROVIDERS = toOptions(SOURCE_PROVIDER_IDS);

const DEAL_PROVIDER_SET = new Set<ProviderId>(DEAL_PROVIDER_IDS);

/** 검색어 없이 특가 목록을 보여주는 공급자인지 */
export function isDealProvider(provider: ProviderId): provider is DealProviderId {
  return DEAL_PROVIDER_SET.has(provider);
}

/** 매장 재고 확인 탭 */
export const STOCK_PROVIDERS = toOptions(STOCK_PROVIDER_IDS);

export const STOCK_STATUS_TONE: Record<StockStatus, string> = {
  in_stock: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  out_of_stock: 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400',
  not_sold: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
  unknown: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
};

export interface ProviderOption<T extends ProviderId> {
  value: T;
  label: string;
  /** 서버에서 비활성화된 공급자 (환경변수 미설정 등) */
  disabled?: boolean;
  reason?: string;
}

/**
 * 공급자 목록에 서버가 알려준 활성화 상태를 입힌다.
 * 목록을 아직 못 받았으면(null) 전부 사용 가능한 것으로 둔다.
 */
export function withAvailability<T extends ProviderId>(
  options: { value: T; label: string }[],
  providers: ProviderInfo[] | null
): ProviderOption<T>[] {
  if (!providers) return options;
  return options.map((option) => {
    const info = providers.find((p) => p.id === option.value);
    if (!info || info.enabled) return option;
    return { ...option, disabled: true, reason: info.reason };
  });
}

const STOCK_PROVIDER_SET = new Set<ProviderId>(STOCK_PROVIDER_IDS);

/** 해당 공급자가 매장 재고 확인을 지원하는지 */
export function supportsStockCheck(provider: ProviderId): provider is StockProviderId {
  return STOCK_PROVIDER_SET.has(provider);
}

/** 해당 공급자에서 재고 확인에 쓸 상품. 직접 연결한 상품이 우선이고, 없으면 검색으로 담은 원본 상품. */
export function getStockLink(item: WishItem, provider: StockProviderId): StockLink | undefined {
  if (item.stockLink?.provider === provider) return item.stockLink;
  if (item.source?.provider === provider) {
    return { provider, productId: item.source.externalId, productName: item.name };
  }
  return undefined;
}
