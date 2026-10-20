import { useCallback, useEffect, useRef, useState } from 'react';
import Button from '../common/Button';
import Markdown from '../common/Markdown';
import Modal from '../common/Modal';
import { UNCATEGORIZED_NAME } from '../../constants/todo';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTodoStore } from '../../stores/todoStore';
import { MAX_NOTE_LENGTH } from '../../../shared/data';
import type { Todo } from '../../types';
import { formatDateHeading } from '../../utils/date';
import {
  isBlankNote,
  JOURNAL_LABELS,
  JOURNAL_TEMPLATES,
  journalTypeOf,
  moodOf,
  MOODS,
  noteToSave,
  setMood,
  toggleTaskLine,
} from '../../utils/journal';
import { todoDate } from '../../utils/todo';

interface JournalModalProps {
  todo: Todo;
  onClose: () => void;
}

/** 입력이 멈추고 이만큼 지나면 저장한다 */
const SAVE_DELAY_MS = 800;

/** 할 일 하나의 일지. 카테고리 형식(회사 일지 / 일기)에 맞는 템플릿으로 시작하고 자동 저장한다. */
export default function JournalModal({ todo, onClose }: JournalModalProps) {
  const updateTodo = useTodoStore((s) => s.updateTodo);
  const category = useCategoryStore((s) => s.categories.find((c) => c.id === todo.categoryId));
  const type = journalTypeOf(category);
  const [title, setTitle] = useState(todo.title);
  const [draft, setDraft] = useState(() => todo.note || JOURNAL_TEMPLATES[type]);
  const [preview, setPreview] = useState(false);
  /** 마지막으로 저장한 값. 같으면 다시 보내지 않는다. */
  const saved = useRef(todo.note);

  const save = useCallback(
    (text: string) => {
      const next = noteToSave(text);
      if (next === saved.current) return;
      saved.current = next;
      updateTodo(todo.id, { note: next });
    },
    [todo.id, updateTodo]
  );

  useEffect(() => {
    const timer = setTimeout(() => save(draft), SAVE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [draft, save]);

  const commitTitle = () => {
    const trimmed = title.trim();
    if (trimmed && trimmed !== todo.title) updateTodo(todo.id, { title: trimmed });
    else setTitle(todo.title);
  };

  const close = () => {
    save(draft);
    commitTitle();
    onClose();
  };

  const mood = type === 'diary' ? moodOf(draft) : undefined;

  return (
    <Modal open title={JOURNAL_LABELS[type]} placement="full" size="lg" onClose={close}>
      <input
        type="text"
        aria-label="할 일 제목"
        value={title}
        maxLength={500}
        onChange={(e) => setTitle(e.target.value)}
        onBlur={commitTitle}
        onKeyDown={(e) => e.key === 'Enter' && !e.nativeEvent.isComposing && e.currentTarget.blur()}
        className="w-full bg-transparent text-xl font-bold text-gray-900 dark:text-white border-b border-transparent focus:border-indigo-500 focus:outline-none py-1"
      />
      <p className="text-sm text-gray-500 dark:text-gray-400">
        {formatDateHeading(todoDate(todo))} · {category?.name ?? UNCATEGORIZED_NAME}
        {todo.done && ' · 완료'}
      </p>

      <div className="flex items-center gap-2 flex-wrap">
        {type === 'diary' && (
          <div role="radiogroup" aria-label="기분" className="flex gap-1">
            {MOODS.map((m) => (
              <button
                key={m}
                type="button"
                role="radio"
                aria-checked={mood === m}
                aria-label={`기분 ${m}`}
                onClick={() => setDraft((d) => setMood(d, m))}
                className={`w-8 h-8 rounded-full text-lg transition-transform ${
                  mood === m ? 'bg-indigo-100 dark:bg-indigo-900/40 scale-110' : 'hover:scale-110'
                }`}
              >
                {m}
              </button>
            ))}
          </div>
        )}
        <div className="ml-auto flex gap-1">
          <Button size="sm" variant={preview ? 'toggle' : 'toggle-active'} onClick={() => setPreview(false)}>
            편집
          </Button>
          <Button size="sm" variant={preview ? 'toggle-active' : 'toggle'} onClick={() => setPreview(true)}>
            미리보기
          </Button>
        </div>
      </div>

      {preview ? (
        <div className="min-h-[18rem] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
          {isBlankNote(draft) ? (
            <p className="text-sm text-gray-400 dark:text-gray-500">아직 적은 내용이 없어요.</p>
          ) : (
            <Markdown text={draft} onToggleTask={(line) => setDraft((d) => toggleTaskLine(d, line))} />
          )}
        </div>
      ) : (
        <textarea
          aria-label="일지 내용"
          autoFocus
          value={draft}
          maxLength={MAX_NOTE_LENGTH}
          onChange={(e) => setDraft(e.target.value)}
          rows={16}
          className="w-full min-h-[18rem] rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900 p-4 text-sm leading-relaxed text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
        />
      )}

      <div className="flex items-center justify-between gap-2 text-xs text-gray-400 dark:text-gray-500">
        <span>마크다운: ## 제목 · - 목록 · - [ ] 체크 · **굵게** · [글](링크) — 자동 저장돼요</span>
        <Button variant="ghost" onClick={close}>
          닫기
        </Button>
      </div>
    </Modal>
  );
}
