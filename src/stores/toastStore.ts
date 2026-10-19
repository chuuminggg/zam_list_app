import { create } from 'zustand';

export interface Toast {
  id: number;
  message: string;
  action?: { label: string; run: () => void };
}

interface ToastStore {
  /** 한 번에 하나만 보여준다. 새 토스트가 오면 이전 것을 바꾼다. */
  toast: Toast | null;
  showToast: (toast: Omit<Toast, 'id'>) => void;
  dismissToast: (id: number) => void;
}

let nextId = 1;

export const useToastStore = create<ToastStore>()((set) => ({
  toast: null,
  showToast: (toast) => set({ toast: { ...toast, id: nextId++ } }),
  dismissToast: (id) => set((state) => (state.toast?.id === id ? { toast: null } : state)),
}));
