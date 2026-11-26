import { useEffect, useRef } from 'react';
import { X } from 'lucide-react';
import { AuthMapPortal } from './AuthMapPortal';

export function AuthDialog({ mode, onClose }: { mode: 'login' | 'register'; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const element = dialog.current;
    if (element && !element.open) element.showModal();
  }, []);

  return (
    <dialog
      ref={dialog}
      aria-label="Đăng nhập hoặc đăng ký InnFinder"
      onClose={onClose}
      style={{ position: 'fixed', inset: '50% auto auto 50%', margin: 0, transform: 'translate(-50%, -50%)', width: 'min(28rem, calc(100% - 2rem))' }}
      className="max-h-[calc(100dvh-2rem)] overflow-y-auto overscroll-contain rounded-2xl border border-slate-200 bg-white p-5 text-slate-900 shadow-xl backdrop:bg-slate-950/50 sm:p-7"
    >
      <button
        type="button"
        aria-label="Đóng hộp thoại"
        className="absolute right-2 top-2 grid size-9 place-items-center rounded-lg text-slate-600 hover:bg-slate-100 focus-visible:outline-teal-700"
        onClick={() => dialog.current?.close()}
      >
        <X aria-hidden="true" className="size-5" />
      </button>
      <AuthMapPortal initialMode={mode} />
    </dialog>
  );
}
