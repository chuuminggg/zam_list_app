import { useMemo, useState } from 'react';
import IconButton from '../common/IconButton';
import { WEEKDAY_LABELS } from '../../constants/todo';
import type { Todo } from '../../types';
import { fromDateKey, monthGrid, todayKey, type DateKey } from '../../utils/date';
import { todoDate } from '../../utils/todo';

interface MonthCalendarProps {
  selected: DateKey;
  onSelect: (date: DateKey) => void;
  todos: Todo[];
}

interface DayStat {
  total: number;
  done: number;
}

const monthOf = (key: DateKey) => {
  const date = fromDateKey(key);
  return { year: date.getFullYear(), month: date.getMonth() };
};

export default function MonthCalendar({ selected, onSelect, todos }: MonthCalendarProps) {
  const [view, setView] = useState(() => monthOf(selected));
  // 바깥에서 다른 달의 날짜를 고르면 그 달로 이동한다.
  const [prevSelected, setPrevSelected] = useState(selected);
  if (prevSelected !== selected) {
    setPrevSelected(selected);
    setView(monthOf(selected));
  }

  const stats = useMemo(() => {
    const map = new Map<DateKey, DayStat>();
    for (const todo of todos) {
      const key = todoDate(todo);
      const stat = map.get(key) ?? { total: 0, done: 0 };
      stat.total += 1;
      if (todo.done) stat.done += 1;
      map.set(key, stat);
    }
    return map;
  }, [todos]);

  const days = monthGrid(view.year, view.month);
  const today = todayKey();
  const shiftMonth = (offset: number) =>
    setView(({ year, month }) => {
      const date = new Date(year, month + offset, 1);
      return { year: date.getFullYear(), month: date.getMonth() };
    });

  return (
    <section aria-label="달력" className="select-none">
      <div className="flex items-center justify-between mb-3 px-1">
        <h2 className="font-bold text-gray-900 dark:text-white">
          {view.year}년 {view.month + 1}월
        </h2>
        <div className="flex items-center gap-1">
          <IconButton label="이전 달" className="px-2 text-lg" onClick={() => shiftMonth(-1)}>
            ‹
          </IconButton>
          <IconButton label="다음 달" className="px-2 text-lg" onClick={() => shiftMonth(1)}>
            ›
          </IconButton>
        </div>
      </div>

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
          const inMonth = date.getMonth() === view.month;
          const stat = stats.get(key);
          const remaining = stat ? stat.total - stat.done : 0;
          const allDone = !!stat && remaining === 0;
          const isSelected = key === selected;
          const isToday = key === today;

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelect(key)}
              aria-label={`${date.getMonth() + 1}월 ${date.getDate()}일${
                stat ? `, 할 일 ${stat.total}개 중 ${stat.done}개 완료` : ''
              }`}
              aria-pressed={isSelected}
              className={`flex flex-col items-center gap-1 py-1 rounded-lg transition-colors hover:bg-gray-100 dark:hover:bg-gray-800 ${
                inMonth ? '' : 'opacity-35'
              }`}
            >
              <span
                aria-hidden="true"
                className={`w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-semibold transition-colors ${
                  allDone
                    ? 'bg-indigo-500 text-white'
                    : remaining > 0
                      ? 'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-200'
                      : 'bg-gray-100 dark:bg-gray-800'
                }`}
              >
                {allDone ? '✓' : remaining > 0 ? remaining : ''}
              </span>
              <span
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
            </button>
          );
        })}
      </div>
    </section>
  );
}
