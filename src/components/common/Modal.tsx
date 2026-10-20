import { useEffect } from 'react';
import type { ReactNode } from 'react';
import { createPortal } from 'react-dom';

interface ModalProps {
  open: boolean;
  title: string;
  onClose: () => void;
  children: ReactNode;
  /** bottom: 모바일에서 화면 아래에 붙는 시트, full: 모바일에서 화면 전체 (sm 이상에서는 둘 다 가운데) */
  placement?: 'center' | 'bottom' | 'full';
  /** lg: 글을 쓰는 화면처럼 넓은 모달 */
  size?: 'md' | 'lg';
}

const PLACEMENT = {
  center: { overlay: 'items-center p-4', panel: 'rounded-2xl max-h-[90vh]' },
  bottom: { overlay: 'items-end sm:items-center sm:p-4', panel: 'rounded-t-2xl sm:rounded-2xl max-h-[90vh]' },
  full: { overlay: 'items-stretch sm:items-center sm:p-4', panel: 'h-full sm:h-auto sm:rounded-2xl sm:max-h-[90vh]' },
};

const SIZE = {
  md: 'max-w-md',
  lg: 'max-w-2xl',
};

export default function Modal({ open, title, onClose, children, placement = 'center', size = 'md' }: ModalProps) {
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

  // body로 띄워서 backdrop-filter가 있는 헤더 같은 조상에 fixed 위치가 갇히지 않게 한다.
  return createPortal(
    <div
      className={`fixed inset-0 bg-black/50 flex justify-center z-50 animate-fade-in ${PLACEMENT[placement].overlay}`}
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        onClick={(e) => e.stopPropagation()}
        className={`bg-white dark:bg-gray-800 ${PLACEMENT[placement].panel} ${SIZE[size]} p-6 w-full space-y-3 shadow-xl overflow-y-auto animate-pop-in`}
      >
        <h2 className="text-lg font-bold text-gray-900 dark:text-white">{title}</h2>
        {children}
      </div>
    </div>,
    document.body,
  );
}
