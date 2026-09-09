import Badge from '../common/Badge';
import IconButton from '../common/IconButton';
import Select from '../common/Select';
import { STATUSES, STATUS_LABEL, STATUS_TONE } from '../../constants/wish';
import { useWishStore } from '../../stores/wishStore';
import type { WishItem } from '../../types';

interface WishCardProps {
  item: WishItem;
  onEdit: () => void;
  onCheckStock: () => void;
}

export default function WishCard({ item, onEdit, onCheckStock }: WishCardProps) {
  const updateItem = useWishStore((s) => s.updateItem);
  const deleteItem = useWishStore((s) => s.deleteItem);

  return (
    <li className="bg-white dark:bg-gray-800 rounded-xl p-3 sm:p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex gap-3 transition-colors hover:border-gray-300 dark:hover:border-gray-600 animate-fade-in">
      {item.imageUrl && (
        <img
          src={item.imageUrl}
          alt={item.name}
          loading="lazy"
          className="w-16 h-16 object-cover rounded-lg flex-shrink-0"
        />
      )}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <button
            type="button"
            onClick={onEdit}
            className="font-medium text-gray-900 dark:text-white truncate text-left"
          >
            {item.name}
          </button>
          <div className="flex items-center flex-shrink-0">
            <IconButton label="매장 재고 확인" onClick={onCheckStock}>
              🏪
            </IconButton>
            <IconButton label="수정" onClick={onEdit}>
              ✎
            </IconButton>
            <IconButton label="삭제" tone="danger" onClick={() => deleteItem(item.id)}>
              ✕
            </IconButton>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2 mt-1.5">
          <Badge tone={STATUS_TONE[item.status]}>{STATUS_LABEL[item.status]}</Badge>
          {item.category && <Badge>{item.category}</Badge>}
          {item.price != null && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ₩{item.price.toLocaleString()}
            </span>
          )}
        </div>
        {item.memo && (
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{item.memo}</p>
        )}
        {item.url && (
          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-1 block truncate"
          >
            링크 열기
          </a>
        )}
      </div>
      <Select
        accent="purple"
        aria-label={`${item.name} 상태 변경`}
        value={item.status}
        onChange={(e) => updateItem(item.id, { status: e.target.value as WishItem['status'] })}
        className="w-auto self-start text-xs px-2 py-1"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {STATUS_LABEL[s]}
          </option>
        ))}
      </Select>
    </li>
  );
}
