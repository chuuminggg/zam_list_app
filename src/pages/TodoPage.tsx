import { useEffect, useMemo, useState } from 'react';
import Button from '../components/common/Button';
import EmptyState from '../components/common/EmptyState';
import Modal from '../components/common/Modal';
import CategoryManagerModal from '../components/todo/CategoryManagerModal';
import CategorySection from '../components/todo/CategorySection';
import DayHeader from '../components/todo/DayHeader';
import MonthCalendar from '../components/todo/MonthCalendar';
import { UNCATEGORIZED_COLOR, UNCATEGORIZED_NAME } from '../constants/todo';
import { sortCategories, useCategoryStore } from '../stores/categoryStore';
import { useSyncStore } from '../stores/syncStore';
import { useTodoStore } from '../stores/todoStore';
import { migrateLegacyTodos } from '../sync/migrateTodos';
import { todayKey, type DateKey } from '../utils/date';
import { todoDate } from '../utils/todo';

export default function TodoPage() {
  const todos = useTodoStore((s) => s.todos);
  const categories = useCategoryStore((s) => s.categories);
  const syncStatus = useSyncStore((s) => s.status);
  const [date, setDate] = useState<DateKey>(todayKey);
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [managerOpen, setManagerOpen] = useState(false);

  // 서버 데이터를 받은 뒤(또는 로그인 전·로컬 전용일 때) 예전 형식 할 일을 옮긴다.
  // 불러오는 중에 바꾸면 서버 데이터로 덮어써지므로 기다린다.
  useEffect(() => {
    if (syncStatus === 'ready' || syncStatus === 'signedOut' || syncStatus === 'unavailable') migrateLegacyTodos();
  }, [syncStatus, todos]);

  const sorted = useMemo(() => sortCategories(categories), [categories]);
  const dayTodos = useMemo(() => todos.filter((t) => todoDate(t) === date), [todos, date]);

  const sections = useMemo(() => {
    const known = new Set(sorted.map((c) => c.id));
    const list = sorted.map((c) => ({
      categoryId: c.id as string | null,
      name: c.name,
      color: c.color,
      todos: dayTodos.filter((t) => t.categoryId === c.id),
    }));
    const orphans = dayTodos.filter((t) => !t.categoryId || !known.has(t.categoryId));
    if (orphans.length > 0) {
      list.push({ categoryId: null, name: UNCATEGORIZED_NAME, color: UNCATEGORIZED_COLOR, todos: orphans });
    }
    return list;
  }, [sorted, dayTodos]);

  const doneCount = dayTodos.filter((t) => t.done).length;

  return (
    <div className="max-w-5xl mx-auto px-4 md:grid md:grid-cols-[280px_1fr] lg:grid-cols-[320px_1fr] md:gap-8 md:items-start">
      <aside className="hidden md:block sticky top-20 bg-white dark:bg-gray-800 rounded-2xl p-4 border border-gray-200 dark:border-gray-700 shadow-sm">
        <MonthCalendar selected={date} onSelect={setDate} todos={todos} />
      </aside>

      <div className="space-y-6 min-w-0">
        <DayHeader
          date={date}
          onChange={setDate}
          total={dayTodos.length}
          done={doneCount}
          onOpenCalendar={() => setCalendarOpen(true)}
          onManageCategories={() => setManagerOpen(true)}
        />

        {sections.length === 0 ? (
          <div className="text-center">
            <EmptyState
              icon="🗂️"
              title="카테고리를 먼저 만들어 보세요"
              description="카테고리별로 할 일을 나눠 담을 수 있어요."
            />
            <Button onClick={() => setManagerOpen(true)}>카테고리 만들기</Button>
          </div>
        ) : (
          <div className="space-y-6">
            {sections.map((section) => (
              <CategorySection key={section.categoryId ?? 'uncategorized'} date={date} {...section} />
            ))}
          </div>
        )}
      </div>

      <Modal open={calendarOpen} title="캘린더" placement="bottom" onClose={() => setCalendarOpen(false)}>
        <MonthCalendar
          selected={date}
          onSelect={(next) => {
            setDate(next);
            setCalendarOpen(false);
          }}
          todos={todos}
        />
      </Modal>

      <CategoryManagerModal open={managerOpen} onClose={() => setManagerOpen(false)} />
    </div>
  );
}
