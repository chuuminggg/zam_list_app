import type { NewsletterIssue, NewsletterItem, NewsletterSection, NewsletterSummary } from '../shared/newsletter.js';
import { ApiException } from './errors.js';
import { fetchJson } from './http.js';

const BASE_URL = 'https://zam-newletter.vercel.app';
const LABEL = '뉴스레터';
const ISSUE_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const isIssueDate = (value: string) => ISSUE_DATE.test(value);

type Upstream<T> = { ok: true } & T;

const str = (value: unknown): string | undefined => (typeof value === 'string' && value.trim() ? value : undefined);

/** 원본 데이터의 링크는 http(s)만 남긴다 (javascript: 같은 주소가 href로 들어가지 않게). */
function safeUrl(value: unknown): string | undefined {
  const raw = str(value);
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : undefined;
  } catch {
    return undefined;
  }
}

function toItem(raw: unknown): NewsletterItem | null {
  if (!raw || typeof raw !== 'object') return null;
  const item = raw as Record<string, unknown>;
  const title = str(item.title);
  const url = safeUrl(item.url);
  if (!title || !url) return null;
  return { title, url, summary: str(item.summary), tag: str(item.tag), linkLabel: str(item.linkLabel) };
}

function toSection(raw: unknown): NewsletterSection | null {
  if (!raw || typeof raw !== 'object') return null;
  const section = raw as Record<string, unknown>;
  const id = str(section.id);
  const title = str(section.title);
  const items = Array.isArray(section.items) ? section.items.map(toItem).filter((i) => i !== null) : [];
  if (!id || !title || items.length === 0) return null;
  return { id, title, source: str(section.source), items };
}

export async function listNewsletterIssues(): Promise<NewsletterSummary[]> {
  const body = await fetchJson<Upstream<{ issues?: unknown }>>(`${BASE_URL}/api/issues`, { label: LABEL });
  if (!Array.isArray(body.issues)) throw new ApiException('PARSE_ERROR', `${LABEL} 목록을 해석할 수 없습니다.`);
  return body.issues.flatMap((raw): NewsletterSummary[] => {
    const issue = raw as Record<string, unknown>;
    const date = str(issue?.date);
    if (!date || !isIssueDate(date)) return [];
    const questions = Array.isArray(issue.questions) ? issue.questions.filter((q) => typeof q === 'string') : [];
    const articleCount = typeof issue.articleCount === 'number' ? issue.articleCount : 0;
    return [{ date, questions, articleCount }];
  });
}

/** date: 'latest' 또는 YYYY-MM-DD */
export async function getNewsletterIssue(date: string): Promise<NewsletterIssue> {
  const body = await fetchJson<Upstream<{ issue?: { date?: unknown; sections?: unknown } }>>(
    `${BASE_URL}/api/issues/${date}`,
    { label: LABEL },
  );
  const issueDate = str(body.issue?.date);
  if (!issueDate || !isIssueDate(issueDate) || !Array.isArray(body.issue?.sections)) {
    throw new ApiException('PARSE_ERROR', `${LABEL} 응답을 해석할 수 없습니다.`);
  }
  return {
    date: issueDate,
    sections: body.issue.sections.map(toSection).filter((s) => s !== null),
    webUrl: `${BASE_URL}/issues/${issueDate}`,
  };
}
