import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ProductResult, SearchProviderId } from '../../../shared/api';
import { searchProducts } from '../../api/client';
import { needsRegion } from '../../constants/shopping';
import { useApiRequest } from '../../hooks/useApiRequest';
import { useSearchPrefsStore } from '../../stores/searchPrefsStore';
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
  const savedRegion = useSearchPrefsStore((s) => s.region);
  const setSavedRegion = useSearchPrefsStore((s) => s.setRegion);
  const [region, setRegion] = useState(savedRegion);
  const { state, run } = useApiRequest<ProductResult[]>();
  const withRegion = needsRegion(provider);
  const canSearch = query.trim().length >= 2 && (!withRegion || region.trim().length >= 2);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!canSearch) return;
    const q = query.trim();
    if (withRegion) {
      const r = region.trim();
      setSavedRegion(r);
      run((signal) => searchProducts(provider, q, signal, r));
    } else {
      run((signal) => searchProducts(provider, q, signal));
    }
  };

  return (
    <div className="space-y-2">
      <form onSubmit={handleSubmit} className="flex gap-2">
        {withRegion && (
          <Input
            accent="purple"
            aria-label="동네 이름"
            placeholder="동네 (예: 합정동)"
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className="text-sm w-32 flex-shrink-0"
          />
        )}
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
          disabled={!canSearch || state.status === 'loading'}
          className="flex-shrink-0"
        >
          검색
        </Button>
      </form>

      {withRegion && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          가까운 동네 매물과 다른 지역 매물이 섞여 나와요. 거리는 입력한 동네 중심 기준이에요.
        </p>
      )}
      {state.status === 'loading' && <p className="text-sm text-gray-500 dark:text-gray-400">검색 중…</p>}
      {state.status === 'error' && <p className="text-sm text-red-500">{state.message}</p>}
      {state.status === 'success' && state.data.length === 0 && (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          검색 결과가 없어요.
          {withRegion && ' 아래에서 매물 링크로 담아 보세요.'}
        </p>
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
