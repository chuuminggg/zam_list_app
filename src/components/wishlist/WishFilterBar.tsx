import Select from '../common/Select';
import { WISH_FILTERS, WISH_SORTS } from '../../constants/wish';
import { useWishStore } from '../../stores/wishStore';
import type { WishSort } from '../../types';

export default function WishFilterBar() {
  const { filter, sort, setFilter, setSort } = useWishStore();

  return (
    <div className="flex flex-wrap gap-2 items-center">
      <div className="flex gap-1.5 flex-wrap">
        {WISH_FILTERS.map((f) => (
          <button
            key={f.value}
            type="button"
            aria-pressed={filter === f.value}
            onClick={() => setFilter(f.value)}
            className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
              filter === f.value
                ? 'bg-purple-600 text-white'
                : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
            }`}
          >
            {f.label}
          </button>
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
  );
}
