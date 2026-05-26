import { useState } from 'react';
import { useWishStore } from '../stores/wishStore';
import type { WishItem, WishFilter, WishSort } from '../types';

const STATUS_LABEL: Record<WishItem['status'], string> = {
  want: '원함',
  bought: '구매함',
  dropped: '포기',
};

const STATUS_COLOR: Record<WishItem['status'], string> = {
  want: 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400',
  bought: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
  dropped: 'bg-gray-100 text-gray-500 dark:bg-gray-700 dark:text-gray-400',
};

const FILTERS: { value: WishFilter; label: string }[] = [
  { value: 'all', label: '전체' },
  { value: 'want', label: '원함' },
  { value: 'bought', label: '구매함' },
  { value: 'dropped', label: '포기' },
];

const SORTS: { value: WishSort; label: string }[] = [
  { value: 'newest', label: '최신순' },
  { value: 'oldest', label: '오래된순' },
  { value: 'price-asc', label: '가격 낮은순' },
  { value: 'price-desc', label: '가격 높은순' },
];

const EMPTY_FORM = { name: '', url: '', price: '', memo: '', imageUrl: '', category: '', status: 'want' as WishItem['status'] };

export default function WishlistPage() {
  const { items, filter, sort, addItem, updateItem, deleteItem, setFilter, setSort } = useWishStore();
  const [form, setForm] = useState(EMPTY_FORM);
  const [open, setOpen] = useState(false);

  const filtered = items
    .filter((i) => filter === 'all' || i.status === filter)
    .sort((a, b) => {
      if (sort === 'newest') return b.createdAt.localeCompare(a.createdAt);
      if (sort === 'oldest') return a.createdAt.localeCompare(b.createdAt);
      const pa = a.price ?? 0, pb = b.price ?? 0;
      return sort === 'price-asc' ? pa - pb : pb - pa;
    });

  const handleAdd = () => {
    if (!form.name.trim()) return;
    addItem({
      name: form.name.trim(),
      url: form.url || undefined,
      price: form.price ? Number(form.price) : undefined,
      memo: form.memo || undefined,
      imageUrl: form.imageUrl || undefined,
      category: form.category.trim(),
      status: form.status,
    });
    setForm(EMPTY_FORM);
    setOpen(false);
  };

  return (
    <div className="max-w-2xl mx-auto p-4 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white">위시리스트</h1>
        <button
          onClick={() => setOpen(true)}
          className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors"
        >
          + 추가
        </button>
      </div>

      {/* 필터 & 정렬 */}
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex gap-1.5">
          {FILTERS.map((f) => (
            <button
              key={f.value}
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
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as WishSort)}
          className="ml-auto px-3 py-1.5 rounded-lg border border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 text-sm focus:outline-none"
        >
          {SORTS.map((s) => (
            <option key={s.value} value={s.value}>{s.label}</option>
          ))}
        </select>
      </div>

      {/* 카드 목록 */}
      <ul className="space-y-3">
        {filtered.length === 0 && (
          <li className="text-center py-12 text-gray-400">항목이 없습니다.</li>
        )}
        {filtered.map((item) => (
          <li
            key={item.id}
            className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow-sm border border-gray-200 dark:border-gray-700 flex gap-3"
          >
            {item.imageUrl && (
              <img src={item.imageUrl} alt={item.name} className="w-16 h-16 object-cover rounded-lg flex-shrink-0" />
            )}
            <div className="flex-1 min-w-0">
              <div className="flex items-start justify-between gap-2">
                <span className="font-medium text-gray-900 dark:text-white truncate">{item.name}</span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400 transition-colors flex-shrink-0"
                >
                  ✕
                </button>
              </div>
              <div className="flex flex-wrap gap-2 mt-1.5">
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${STATUS_COLOR[item.status]}`}>
                  {STATUS_LABEL[item.status]}
                </span>
                {item.category && (
                  <span className="text-xs px-2 py-0.5 bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400 rounded-full">
                    {item.category}
                  </span>
                )}
                {item.price != null && (
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ₩{item.price.toLocaleString()}
                  </span>
                )}
              </div>
              {item.memo && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1 truncate">{item.memo}</p>}
              {item.url && (
                <a href={item.url} target="_blank" rel="noopener noreferrer"
                  className="text-xs text-purple-600 dark:text-purple-400 hover:underline mt-1 block truncate">
                  링크 열기
                </a>
              )}
            </div>
            <div className="flex flex-col justify-start">
              <select
                value={item.status}
                onChange={(e) => updateItem(item.id, { status: e.target.value as WishItem['status'] })}
                className="text-xs px-2 py-1 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-700 dark:text-gray-300 focus:outline-none"
              >
                <option value="want">원함</option>
                <option value="bought">구매함</option>
                <option value="dropped">포기</option>
              </select>
            </div>
          </li>
        ))}
      </ul>

      {/* 추가 모달 */}
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-2xl p-6 w-full max-w-md space-y-3 shadow-xl">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white">항목 추가</h2>
            {([
              { key: 'name' as const, placeholder: '이름 *', type: 'text' },
              { key: 'url' as const, placeholder: 'URL (선택)', type: 'text' },
              { key: 'price' as const, placeholder: '가격 (선택)', type: 'number' },
              { key: 'imageUrl' as const, placeholder: '이미지 URL (선택)', type: 'text' },
              { key: 'category' as const, placeholder: '카테고리', type: 'text' },
              { key: 'memo' as const, placeholder: '메모', type: 'text' },
            ]).map(({ key, placeholder, type }) => (
              <input
                key={key}
                type={type}
                placeholder={placeholder}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            ))}
            <select
              value={form.status}
              onChange={(e) => setForm((f) => ({ ...f, status: e.target.value as WishItem['status'] }))}
              className="w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white text-sm focus:outline-none"
            >
              <option value="want">원함</option>
              <option value="bought">구매함</option>
              <option value="dropped">포기</option>
            </select>
            <div className="flex gap-2 pt-2">
              <button onClick={() => setOpen(false)}
                className="flex-1 px-4 py-2 rounded-lg border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 text-sm hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                취소
              </button>
              <button onClick={handleAdd}
                className="flex-1 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-sm font-medium transition-colors">
                추가
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
