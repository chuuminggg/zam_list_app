import { useEffect, useMemo, useState } from 'react';
import type { DealProviderId, ProductResult } from '../../../shared/api';
import { fetchDeals } from '../../api/client';
import { useApiRequest } from '../../hooks/useApiRequest';
import Input from '../common/Input';
import ProductResultList from './ProductResultList';

interface DealPickerProps {
  provider: DealProviderId;
  onSelect: (product: ProductResult) => void;
  selectedIds?: ReadonlySet<string>;
  actionLabel?: string;
  selectedLabel?: string;
}

/**
 * 오늘의집 오늘의딜처럼 검색어 없이 내려오는 특가 목록. 열자마자 불러오고,
 * 입력한 글자는 서버에 보내지 않고 받은 목록 안에서만 거른다.
 */
export default function DealPicker({ provider, onSelect, selectedIds, actionLabel, selectedLabel }: DealPickerProps) {
  const [filter, setFilter] = useState('');
  const { state, run } = useApiRequest<ProductResult[]>();

  useEffect(() => {
    run((signal) => fetchDeals(provider, signal));
  }, [provider, run]);

  const deals = useMemo(() => {
    if (state.status !== 'success') return [];
    const keyword = filter.trim().toLowerCase();
    return keyword ? state.data.filter((p) => p.name.toLowerCase().includes(keyword)) : state.data;
  }, [state, filter]);

  return (
    <div className="space-y-2">
      <Input
        accent="purple"
        aria-label="특가 목록에서 찾기"
        placeholder="오늘의딜 목록에서 찾기"
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="text-sm"
      />

      {state.status === 'loading' && <p className="text-sm text-gray-500 dark:text-gray-400">오늘의딜 불러오는 중…</p>}
      {state.status === 'error' && <p className="text-sm text-red-500">{state.message}</p>}
      {state.status === 'success' && (
        <p className="text-xs text-gray-500 dark:text-gray-400">
          {filter.trim() ? `${state.data.length}개 중 ${deals.length}개` : `오늘의딜 ${state.data.length}개`} · 가격·쿠폰은 조회
          시점 기준이라 바뀔 수 있어요
        </p>
      )}
      {state.status === 'success' && deals.length > 0 && (
        <ProductResultList
          products={deals}
          onSelect={onSelect}
          selectedIds={selectedIds}
          actionLabel={actionLabel}
          selectedLabel={selectedLabel}
        />
      )}
    </div>
  );
}
