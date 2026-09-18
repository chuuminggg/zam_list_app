import Button from '../common/Button';
import IconButton from '../common/IconButton';
import { addDays, formatDateHeading, todayKey, type DateKey } from '../../utils/date';

interface DayHeaderProps {
  date: DateKey;
  onChange: (date: DateKey) => void;
  total: number;
  done: number;
  onOpenCalendar: () => void;
  onManageCategories: () => void;
}

export default function DayHeader({
  date,
  onChange,
  total,
  done,
  onOpenCalendar,
  onManageCategories,
}: DayHeaderProps) {
  const isToday = date === todayKey();

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <div className="flex items-center gap-1 min-w-0">
        <IconButton label="이전 날" className="px-2 text-xl" onClick={() => onChange(addDays(date, -1))}>
          ‹
        </IconButton>
        <h1 className="text-xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
          {formatDateHeading(date)}
        </h1>
        <IconButton label="다음 날" className="px-2 text-xl" onClick={() => onChange(addDays(date, 1))}>
          ›
        </IconButton>
      </div>
      {total > 0 && (
        <span className="text-sm text-gray-400 dark:text-gray-500" aria-label={`${total}개 중 ${done}개 완료`}>
          {done}/{total}
        </span>
      )}

      <div className="ml-auto flex items-center gap-1.5">
        {!isToday && (
          <Button size="sm" variant="ghost" onClick={() => onChange(todayKey())}>
            오늘
          </Button>
        )}
        <Button size="sm" variant="ghost" className="md:hidden" onClick={onOpenCalendar}>
          캘린더
        </Button>
        <Button size="sm" variant="ghost" onClick={onManageCategories}>
          카테고리
        </Button>
      </div>
    </div>
  );
}
