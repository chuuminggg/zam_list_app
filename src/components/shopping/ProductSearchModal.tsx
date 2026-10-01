import { useMemo, useState } from 'react';
import {
  COUPANG_AFFILIATE_NOTICE,
  PROVIDER_LABEL,
  type ProductResult,
  type SourceProviderId,
} from '../../../shared/api';
import { isDealProvider, SOURCE_PROVIDERS, withAvailability } from '../../constants/shopping';
import { useProviders } from '../../hooks/useProviders';
import { useWishStore } from '../../stores/wishStore';
import Button from '../common/Button';
import Modal from '../common/Modal';
import DealPicker from './DealPicker';
import ProductPicker from './ProductPicker';
import ProviderToggle from './ProviderToggle';

interface ProductSearchModalProps {
  onClose: () => void;
}

export default function ProductSearchModal({ onClose }: ProductSearchModalProps) {
  const items = useWishStore((s) => s.items);
  const addItem = useWishStore((s) => s.addItem);
  const [provider, setProvider] = useState<SourceProviderId>('daiso');
  const [addedCount, setAddedCount] = useState(0);
  const providers = useProviders();
  const options = withAvailability(SOURCE_PROVIDERS, providers);

  const addedIds = useMemo(
    () =>
      new Set(
        items.filter((i) => i.source?.provider === provider).map((i) => i.source!.externalId)
      ),
    [items, provider]
  );

  const handleAdd = (product: ProductResult) => {
    if (addedIds.has(product.externalId)) return;
    addItem({
      name: product.name,
      url: product.url,
      price: product.price,
      imageUrl: product.imageUrl,
      category: PROVIDER_LABEL[provider],
      status: 'want',
      source: { provider, externalId: product.externalId },
    });
    setAddedCount((n) => n + 1);
  };

  return (
    <Modal open title="상품 검색해서 담기" onClose={onClose}>
      <ProviderToggle value={provider} options={options} onChange={setProvider} />
      {/* 쇼핑몰이 바뀌면 검색어·결과를 새로 시작한다. */}
      {isDealProvider(provider) ? (
        <DealPicker
          key={provider}
          provider={provider}
          onSelect={handleAdd}
          selectedIds={addedIds}
          actionLabel="+ 담기"
          selectedLabel="담김 ✓"
        />
      ) : (
        <ProductPicker
          key={provider}
          provider={provider}
          initialQuery=""
          onSelect={handleAdd}
          selectedIds={addedIds}
          actionLabel="+ 담기"
          selectedLabel="담김 ✓"
          autoFocus
        />
      )}
      {provider === 'coupang' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">{COUPANG_AFFILIATE_NOTICE}</p>
      )}
      <div className="flex items-center gap-3 pt-2">
        {addedCount > 0 && (
          <p className="text-sm text-purple-600 dark:text-purple-400 flex-1">{addedCount}개 담았어요</p>
        )}
        <Button variant="ghost" onClick={onClose} className={addedCount > 0 ? '' : 'w-full'}>
          닫기
        </Button>
      </div>
    </Modal>
  );
}
