import { useEffect, useState } from 'react';
import { fetchNewsletterIssue, fetchNewsletterIssues } from '../../api/client';
import { useApiRequest } from '../../hooks/useApiRequest';
import type { NewsletterIssue, NewsletterSection, NewsletterSummary } from '../../../shared/newsletter';
import Button from '../common/Button';
import Modal from '../common/Modal';
import Select from '../common/Select';

interface NewsletterModalProps {
  onClose: () => void;
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토'];

/** 2026-10-27 → 10월 27일 (화) */
function formatIssueDate(date: string): string {
  const [y, m, d] = date.split('-').map(Number);
  const weekday = WEEKDAYS[new Date(y, m - 1, d).getDay()];
  return `${m}월 ${d}일 (${weekday})`;
}

function Section({ section }: { section: NewsletterSection }) {
  return (
    <section className="space-y-2">
      <header>
        <h3 className="font-semibold text-gray-900 dark:text-white">{section.title}</h3>
        {section.source && <p className="text-xs text-gray-400 dark:text-gray-500">{section.source}</p>}
      </header>
      <ul className="space-y-3">
        {section.items.map((item) => (
          <li key={item.url} className="rounded-xl bg-gray-50 dark:bg-gray-900/50 p-3 space-y-1">
            {item.tag && <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400">{item.tag}</p>}
            <a
              href={item.url}
              target="_blank"
              rel="noopener noreferrer"
              className="block text-sm font-medium text-gray-900 dark:text-gray-100 hover:underline"
            >
              {item.title}
            </a>
            {item.summary && (
              <p className="text-xs text-gray-600 dark:text-gray-400 whitespace-pre-line">{item.summary}</p>
            )}
            {item.linkLabel && (
              <a
                href={item.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-block text-xs text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {item.linkLabel}
              </a>
            )}
          </li>
        ))}
      </ul>
    </section>
  );
}

/** TechSignal 뉴스레터(zam_newletter) 발행본을 날짜별로 보는 모달. 열 때만 마운트한다. */
export default function NewsletterModal({ onClose }: NewsletterModalProps) {
  const list = useApiRequest<NewsletterSummary[]>();
  const issue = useApiRequest<NewsletterIssue>();
  // 고르기 전에는 가장 최근 호를 보여준다.
  const [selected, setSelected] = useState<string | null>(null);
  const { run: runList } = list;
  const { run: runIssue } = issue;

  // 열 때마다 마운트되므로 목록도 열 때마다 새로 받는다.
  useEffect(() => {
    runList(fetchNewsletterIssues);
  }, [runList]);

  const dates = list.state.status === 'success' ? list.state.data.map((s) => s.date) : [];
  const date = selected ?? dates[0] ?? null;

  useEffect(() => {
    if (date) runIssue((signal) => fetchNewsletterIssue(date, signal));
  }, [date, runIssue]);

  const index = date ? dates.indexOf(date) : -1;
  const error =
    list.state.status === 'error' ? list.state.message : issue.state.status === 'error' ? issue.state.message : null;
  const loading = list.state.status === 'loading' || issue.state.status === 'loading';
  const shown = issue.state.status === 'success' && issue.state.data.date === date ? issue.state.data : null;

  return (
    <Modal open title="TechSignal 뉴스레터" onClose={onClose} placement="full" size="lg">
      <p className="text-xs text-gray-500 dark:text-gray-400">
        매일 오전 9시에 발행되는 FE/BE 면접 질문과 개발 뉴스예요.
      </p>

      {dates.length > 0 && (
        <div className="flex items-center gap-2">
          {/* 목록은 최신순이라 '이전 호'는 다음 칸이다. */}
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(dates[index + 1])}
            disabled={index < 0 || index >= dates.length - 1}
            aria-label="이전 호"
          >
            ‹
          </Button>
          <Select
            value={date ?? ''}
            onChange={(e) => setSelected(e.target.value)}
            aria-label="발행일"
            className="flex-1"
          >
            {dates.map((d) => (
              <option key={d} value={d}>
                {formatIssueDate(d)}
              </option>
            ))}
          </Select>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setSelected(dates[index - 1])}
            disabled={index <= 0}
            aria-label="다음 호"
          >
            ›
          </Button>
        </div>
      )}

      {error && <p className="text-sm text-red-500">{error}</p>}
      {loading && <p className="text-sm text-gray-400 dark:text-gray-500">불러오는 중…</p>}
      {list.state.status === 'success' && dates.length === 0 && (
        <p className="text-sm text-gray-400 dark:text-gray-500">아직 발행된 뉴스레터가 없어요.</p>
      )}

      {shown && (
        <div className="space-y-5">
          {shown.sections.map((s) => (
            <Section key={s.id} section={s} />
          ))}
          <a
            href={shown.webUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="block text-center text-xs text-gray-400 dark:text-gray-500 hover:underline"
          >
            웹에서 보기 ↗
          </a>
        </div>
      )}

      <div className="pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button variant="ghost" onClick={onClose} className="w-full">
          닫기
        </Button>
      </div>
    </Modal>
  );
}
