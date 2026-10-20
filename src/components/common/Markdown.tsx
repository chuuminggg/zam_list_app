import { Fragment } from 'react';
import { parseMarkdown, type Inline } from '../../utils/markdown';

interface MarkdownProps {
  text: string;
  /** 체크박스를 누르면 그 줄 번호로 부른다. 없으면 체크박스는 읽기 전용 */
  onToggleTask?: (line: number) => void;
}

const HEADING_CLASS = ['text-xl font-bold', 'text-base font-bold', 'text-sm font-semibold'];

function InlineText({ tokens }: { tokens: Inline[] }) {
  return tokens.map((token, i) => {
    if (token.type === 'bold') return <strong key={i}>{token.text}</strong>;
    if (token.type === 'link') {
      return (
        <a
          key={i}
          href={token.href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-indigo-600 dark:text-indigo-400 underline break-all"
        >
          {token.text}
        </a>
      );
    }
    return <Fragment key={i}>{token.text}</Fragment>;
  });
}

/** 일지 미리보기. HTML을 해석하지 않고 React 요소로만 그린다. */
export default function Markdown({ text, onToggleTask }: MarkdownProps) {
  return (
    <div className="space-y-2 text-sm text-gray-800 dark:text-gray-200 break-words">
      {parseMarkdown(text).map((block, i) => {
        if (block.type === 'heading') {
          // 모달 제목(h2) 아래에 오도록 h3부터 쓴다.
          const Tag = `h${Math.min(block.level + 2, 6)}` as 'h3' | 'h4' | 'h5' | 'h6';
          const size = HEADING_CLASS[Math.min(block.level, HEADING_CLASS.length) - 1];
          return (
            <Tag key={i} className={`${size} text-gray-900 dark:text-white pt-1`}>
              <InlineText tokens={block.inline} />
            </Tag>
          );
        }
        if (block.type === 'list') {
          return (
            <ul key={i} className="space-y-1">
              {block.items.map((item) => (
                <li key={item.line} className="flex items-start gap-2">
                  {item.checked === undefined ? (
                    <span aria-hidden="true" className="text-gray-400">
                      •
                    </span>
                  ) : (
                    <input
                      type="checkbox"
                      checked={item.checked}
                      disabled={!onToggleTask}
                      onChange={() => onToggleTask?.(item.line)}
                      aria-label={item.inline.map((t) => t.text).join('') || '할 일'}
                      className="mt-0.5 accent-indigo-600"
                    />
                  )}
                  <span className={item.checked ? 'line-through text-gray-400 dark:text-gray-500' : ''}>
                    <InlineText tokens={item.inline} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return (
          <p key={i}>
            {block.lines.map((line, j) => (
              <Fragment key={j}>
                {j > 0 && <br />}
                <InlineText tokens={line} />
              </Fragment>
            ))}
          </p>
        );
      })}
    </div>
  );
}
