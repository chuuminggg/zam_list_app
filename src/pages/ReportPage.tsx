import { useEffect, useRef, useState } from 'react';

/**
 * 올리브영 오늘의 특가(오특) 모바일 페이지를 그대로 띄운다. 올리브영이 서버 요청을 막아 목록을 직접 받을 수 없다.
 * 업무 화면처럼 보이도록 탭 이름은 "리포트"로 두고, Esc를 누르면 바로 가린다.
 */
export const REPORT_URL = 'https://m.oliveyoung.co.kr/m/mtn?menu=todaySpecial';

/**
 * 올리브영은 PC 브라우저 UA를 PC 페이지로 넘기고, PC 페이지는 X-Frame-Options: SAMEORIGIN이라 탭 안에 띄울 수 없다.
 * 같은 기준(UA)으로 모바일일 때만 띄우고, PC에서는 화면 오른쪽에 작은 팝업 창으로 연다.
 */
const canEmbed = () => /Mobi|Android|iPhone/i.test(navigator.userAgent);

const POPUP_WIDTH = 420;
const POPUP_HEIGHT = 760;

/** 빈 창을 먼저 열어 opener를 끊은 뒤 이동해, 열린 페이지가 이 앱 창을 건드리지 못하게 한다. */
function openPopup(): Window | null {
  const left = Math.max(0, window.screen.availWidth - POPUP_WIDTH - 24);
  const popup = window.open(
    'about:blank',
    'daily-report',
    `popup=yes,width=${POPUP_WIDTH},height=${POPUP_HEIGHT},left=${left},top=80`,
  );
  if (!popup) return null;
  popup.opener = null;
  popup.location.href = REPORT_URL;
  return popup;
}

export default function ReportPage() {
  const [hidden, setHidden] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const popupRef = useRef<Window | null>(null);
  const embed = canEmbed();

  const open = () => {
    popupRef.current = openPopup();
    setBlocked(!popupRef.current);
  };

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      setHidden(true);
      popupRef.current?.close();
      popupRef.current = null;
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
      ) : !embed ? (
        <p className="text-sm text-gray-500 dark:text-gray-400">
          오늘 항목은 별도 창에서 확인할 수 있습니다.{' '}
          <button type="button" onClick={open} className="underline hover:text-gray-700 dark:hover:text-gray-200">
            열기 ↗
          </button>
          {blocked && ' 팝업이 차단되었습니다. 브라우저 주소창에서 팝업을 허용해 주세요.'}
        </p>
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
