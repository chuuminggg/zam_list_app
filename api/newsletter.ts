import { ApiException } from '../server/errors.js';
import { getNewsletterIssue, isIssueDate, listNewsletterIssues } from '../server/newsletter.js';
import { ok, optionalString, route } from '../server/respond.js';

/** GET /api/newsletter — 지난 호 목록, ?date=latest|YYYY-MM-DD — 해당 호 */
export const GET = route(async (url) => {
  const date = optionalString(url, 'date', { max: 10 });
  if (!date) return ok({ issues: await listNewsletterIssues() }, 300);
  if (date !== 'latest' && !isIssueDate(date)) {
    throw new ApiException('BAD_REQUEST', "'date' 형식이 올바르지 않습니다.");
  }
  return ok({ issue: await getNewsletterIssue(date) }, 300);
});
