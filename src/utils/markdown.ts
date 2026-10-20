/**
 * 일지용 미니 마크다운 파서. 제목(#~######), 목록(- / *), 체크박스(- [ ]), 굵게(**), 링크만 다룬다.
 * HTML은 해석하지 않고 글자로 둔다. 화면에서는 React 요소로만 그린다.
 */
import { safeHttpUrl } from '../../shared/data';

export type Inline =
  | { type: 'text'; text: string }
  | { type: 'bold'; text: string }
  | { type: 'link'; text: string; href: string };

export interface ListItem {
  inline: Inline[];
  /** 체크박스 항목이면 체크 여부 */
  checked?: boolean;
  /** 원문에서의 줄 번호 (체크박스 토글용) */
  line: number;
}

export type Block =
  | { type: 'heading'; level: number; inline: Inline[] }
  | { type: 'list'; items: ListItem[] }
  | { type: 'paragraph'; lines: Inline[][] };

const HEADING = /^(#{1,6})\s+(.*)$/;
const LIST_ITEM = /^\s*[-*]\s(?:\[([ xX])\]\s?)?(.*)$/;
const INLINE = /\*\*(.+?)\*\*|\[([^\]]+)\]\(([^)\s]+)\)|(https?:\/\/[^\s<>()]+)/g;

export function parseInline(text: string): Inline[] {
  const out: Inline[] = [];
  let last = 0;
  const push = (token: Inline) => {
    const prev = out[out.length - 1];
    if (token.type === 'text' && prev?.type === 'text') prev.text += token.text;
    else out.push(token);
  };
  for (const match of text.matchAll(INLINE)) {
    const [whole, bold, label, href, bare] = match;
    if (match.index > last) push({ type: 'text', text: text.slice(last, match.index) });
    if (bold !== undefined) {
      push({ type: 'bold', text: bold });
    } else {
      const url = safeHttpUrl(href ?? bare);
      push(url ? { type: 'link', text: label ?? bare, href: url } : { type: 'text', text: whole });
    }
    last = match.index + whole.length;
  }
  if (last < text.length) push({ type: 'text', text: text.slice(last) });
  return out;
}

export function parseMarkdown(text: string): Block[] {
  const blocks: Block[] = [];
  for (const [index, line] of text.split('\n').entries()) {
    const last = blocks[blocks.length - 1];
    const heading = line.match(HEADING);
    const item = line.match(LIST_ITEM);
    if (heading) {
      blocks.push({ type: 'heading', level: heading[1].length, inline: parseInline(heading[2]) });
    } else if (item) {
      const entry: ListItem = {
        inline: parseInline(item[2]),
        line: index,
        ...(item[1] !== undefined && { checked: item[1] !== ' ' }),
      };
      if (last?.type === 'list') last.items.push(entry);
      else blocks.push({ type: 'list', items: [entry] });
    } else if (line.trim() === '') {
      // 빈 줄은 문단을 끊기만 한다.
      if (last?.type === 'paragraph') blocks.push({ type: 'paragraph', lines: [] });
    } else if (last?.type === 'paragraph') {
      last.lines.push(parseInline(line));
    } else {
      blocks.push({ type: 'paragraph', lines: [parseInline(line)] });
    }
  }
  return blocks.filter((b) => b.type !== 'paragraph' || b.lines.length > 0);
}
