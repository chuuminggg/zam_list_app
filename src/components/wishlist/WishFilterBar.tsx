import Select from '../common/Select';
import { WISH_FILTERS, WISH_SHOP_FILTERS, WISH_SORTS } from '../../constants/wish';
import { useWishStore } from '../../stores/wishStore';
import type { WishSort } from '../../types';

interface ChipProps {
  label: string;
  active: boolean;
  onClick: () => void;
}

function Chip({ label, active, onClick }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
        active
          ? 'bg-purple-600 text-white'
          : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
      }`}
    >
      {label}
    </button>
  );
}

export default function WishFilterBar() {
  const { filter, shopFilter, sort, setFilter, setShopFilter, setSort } = useWishStore();

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2 items-center">
        <div role="group" aria-label="상태 필터" className="flex gap-1.5 flex-wrap">
          {WISH_FILTERS.map((f) => (
            <Chip key={f.value} label={f.label} active={filter === f.value} onClick={() => setFilter(f.value)} />
          ))}
        </div>
        <Select
          accent="purple"
          aria-label="정렬 기준"
          value={sort}
          onChange={(e) => setSort(e.target.value as WishSort)}
          className="ml-auto w-auto py-1.5 text-sm"
        >
          {WISH_SORTS.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
      </div>
      <div role="group" aria-label="쇼핑몰 필터" className="flex gap-1.5 flex-wrap">
        {WISH_SHOP_FILTERS.map((f) => (
          <Chip key={f.value} label={f.label} active={shopFilter === f.value} onClick={() => setShopFilter(f.value)} />
        ))}
      </div>
    </div>
  );
}
