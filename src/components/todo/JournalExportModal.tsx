import { useMemo, useState } from 'react';
import Button from '../common/Button';
import IconButton from '../common/IconButton';
import Markdown from '../common/Markdown';
import Modal from '../common/Modal';
import { useCategoryStore } from '../../stores/categoryStore';
import { useTodoStore } from '../../stores/todoStore';
import { useToastStore } from '../../stores/toastStore';
import type { JournalType } from '../../types';
import type { DateKey } from '../../utils/date';
import { JOURNAL_LABELS } from '../../utils/journal';
import {
  buildJournalExport,
  exportFileName,
  periodLabel,
  periodOf,
  shiftPeriod,
  type PeriodKind,
} from '../../utils/journalExport';

interface JournalExportModalProps {
  /** 처음 보여 줄 기간이 속한 날짜 (할 일 페이지에서 고른 날짜) */
  date: DateKey;
  onClose: () => void;
}

const KINDS: { value: PeriodKind; label: string }[] = [
  { value: 'week', label: '주간' },
  { value: 'month', label: '월간' },
];

const TYPES: JournalType[] = ['work', 'diary'];

/** 주간·월간 일지를 형식별로 모아 마크다운으로 복사하거나 내려받는다. */
export default function JournalExportModal({ date, onClose }: JournalExportModalProps) {
  const todos = useTodoStore((s) => s.todos);
  const categories = useCategoryStore((s) => s.categories);
  const showToast = useToastStore((s) => s.showToast);
  const [type, setType] = useState<JournalType>('work');
  const [period, setPeriod] = useState(() => periodOf('week', date));

  const markdown = useMemo(
    () => buildJournalExport({ todos, categories, type, period }),
    [todos, categories, type, period]
  );

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(markdown);
      showToast({ message: '마크다운을 복사했어요.' });
    } catch {
      showToast({ message: '복사하지 못했어요. 다운로드를 이용해 주세요.' });
    }
  };

  const download = () => {
    const url = URL.createObjectURL(new Blob([markdown], { type: 'text/markdown;charset=utf-8' }));
    const link = document.createElement('a');
    link.href = url;
    link.download = exportFileName(type, period);
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Modal open title="일지 모아보기" placement="full" size="lg" onClose={onClose}>
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1">
          {KINDS.map((k) => (
            <Button
              key={k.value}
              size="sm"
              variant={period.kind === k.value ? 'toggle-active' : 'toggle'}
              aria-pressed={period.kind === k.value}
              onClick={() => setPeriod(periodOf(k.value, period.start))}
            >
              {k.label}
            </Button>
          ))}
        </div>
        <div className="flex gap-1">
          {TYPES.map((t) => (
            <Button
              key={t}
              size="sm"
              variant={type === t ? 'toggle-active' : 'toggle'}
              aria-pressed={type === t}
              onClick={() => setType(t)}
            >
              {JOURNAL_LABELS[t]}
            </Button>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-1">
        <IconButton label="이전 기간" className="px-2 text-xl" onClick={() => setPeriod(shiftPeriod(period, -1))}>
          ‹
        </IconButton>
        <span className="text-sm font-semibold text-gray-900 dark:text-white">{periodLabel(period)}</span>
        <IconButton label="다음 기간" className="px-2 text-xl" onClick={() => setPeriod(shiftPeriod(period, 1))}>
          ›
        </IconButton>
      </div>

      <div className="min-h-[18rem] rounded-xl border border-gray-200 dark:border-gray-700 p-4">
        {markdown ? (
          <Markdown text={markdown} />
        ) : (
          <p className="text-sm text-gray-400 dark:text-gray-500">
            이 기간에 모을 {JOURNAL_LABELS[type]}가 없어요. 일지를 쓰거나 완료한 할 일이 여기에 모여요.
          </p>
        )}
      </div>

      <div className="flex justify-end gap-2">
        <Button variant="ghost" onClick={onClose}>
          닫기
        </Button>
        <Button variant="ghost" disabled={!markdown} onClick={download}>
          .md 다운로드
        </Button>
        <Button disabled={!markdown} onClick={copy}>
          마크다운 복사
        </Button>
      </div>
    </Modal>
  );
}
