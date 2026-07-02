export type Accent = 'indigo' | 'purple';

export const FIELD_BASE =
  'w-full px-3 py-2 rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-900 text-gray-900 dark:text-white focus:outline-none';

export const FOCUS_RING: Record<Accent, string> = {
  indigo: 'focus:ring-2 focus:ring-indigo-500',
  purple: 'focus:ring-2 focus:ring-purple-500',
};
