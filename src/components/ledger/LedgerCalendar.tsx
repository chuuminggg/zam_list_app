import { useMemo } from 'react';
import { WEEKDAY_LABELS } from '../../constants/todo';
import { fromDateKey, monthGrid, todayKey, type DateKey } from '../../utils/date';
import { dailyTotals, formatShortWon, formatWon, type LedgerEntry, type MonthKey } from '../../utils/ledger';

interface LedgerCalendarProps {
  month: MonthKey;
  entries: LedgerEntry[];
  /** 고른 날짜. null이면 한 달 전체 */
  selected: DateKey | null;
  onSelect: (date: DateKey | null) => void;
}

/** 날짜 칸마다 그날 수입(+)·지출(−) 합계를 보여주는 달력. 같은 날을 다시 누르면 선택을 푼다. */
export default function LedgerCalendar({ month, entries, selected, onSelect }: LedgerCalendarProps) {
  const totals = useMemo(() => dailyTotals(entries), [entries]);
  const [year, monthIndex] = month.split('-').map(Number);
  const days = monthGrid(year, monthIndex - 1);
  const today = todayKey();

  return (
    <section aria-label="달력" className="select-none">
      <div className="grid grid-cols-7 text-center text-xs text-gray-400 dark:text-gray-500 mb-1">
        {WEEKDAY_LABELS.map((label, i) => (
          <div key={label} className={i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-400' : ''}>
            {label}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-y-1">
        {days.map((key) => {
          const date = fromDateKey(key);
          const inMonth = date.getMonth() === monthIndex - 1;
          // 다른 달 칸은 날짜만 흐리게 보여주고 누를 수 없다.
          if (!inMonth) {
            return (
              <div key={key} aria-hidden="true" className="h-14 pt-1 text-center text-xs text-gray-300 dark:text-gray-600">
                {date.getDate()}
              </div>
            );
          }
          const day = totals.get(key);
          const isSelected = key === selected;
          const isToday = key === today;
          const label = [
            `${date.getMonth() + 1}월 ${date.getDate()}일`,
            day?.income ? `수입 ${formatWon(day.income)}` : '',
            day?.expense ? `지출 ${formatWon(day.expense)}` : '',
          ]
            .filter(Boolean)
            .join(', ');

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(isSelected ? null : key)}
              aria-label={label}
              aria-pressed={isSelected}
              className={`h-14 flex flex-col items-center pt-1 rounded-xl transition-colors ${
                isSelected ? 'bg-indigo-50 dark:bg-indigo-500/15' : 'hover:bg-gray-100 dark:hover:bg-gray-800'
              }`}
            >
              <span
                aria-hidden="true"
                className={`text-xs leading-5 min-w-5 px-1 rounded-full ${
                  isSelected
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-gray-900 font-bold'
                    : isToday
                      ? 'text-indigo-600 dark:text-indigo-400 font-bold'
                      : 'text-gray-700 dark:text-gray-300'
                }`}
              >
                {date.getDate()}
              </span>
              <span aria-hidden="true" className="text-[10px] leading-3 font-medium tabular-nums text-blue-500 dark:text-blue-400">
                {day?.income ? `+${formatShortWon(day.income)}` : ''}
              </span>
              <span aria-hidden="true" className="text-[10px] leading-3 font-medium tabular-nums text-gray-500 dark:text-gray-400">
                {day?.expense ? `-${formatShortWon(day.expense)}` : ''}
              </span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
