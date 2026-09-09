import EmptyState from '../common/EmptyState';
import WishCard from './WishCard';
import type { WishItem, WishFilter } from '../../types';

const EMPTY_COPY: Record<WishFilter, { title: string; description: string }> = {
  all: { title: '위시리스트가 비어 있어요', description: '상품 검색으로 다이소·올리브영 상품을 담거나, + 추가로 직접 적어보세요.' },
  want: { title: '원하는 항목이 없어요', description: '새 항목을 추가해 보세요.' },
  bought: { title: '구매한 항목이 없어요', description: '구매했다면 상태를 바꿔보세요.' },
  dropped: { title: '포기한 항목이 없어요', description: '' },
};

interface WishListProps {
  items: WishItem[];
  filter: WishFilter;
  onEdit: (item: WishItem) => void;
  onCheckStock: (item: WishItem) => void;
}

export default function WishList({ items, filter, onEdit, onCheckStock }: WishListProps) {
  if (items.length === 0) {
    return <EmptyState icon="🎁" {...EMPTY_COPY[filter]} />;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => (
        <WishCard
          key={item.id}
          item={item}
          onEdit={() => onEdit(item)}
          onCheckStock={() => onCheckStock(item)}
        />
      ))}
    </ul>
  );
}
