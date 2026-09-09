import { useMemo, useState } from 'react';
import Button from '../components/common/Button';
import ProductSearchModal from '../components/shopping/ProductSearchModal';
import StockCheckModal from '../components/shopping/StockCheckModal';
import WishFilterBar from '../components/wishlist/WishFilterBar';
import WishForm from '../components/wishlist/WishForm';
import WishList from '../components/wishlist/WishList';
import { useWishStore } from '../stores/wishStore';
import type { WishItem } from '../types';

/** 폼이 닫혀 있으면 null, 추가 모드면 'new', 수정 모드면 대상 항목. */
type FormTarget = WishItem | 'new' | null;

export default function WishlistPage() {
  const items = useWishStore((s) => s.items);
  const filter = useWishStore((s) => s.filter);
  const sort = useWishStore((s) => s.sort);
  const [formTarget, setFormTarget] = useState<FormTarget>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  // 모달 안에서 항목이 갱신(stockLink)되므로 스냅샷 대신 id로 최신 항목을 찾는다.
  const [stockTargetId, setStockTargetId] = useState<string | null>(null);
  const stockItem = items.find((i) => i.id === stockTargetId);

  const visibleItems = useMemo(
    () =>
      items
        .filter((i) => filter === 'all' || i.status === filter)
        .sort((a, b) => {
          if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt);
          if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
          const pa = a.price ?? 0;
          const pb = b.price ?? 0;
          return sort === 'price-asc' ? pa - pb : pb - pa;
        }),
    [items, filter, sort]
  );

  const editingItem = formTarget && formTarget !== 'new' ? formTarget : undefined;

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">위시리스트</h1>
        <div className="flex gap-2">
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
        onEdit={setFormTarget}
        onCheckStock={(item) => setStockTargetId(item.id)}
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
