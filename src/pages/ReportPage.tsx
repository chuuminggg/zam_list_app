import { useEffect, useState } from 'react';

/**
 * 올리브영 오늘의 특가(오특) 모바일 페이지를 그대로 띄운다. 올리브영이 서버 요청을 막아 목록을 직접 받을 수 없다.
 * 업무 화면처럼 보이도록 탭 이름은 "리포트"로 두고, Esc를 누르면 바로 가린다.
 */
export const REPORT_URL = 'https://m.oliveyoung.co.kr/m/mtn?menu=todaySpecial';

export default function ReportPage() {
  const [hidden, setHidden] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHidden(true);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  const today = new Date().toLocaleDateString('ko-KR', { year: 'numeric', month: '2-digit', day: '2-digit' });

  return (
    <div className="max-w-5xl mx-auto px-4 space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-lg font-semibold text-gray-900 dark:text-white">일일 리포트</h1>
        <span className="text-sm text-gray-500 dark:text-gray-400">{today}</span>
        <button
          type="button"
          onClick={() => setHidden((h) => !h)}
          className="ml-auto px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          {hidden ? '펼치기' : '접기'}
        </button>
      </div>
      {hidden ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">표시할 항목이 없습니다.</p>
      ) : (
        // 모바일 페이지라 폭을 좁게 두고, 헤더(약 57px)·제목줄·위아래 여백을 뺀 높이를 채운다.
        <iframe
          src={REPORT_URL}
          title="일일 리포트"
          className="w-full max-w-md mx-auto block h-[calc(100dvh-10rem)] min-h-[480px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white shadow-sm"
          sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
          referrerPolicy="no-referrer"
        />
      )}
    </div>
  );
}
