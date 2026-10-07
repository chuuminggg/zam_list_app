const DAANGN_HOSTS = new Set(['daangn.com', 'www.daangn.com', 'm.daangn.com']);

/**
 * 붙여 넣은 글에서 당근 매물 id를 찾는다. 공유 문구째 붙여 넣어도 첫 번째 당근 링크를 쓴다.
 * - https://www.daangn.com/kr/buy-sell/<제목>-<짧은 id>/  → 짧은 id
 * - https://www.daangn.com/kr/buy-sell/<숫자 id>/          → 숫자 id
 * - https://www.daangn.com/articles/<숫자 id>              → 숫자 id (예전 공유 링크)
 * 당근 링크가 아니면 undefined.
 */
export function parseDaangnLink(text: string): string | undefined {
  for (const raw of text.match(/https?:\/\/[^\s"'<>]+/g) ?? []) {
    let url: URL;
    try {
      url = new URL(raw);
    } catch {
      continue;
    }
    if (!DAANGN_HOSTS.has(url.hostname)) continue;

    const segments = url.pathname.split('/').filter(Boolean);
    if (segments[0] === 'articles' && /^\d+$/.test(segments[1] ?? '')) return segments[1];
    const at = segments.indexOf('buy-sell');
    const slug = at >= 0 ? segments[at + 1] : undefined;
    const id = slug?.split('-').pop();
    if (id && /^[a-z0-9]+$/i.test(id)) return id;
  }
  return undefined;
}
