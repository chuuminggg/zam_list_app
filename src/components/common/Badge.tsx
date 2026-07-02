import type { ReactNode } from 'react';

const NEUTRAL =
  'bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400';

interface BadgeProps {
  /** Tailwind 배경/글자색 클래스. 생략하면 중립 색상. */
  tone?: string;
  children: ReactNode;
}

export default function Badge({ tone = NEUTRAL, children }: BadgeProps) {
  return (
    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${tone}`}>{children}</span>
  );
}
