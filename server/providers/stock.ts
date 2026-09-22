import { STOCK_PROVIDER_IDS, type StockProviderId, type StockResult } from '../../shared/api.js';
import { checkDaisoStock } from './daiso.js';
import { checkOliveyoungStock } from './oliveyoung.js';

/** productName은 상품번호로 조회할 수 없는 공급자(올리브영)가 상품을 다시 찾을 때 쓴다. */
type CheckStockFn = (productId: string, storeKeyword: string, limit: number, productName?: string) => Promise<StockResult>;

/** 매장 재고 확인을 지원하는 공급자 어댑터 */
export const STOCK_ADAPTERS: Record<StockProviderId, CheckStockFn> = {
  daiso: checkDaisoStock,
  oliveyoung: checkOliveyoungStock,
};

export const STOCK_PROVIDERS = STOCK_PROVIDER_IDS;
