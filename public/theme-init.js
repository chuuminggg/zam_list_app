// 첫 페인트 전에 테마를 적용해 라이트 화면이 번쩍이는 것을 막는다.
// 저장 키는 src/stores/themeStore.ts의 THEME_STORAGE_KEY와 같아야 한다.
// CSP가 인라인 스크립트를 막으므로 index.html에서 파일로 불러온다.
(function () {
  try {
    var raw = localStorage.getItem('zam-theme');
    var theme = raw ? JSON.parse(raw).state.theme : 'system';
    var isDark =
      theme === 'dark' ||
      (theme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    if (isDark) document.documentElement.classList.add('dark');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
  } catch (e) {
    /* 저장값이 없거나 깨진 경우 라이트 모드로 시작한다. */
  }
})();
