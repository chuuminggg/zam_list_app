import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ProductResult, SearchProviderId } from '../../../shared/api';
import { searchProducts } from '../../api/client';
import { useApiRequest } from '../../hooks/useApiRequest';
import Button from '../common/Button';
import Input from '../common/Input';
import ProductResultList from './ProductResultList';

interface ProductPickerProps {
  provider: SearchProviderId;
  initialQuery: string;
  onSelect: (product: ProductResult) => void;
  /** 이미 선택된(담긴) 상품 ID. 해당 행은 비활성화된다. */
  selectedIds?: ReadonlySet<string>;
  /** 행 오른쪽에 표시할 동작 문구 (예: '담기') */
  actionLabel?: string;
  selectedLabel?: string;
  autoFocus?: boolean;
}

export default function ProductPicker({
  provider,
  initialQuery,
  onSelect,
  selectedIds,
  actionLabel,
  selectedLabel = '선택됨',
  autoFocus,
}: ProductPickerProps) {
  const [query, setQuery] = useState(initialQuery);
  const { state, run } = useApiRequest<ProductResult[]>();

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    run((signal) => searchProducts(provider, q, signal));
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        <Input
          accent="purple"
          aria-label="상품 검색어"
          placeholder="상품명 (2자 이상)"
          value={query}
          autoFocus={autoFocus}
          onChange={(e) => setQuery(e.target.value)}
          className="text-sm"
        />
        <Button
          type="submit"
          variant="accent"
          disabled={query.trim().length < 2 || state.status === 'loading'}
          className="flex-shrink-0"
        >
          검색
        </Button>
      </form>

      {state.status === 'loading' && <p className="text-sm text-gray-500 dark:text-gray-400">검색 중…</p>}
      {state.status === 'error' && <p className="text-sm text-red-500">{state.message}</p>}
      {state.status === 'success' && state.data.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">검색 결과가 없어요.</p>
      )}
      {state.status === 'success' && state.data.length > 0 && (
        <ProductResultList
          products={state.data}
          onSelect={onSelect}
          selectedIds={selectedIds}
          actionLabel={actionLabel}
          selectedLabel={selectedLabel}
        />
      )}
    </div>
  );
}
