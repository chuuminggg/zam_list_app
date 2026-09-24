import Badge from '../common/Badge';
import IconButton from '../common/IconButton';
import Select from '../common/Select';
import { PROVIDER_LABEL } from '../../../shared/api';
import { supportsStockCheck } from '../../constants/shopping';
import { STATUSES, STATUS_LABEL, STATUS_TONE } from '../../constants/wish';
import { useWishStore } from '../../stores/wishStore';
import type { WishItem } from '../../types';
import { canRefresh, priceChange } from '../../utils/wishRefresh';

const SOURCE_TONE = 'bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-400';
const SOLD_OUT_TONE = 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';

/** '9/24 06:12 확인' */
function formatCheckedAt(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  const time = date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit', hour12: false });
  return `${date.getMonth() + 1}/${date.getDate()} ${time} 확인`;
}

interface WishCardProps {
  item: WishItem;
  onEdit: () => void;
  onCheckStock: () => void;
  onRefresh: () => void;
  refreshing?: boolean;
  refreshError?: string;
}

export default function WishCard({
  item,
  onEdit,
  onCheckStock,
  onRefresh,
  refreshing = false,
  refreshError,
}: WishCardProps) {
  const updateItem = useWishStore((s) => s.updateItem);
  const deleteItem = useWishStore((s) => s.deleteItem);
  const sourceLabel = item.source ? PROVIDER_LABEL[item.source.provider] : undefined;
  // 매장 재고는 다이소·올리브영에서 검색해 담은 상품만 확인할 수 있다.
  const canCheckStock = item.source != null && supportsStockCheck(item.source.provider);
  const change = priceChange(item);

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
            {canRefresh(item) && (
              <IconButton
                label={refreshing ? '가격 확인 중' : '가격·품절 다시 확인'}
                disabled={refreshing}
                onClick={onRefresh}
              >
                <span className={refreshing ? 'inline-block animate-spin' : undefined}>↻</span>
              </IconButton>
            )}
            {canCheckStock && (
              <IconButton label="매장 재고 확인" onClick={onCheckStock}>
                🏪
              </IconButton>
            )}
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
          {item.source && <Badge tone={SOURCE_TONE}>{PROVIDER_LABEL[item.source.provider]}</Badge>}
          {item.soldOut && <Badge tone={SOLD_OUT_TONE}>품절</Badge>}
          {item.category && item.category !== sourceLabel && <Badge>{item.category}</Badge>}
          {item.price != null && (
            <span className="text-xs text-gray-500 dark:text-gray-400">
              ₩{item.price.toLocaleString()}
            </span>
          )}
          {change && (
            <span
              className={`text-xs font-medium ${
                change.diff < 0
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-red-600 dark:text-red-400'
              }`}
              title={`이전 ₩${change.previous.toLocaleString()}`}
            >
              {change.diff < 0 ? '▼' : '▲'} {Math.abs(change.diff).toLocaleString()}원
            </span>
          )}
          {item.lastCheckedAt && (
            <span className="text-xs text-gray-400 dark:text-gray-500">
              {formatCheckedAt(item.lastCheckedAt)}
            </span>
          )}
        </div>
        {refreshError && (
          <p className="text-xs text-red-600 dark:text-red-400 mt-1">{refreshError}</p>
        )}
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
            {sourceLabel ? `${sourceLabel}에서 보기` : '링크 열기'}
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
