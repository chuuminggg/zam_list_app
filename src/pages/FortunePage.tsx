/** 운세는 직접 만든 TIL(Today I Lucky) 사이트를 그대로 띄운다. */
export const FORTUNE_URL = 'https://til-today-i-lucky.vercel.app/';

export default function FortunePage() {
  return (
    <div className="max-w-5xl mx-auto px-4 space-y-3">
      <div className="flex items-center gap-2">
        <h1 className="text-xl font-bold text-gray-900 dark:text-white">오늘의 운세</h1>
        <a
          href={FORTUNE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="ml-auto px-3 py-1.5 rounded-lg text-sm border border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
        >
          새 창에서 열기 ↗
        </a>
      </div>
      {/* 헤더(약 57px)·제목줄·위아래 여백을 뺀 높이를 채운다. */}
      <iframe
        src={FORTUNE_URL}
        title="TIL — Today I Lucky 운세"
        className="w-full h-[calc(100dvh-10rem)] min-h-[480px] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white shadow-sm"
        sandbox="allow-scripts allow-same-origin allow-forms allow-popups allow-popups-to-escape-sandbox"
        referrerPolicy="strict-origin-when-cross-origin"
      />
    </div>
  );
}
