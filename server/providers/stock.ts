import { STOCK_PROVIDER_IDS, type StockProviderId, type StockResult } from '../../shared/api.js';
import { checkDaisoStock } from './daiso.js';
import { checkOliveyoungStock } from './oliveyoung.js';

type CheckStockFn = (productId: string, storeKeyword: string, limit: number) => Promise<StockResult>;

/** 매장 재고 확인을 지원하는 공급자 어댑터 */
export const STOCK_ADAPTERS: Record<StockProviderId, CheckStockFn> = {
  daiso: checkDaisoStock,
  oliveyoung: checkOliveyoungStock,
};

export const STOCK_PROVIDERS = STOCK_PROVIDER_IDS;
