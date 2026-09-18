import { useEffect } from 'react';
import type { ReactNode } from 'react';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** bottom: 모바일에서 화면 아래에 붙는 시트 (sm 이상에서는 가운데) */
  placement?: 'center' | 'bottom';
}

const PLACEMENT = {
  center: { overlay: 'items-center p-4', panel: 'rounded-2xl' },
  bottom: { overlay: 'items-end sm:items-center sm:p-4', panel: 'rounded-t-2xl sm:rounded-2xl' },
};

export default function Modal({ open, title, onClose, children, placement = 'center' }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKeyDown);
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      className={`fixed inset-0 bg-black/50 flex justify-center z-50 animate-fade-in ${PLACEMENT[placement].overlay}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-gray-800 ${PLACEMENT[placement].panel} p-6 w-full max-w-md space-y-3 shadow-xl max-h-[90vh] overflow-y-auto animate-pop-in`}
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {children}
      </div>
    </div>
  );
}
