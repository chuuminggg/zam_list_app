import { useEffect } from 'react';
import { useThemeStore } from '../stores/themeStore';

const DARK_QUERY = '(prefers-color-scheme: dark)';

/**
 * 현재 테마 설정을 <html> 요소에 반영한다.
 * 'system'일 때는 OS 설정 변경도 실시간으로 따라간다.
 */
export function useTheme() {
  const theme = useThemeStore((s) => s.theme);

  useEffect(() => {
    const root = document.documentElement;
    const media = window.matchMedia(DARK_QUERY);

    const apply = () => {
      const isDark = theme === 'dark' || (theme === 'system' && media.matches);
      root.classList.toggle('dark', isDark);
      root.style.colorScheme = isDark ? 'dark' : 'light';
    };

    apply();
    if (theme !== 'system') return;

    media.addEventListener('change', apply);
    return () => media.removeEventListener('change', apply);
  }, [theme]);
}
