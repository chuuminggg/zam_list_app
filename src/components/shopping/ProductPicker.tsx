import { useState } from 'react';
import type { FormEvent } from 'react';
import type { ProductResult, StockProviderId } from '../../../shared/api';
import { searchProducts } from '../../api/client';
import { useApiRequest } from '../../hooks/useApiRequest';
import Badge from '../common/Badge';
import Button from '../common/Button';
import Input from '../common/Input';

interface ProductPickerProps {
  provider: StockProviderId;
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
        <ul className="space-y-1.5 max-h-80 overflow-y-auto">
          {state.data.map((product) => {
            const selected = selectedIds?.has(product.externalId) ?? false;
            return (
              <li key={product.externalId}>
                <button
                  type="button"
                  disabled={selected}
                  onClick={() => onSelect(product)}
                  className="w-full flex items-center gap-3 p-2 rounded-lg text-left border border-gray-200 dark:border-gray-700 enabled:hover:border-purple-400 dark:enabled:hover:border-purple-500 disabled:opacity-60 transition-colors"
                >
                  {product.imageUrl && (
                    <img
                      src={product.imageUrl}
                      alt=""
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      className="w-12 h-12 object-cover rounded flex-shrink-0"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-gray-900 dark:text-white line-clamp-2">{product.name}</p>
                    <div className="flex flex-wrap items-center gap-1.5 mt-0.5">
                      {product.price != null && (
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ₩{product.price.toLocaleString()}
                        </span>
                      )}
                      {product.badges.map((badge) => (
                        <Badge key={badge}>{badge}</Badge>
                      ))}
                    </div>
                  </div>
                  {actionLabel && (
                    <span
                      className={`text-xs font-medium flex-shrink-0 ${
                        selected ? 'text-gray-400 dark:text-gray-500' : 'text-purple-600 dark:text-purple-400'
                      }`}
                    >
                      {selected ? selectedLabel : actionLabel}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
