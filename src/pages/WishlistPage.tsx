import { useMemo, useState } from 'react';
import Button from '../components/common/Button';
import WishFilterBar from '../components/wishlist/WishFilterBar';
import WishForm from '../components/wishlist/WishForm';
import WishList from '../components/wishlist/WishList';
import { useWishStore } from '../stores/wishStore';

export default function WishlistPage() {
  const items = useWishStore((s) => s.items);
  const filter = useWishStore((s) => s.filter);
  const sort = useWishStore((s) => s.sort);
  const [formOpen, setFormOpen] = useState(false);

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

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">위시리스트</h1>
        <Button variant="accent" onClick={() => setFormOpen(true)}>
          + 추가
        </Button>
      </div>

      <WishFilterBar />
      <WishList items={visibleItems} filter={filter} />

      <WishForm open={formOpen} onClose={() => setFormOpen(false)} />
    </div>
  );
}
