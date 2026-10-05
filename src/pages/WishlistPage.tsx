import { useMemo, useState } from 'react';
import Button from '../components/common/Button';
import ProductSearchModal from '../components/shopping/ProductSearchModal';
import StockCheckModal from '../components/shopping/StockCheckModal';
import WishFilterBar from '../components/wishlist/WishFilterBar';
import WishForm from '../components/wishlist/WishForm';
import WishList from '../components/wishlist/WishList';
import { useWishRefresh } from '../hooks/useWishRefresh';
import { useWishStore } from '../stores/wishStore';
import type { WishItem } from '../types';
import { matchesShop } from '../constants/wish';
import { canRefresh, isFresh, priceChange } from '../utils/wishRefresh';

/** 폼이 닫혀 있으면 null, 추가 모드면 'new', 수정 모드면 대상 항목. */
type FormTarget = WishItem | 'new' | null;

export default function WishlistPage() {
  const items = useWishStore((s) => s.items);
  const filter = useWishStore((s) => s.filter);
  const shopFilter = useWishStore((s) => s.shopFilter);
  const sort = useWishStore((s) => s.sort);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // 모달 안에서 항목이 갱신(stockLink)되므로 스냅샷 대신 id로 최신 항목을 찾는다.
  const [stockTargetId, setStockTargetId] = useState<string | null>(null);
  const stockItem = items.find((i) => i.id === stockTargetId);
  const { pending, errors, running, refreshItem, refreshAll } = useWishRefresh();
  // 최근에 확인한 항목은 건너뛰므로, 다시 확인할 게 남아 있을 때만 버튼을 켠다.
  const refreshableCount = items.filter((i) => canRefresh(i) && !isFresh(i)).length;

  const visibleItems = useMemo(
    () =>
      items
        .filter((i) => (filter === 'all' || i.status === filter) && matchesShop(i, shopFilter))
        .sort((a, b) => {
          if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt);
          if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
          // 하락순은 많이 내린 항목(변동액이 작은 음수)부터. 변동 없는 항목은 뒤로.
          if (sort === 'price-drop') return (priceChange(a)?.diff ?? 0) - (priceChange(b)?.diff ?? 0);
          const pa = a.price ?? 0;
          const pb = b.price ?? 0;
          return sort === 'price-asc' ? pa - pb : pb - pa;
        }),
    [items, filter, shopFilter, sort]
  );

  const editingItem = formTarget && formTarget !== 'new' ? formTarget : undefined;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">위시리스트</h1>
        <div className="flex gap-2">
          {items.some(canRefresh) && (
            <Button
              variant="ghost"
              disabled={running || refreshableCount === 0}
              title={refreshableCount === 0 ? '방금 확인했어요. 10분 뒤에 다시 확인할 수 있어요.' : undefined}
              onClick={refreshAll}
            >
              {running ? '확인 중…' : `↻ 전체 새로고침${refreshableCount > 0 ? ` (${refreshableCount})` : ''}`}
            </Button>
          )}
          <Button variant="ghost" onClick={() => setSearchOpen(true)}>
            🔍 상품 검색
          </Button>
          <Button variant="accent" onClick={() => setFormTarget('new')}>
            + 추가
          </Button>
        </div>
      </div>

      <WishFilterBar />
      <WishList
        items={visibleItems}
        filter={filter}
        shopFilter={shopFilter}
        onEdit={setFormTarget}
        onCheckStock={(item) => setStockTargetId(item.id)}
        onRefresh={refreshItem}
        refreshing={pending}
        refreshErrors={errors}
      />

      {/* key로 대상이 바뀔 때마다 폼 상태를 새로 초기화한다. */}
      <WishForm
        key={editingItem?.id ?? 'new'}
        open={formTarget !== null}
        item={editingItem}
        onClose={() => setFormTarget(null)}
      />

      {searchOpen && <ProductSearchModal onClose={() => setSearchOpen(false)} />}

      {stockItem && (
        <StockCheckModal key={stockItem.id} item={stockItem} onClose={() => setStockTargetId(null)} />
      )}
    </div>
  );
}
