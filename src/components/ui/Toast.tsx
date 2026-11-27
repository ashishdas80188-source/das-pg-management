import React from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';
import { usePG } from '../../context/PGContext';

export const ToastContainer: React.FC = () => {
  const { toasts, dismissToast } = usePG();
  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-20 sm:bottom-5 right-4 z-[60] flex flex-col gap-2 max-w-sm w-[calc(100vw-2rem)] no-print">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`flex items-start gap-2.5 px-4 py-3 rounded-xl shadow-lg border text-sm font-medium transition-all ${
            toast.type === 'error'
              ? 'bg-rose-950 text-rose-50 border-rose-700'
              : toast.type === 'info'
              ? 'bg-[#0B192C] text-white border-slate-700'
              : 'bg-[#0B192C] text-white border-emerald-500/40'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          ) : toast.type === 'info' ? (
            <Info className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
          ) : (
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          )}
          <span className="flex-1">{toast.text}</span>
          <button
            type="button"
            onClick={() => dismissToast(toast.id)}
            className="text-slate-400 hover:text-white cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
};
