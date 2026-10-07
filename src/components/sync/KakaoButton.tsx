import { useState } from 'react';
import type { KakaoMode } from '../../../shared/kakao';
import { goToKakao } from '../../sync/sync';

/** 카카오 디자인 가이드의 노란 버튼. 누르면 카카오 로그인 화면으로 이동한다. */
export default function KakaoButton({
  mode,
  label,
  onError,
}: {
  mode: KakaoMode;
  label: string;
  onError: (message: string) => void;
}) {
  const [moving, setMoving] = useState(false);

  const start = async () => {
    setMoving(true);
    try {
      await goToKakao(mode);
    } catch (error) {
      onError(error instanceof Error ? error.message : '카카오 로그인을 시작하지 못했어요.');
      setMoving(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void start()}
      disabled={moving}
      className="w-full rounded-lg px-4 py-2 text-sm font-medium bg-[#FEE500] text-black/85 hover:brightness-95 transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
    >
      <svg aria-hidden="true" viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
        <path d="M12 3C6.48 3 2 6.53 2 10.88c0 2.8 1.86 5.26 4.66 6.65l-.95 3.47c-.08.3.26.54.52.37l4.15-2.75c.53.06 1.07.1 1.62.1 5.52 0 10-3.53 10-7.84S17.52 3 12 3z" />
      </svg>
      {moving ? '카카오로 이동하는 중…' : label}
    </button>
  );
}
