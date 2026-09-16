import type { StockResult } from '../../../shared/api';
import { STOCK_STATUS_TONE } from '../../constants/shopping';
import Badge from '../common/Badge';

export default function StoreStockList({ result }: { result: StockResult }) {
  return (
    <div className="space-y-2">
      {result.notice && (
        <p className="text-xs text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-900/20 rounded-lg p-2">
          {result.notice}
        </p>
      )}
      {result.stores.length === 0 ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">해당 키워드로 찾은 매장이 없어요.</p>
      ) : (
        <ul className="space-y-1.5 max-h-72 overflow-y-auto">
          {result.stores.map((store) => (
            <li
              key={store.storeCode}
              className="flex items-start justify-between gap-2 p-2 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-white">{store.name}</p>
                {store.address && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{store.address}</p>
                )}
                {store.openTime && store.closeTime && (
                  <p className="text-xs text-gray-400 dark:text-gray-500">
                    {store.openTime} ~ {store.closeTime}
                  </p>
                )}
              </div>
              <Badge tone={STOCK_STATUS_TONE[store.status]}>{store.label}</Badge>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-right">
        {new Date(result.checkedAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })} 기준
      </p>
    </div>
  );
}
