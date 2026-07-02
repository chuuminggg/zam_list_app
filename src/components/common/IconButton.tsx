import type { ButtonHTMLAttributes } from 'react';

type Tone = 'danger' | 'neutral';

const TONE: Record<Tone, string> = {
  danger:
    'text-gray-300 hover:text-red-500 dark:text-gray-600 dark:hover:text-red-400',
  neutral:
    'text-gray-400 hover:text-gray-700 dark:text-gray-500 dark:hover:text-gray-200',
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  tone?: Tone;
  label: string;
}

export default function IconButton({
  tone = 'neutral',
  label,
  className = '',
  ...props
}: IconButtonProps) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className={`p-1 rounded-md leading-none transition-colors ${TONE[tone]} ${className}`}
      {...props}
    />
  );
}
