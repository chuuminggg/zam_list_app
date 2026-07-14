import { useThemeStore } from '../../stores/themeStore';
import type { Theme } from '../../types';

const ICON: Record<Theme, string> = {
  light: '☀️',
  dark: '🌙',
  system: '🖥️',
};

const LABEL: Record<Theme, string> = {
  light: '라이트 모드',
  dark: '다크 모드',
  system: '시스템 설정',
};

export default function ThemeToggle() {
  const theme = useThemeStore((s) => s.theme);
  const cycleTheme = useThemeStore((s) => s.cycleTheme);

  return (
    <button
      type="button"
      onClick={cycleTheme}
      aria-label={`테마: ${LABEL[theme]} (클릭해서 변경)`}
      title={LABEL[theme]}
      className="px-2.5 py-1.5 rounded-lg text-base leading-none transition-colors hover:bg-gray-100 dark:hover:bg-gray-800"
    >
      <span aria-hidden="true">{ICON[theme]}</span>
    </button>
  );
}
