import type { LedgerCategory } from '../../constants/ledger';

const SIZE = {
  sm: 'w-8 h-8 text-base',
  md: 'w-10 h-10 text-lg',
};

/** 카테고리 색을 옅게 깐 원 안의 이모지 */
export default function CategoryIcon({ category, size = 'md' }: { category: LedgerCategory; size?: keyof typeof SIZE }) {
  return (
    <span
      aria-hidden="true"
      className={`${SIZE[size]} shrink-0 rounded-full flex items-center justify-center`}
      // #rrggbb 뒤에 알파(약 14%)를 붙여 옅은 배경을 만든다.
      style={{ backgroundColor: `${category.color}24` }}
    >
      {category.icon}
    </span>
  );
}
