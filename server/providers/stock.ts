import type { ProductResult, StockProviderId, StockResult } from '../../shared/api.js';
import { checkDaisoStock, searchDaisoProducts } from './daiso.js';
import { checkOliveyoungStock, searchOliveyoungProducts } from './oliveyoung.js';

interface StockAdapter {
  searchProducts: (query: string, limit: number) => Promise<ProductResult[]>;
  checkStock: (productId: string, storeKeyword: string, limit: number) => Promise<StockResult>;
}

/** 매장 재고 확인을 지원하는 공급자 어댑터 */
export const STOCK_ADAPTERS: Record<StockProviderId, StockAdapter> = {
  daiso: { searchProducts: searchDaisoProducts, checkStock: checkDaisoStock },
  oliveyoung: { searchProducts: searchOliveyoungProducts, checkStock: checkOliveyoungStock },
};

export const STOCK_PROVIDERS = Object.keys(STOCK_ADAPTERS) as StockProviderId[];
