import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ProductResult, StockProviderId, StockResult } from '../../../shared/api';
import { checkStock } from '../../api/client';
import { useApiRequest } from '../../hooks/useApiRequest';
import { useStockPrefsStore } from '../../stores/stockPrefsStore';
import { useWishStore } from '../../stores/wishStore';
import type { WishItem } from '../../types';
import Button from '../common/Button';
import Input from '../common/Input';
import Modal from '../common/Modal';
import ProductPicker from './ProductPicker';
import ProviderToggle from './ProviderToggle';
import StoreStockList from './StoreStockList';

interface StockCheckModalProps {
  item: WishItem;
  onClose: () => void;
}

const SECTION_TITLE = 'text-xs font-semibold text-gray-500 dark:text-gray-400';

export default function StockCheckModal({ item, onClose }: StockCheckModalProps) {
  const updateItem = useWishStore((s) => s.updateItem);
  const savedStoreQuery = useStockPrefsStore((s) => s.storeQuery);
  const setStoreQuery = useStockPrefsStore((s) => s.setStoreQuery);

  const [provider, setProvider] = useState<StockProviderId>(item.stockLink?.provider ?? 'daiso');
  const [relinking, setRelinking] = useState(false);
  const [storeInput, setStoreInput] = useState(savedStoreQuery[provider] ?? '');
  const stock = useApiRequest<StockResult>();

  const link = item.stockLink?.provider === provider ? item.stockLink : undefined;
  const showPicker = !link || relinking;

  const changeProvider = (next: StockProviderId) => {
    setProvider(next);
    setRelinking(false);
    setStoreInput(savedStoreQuery[next] ?? '');
    stock.reset();
  };

  const handleSelect = (product: ProductResult) => {
    updateItem(item.id, {
      stockLink: { provider, productId: product.externalId, productName: product.name },
    });
    setRelinking(false);
    stock.reset();
  };

  const handleCheck = (e: FormEvent) => {
    e.preventDefault();
    const store = storeInput.trim();
    if (!link || !store) return;
    setStoreQuery(provider, store);
    stock.run((signal) => checkStock(provider, link.productId, store, signal));
  };

  return (
    <Modal open title="매장 재고 확인" onClose={onClose}>
      <ProviderToggle value={provider} onChange={changeProvider} />

      <section className="space-y-2">
        <h3 className={SECTION_TITLE}>1. 상품</h3>
        {showPicker ? (
          // provider가 바뀌면 검색 결과를 새로 시작한다.
          <ProductPicker key={provider} provider={provider} initialQuery={item.name} onSelect={handleSelect} />
        ) : (
          <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-purple-50 dark:bg-purple-900/20">
            <p className="text-sm text-gray-900 dark:text-white truncate">{link.productName}</p>
            <Button size="sm" variant="ghost" onClick={() => setRelinking(true)} className="flex-shrink-0">
              변경
            </Button>
          </div>
        )}
      </section>

      {link && !relinking && (
        <section className="space-y-2">
          <h3 className={SECTION_TITLE}>2. 매장</h3>
          <form onSubmit={handleCheck} className="flex gap-2">
            <Input
              accent="purple"
              aria-label="매장 검색어"
              placeholder="매장명 또는 지역 (예: 강남)"
              value={storeInput}
              onChange={(e) => setStoreInput(e.target.value)}
              className="text-sm"
            />
            <Button
              type="submit"
              variant="accent"
              disabled={!storeInput.trim() || stock.state.status === 'loading'}
              className="flex-shrink-0"
            >
              확인
            </Button>
          </form>
          {stock.state.status === 'loading' && (
            <p className="text-sm text-gray-500 dark:text-gray-400">매장 재고를 확인하는 중…</p>
          )}
          {stock.state.status === 'error' && <p className="text-sm text-red-500">{stock.state.message}</p>}
          {stock.state.status === 'success' && <StoreStockList result={stock.state.data} />}
        </section>
      )}

      <div className="pt-2">
        <Button variant="ghost" onClick={onClose} className="w-full">
          닫기
        </Button>
      </div>
    </Modal>
  );
}
