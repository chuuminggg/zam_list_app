import { useEffect } from 'react';
import { useToastStore } from '../../stores/toastStore';

const DURATION_MS = 5000;

/** 화면 아래에 잠깐 떠 있는 알림. 동작 버튼(수정·되돌리기)을 하나 둘 수 있다. */
export default function Toaster() {
  const toast = useToastStore((s) => s.toast);
  const dismissToast = useToastStore((s) => s.dismissToast);

  useEffect(() => {
    if (!toast) return;
    const timer = setTimeout(() => dismissToast(toast.id), DURATION_MS);
    return () => clearTimeout(timer);
  }, [toast, dismissToast]);

  if (!toast) return null;

  return (
    <div className="fixed inset-x-0 bottom-4 z-50 flex justify-center px-4 pointer-events-none">
      <div
        role="status"
        className="pointer-events-auto flex items-center gap-3 max-w-md w-full sm:w-auto rounded-xl bg-gray-900 dark:bg-gray-100 text-white dark:text-gray-900 px-4 py-3 shadow-lg animate-pop-in"
      >
        <span className="flex-1 text-sm">{toast.message}</span>
        {toast.action && (
          <button
            type="button"
            onClick={() => {
              dismissToast(toast.id);
              toast.action?.run();
            }}
            className="text-sm font-semibold text-indigo-300 dark:text-indigo-600 hover:underline whitespace-nowrap"
          >
            {toast.action.label}
          </button>
        )}
      </div>
    </div>
  );
}
