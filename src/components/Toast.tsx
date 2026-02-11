'use client';

import { useEffect, useState, useCallback } from 'react';
import {
  CircleAlertIcon,
  CircleCheckIcon,
  CircleInfoIcon,
  CloseSmallIcon,
} from './Icons';

export interface ToastData {
  id: string;
  message: string;
  type: 'error' | 'success' | 'info';
}

interface ToastItemProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

function ToastItem({ toast, onDismiss }: ToastItemProps) {
  const [leaving, setLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setLeaving(true);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 5000);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  const bgColor =
    toast.type === 'error'
      ? 'bg-red-950/90 border-red-800/60'
      : toast.type === 'success'
        ? 'bg-emerald-950/90 border-emerald-800/60'
        : 'bg-zinc-900/90 border-zinc-700/60';

  const iconColor =
    toast.type === 'error'
      ? 'text-red-400'
      : toast.type === 'success'
        ? 'text-emerald-400'
        : 'text-zinc-400';

  return (
    <div
      role='alert'
      className={`flex items-start gap-2.5 px-4 py-3 rounded-lg border backdrop-blur-sm shadow-lg max-w-sm transition-all duration-300 ${bgColor} ${
        leaving ? 'opacity-0 translate-x-4' : 'opacity-100 translate-x-0'
      } animate-toast-in`}
    >
      {/* Icon */}
      <span className={`flex-shrink-0 mt-0.5 ${iconColor}`}>
        {toast.type === 'error' ? (
          <CircleAlertIcon />
        ) : toast.type === 'success' ? (
          <CircleCheckIcon />
        ) : (
          <CircleInfoIcon />
        )}
      </span>

      {/* Message */}
      <p className='text-sm text-zinc-200 leading-snug flex-1'>
        {toast.message}
      </p>

      {/* Dismiss */}
      <button
        onClick={() => {
          setLeaving(true);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        className='flex-shrink-0 p-0.5 text-zinc-500 hover:text-zinc-300 transition-colors'
        aria-label='Dismiss notification'
      >
        <CloseSmallIcon />
      </button>
    </div>
  );
}

interface ToastContainerProps {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
}

export function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div
      className='fixed top-4 right-4 z-50 flex flex-col gap-2'
      aria-live='assertive'
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
}

// ── Hook for managing toasts ────────────────────────────────────────

export function useToasts() {
  const [toasts, setToasts] = useState<ToastData[]>([]);

  const addToast = useCallback(
    (message: string, type: ToastData['type'] = 'error') => {
      const id = crypto.randomUUID();
      setToasts((prev) => [...prev, { id, message, type }]);
    },
    [],
  );

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return { toasts, addToast, dismissToast };
}
