import { describe, expect, it } from 'vitest';
import { parseInline, parseMarkdown } from './markdown';

describe('parseMarkdown', () => {
  it('제목, 목록, 체크박스, 문단을 나눈다', () => {
    const blocks = parseMarkdown('## 한 일\n- 리팩터링\n- [x] 리뷰\n\n첫 줄\n둘째 줄');
    expect(blocks).toEqual([
      { type: 'heading', level: 2, inline: [{ type: 'text', text: '한 일' }] },
      {
        type: 'list',
        items: [
          { inline: [{ type: 'text', text: '리팩터링' }], line: 1 },
          { inline: [{ type: 'text', text: '리뷰' }], line: 2, checked: true },
        ],
      },
      { type: 'paragraph', lines: [[{ type: 'text', text: '첫 줄' }], [{ type: 'text', text: '둘째 줄' }]] },
    ]);
  });

  it('빈 템플릿 목록 줄도 체크박스로 읽는다', () => {
    expect(parseMarkdown('- [ ] ')).toEqual([{ type: 'list', items: [{ inline: [], line: 0, checked: false }] }]);
  });
});

describe('parseInline', () => {
  it('굵게와 링크, 맨 URL을 읽는다', () => {
    expect(parseInline('**중요** [PR](https://github.com/a/b/pull/1) 참고 https://x.dev')).toEqual([
      { type: 'bold', text: '중요' },
      { type: 'text', text: ' ' },
      { type: 'link', text: 'PR', href: 'https://github.com/a/b/pull/1' },
      { type: 'text', text: ' 참고 ' },
      { type: 'link', text: 'https://x.dev', href: 'https://x.dev' },
    ]);
  });

  it('HTML과 javascript: 링크는 글자 그대로 둔다', () => {
    expect(parseInline('<img src=x onerror=alert(1)>')).toEqual([
      { type: 'text', text: '<img src=x onerror=alert(1)>' },
    ]);
    expect(parseInline('[눌러](javascript:alert(1))')).toEqual([
      { type: 'text', text: '[눌러](javascript:alert(1))' },
    ]);
  });
});
