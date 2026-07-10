import { useMemo, useState } from 'react';
import Button from '../components/common/Button';
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
        <Button variant="accent" onClick={() => setFormTarget('new')}>
          + 추가
        </Button>
      </div>

      <WishFilterBar />
      <WishList items={visibleItems} filter={filter} onEdit={setFormTarget} />

      {/* key로 대상이 바뀔 때마다 폼 상태를 새로 초기화한다. */}
      <WishForm
        key={editingItem?.id ?? 'new'}
        open={formTarget !== null}
        item={editingItem}
        onClose={() => setFormTarget(null)}
      />
    </div>
  );
}
