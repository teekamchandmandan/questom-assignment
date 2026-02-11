'use client';

import { useEffect, useState, useCallback } from 'react';

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
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <circle cx='12' cy='12' r='10' />
            <line x1='12' y1='8' x2='12' y2='12' />
            <line x1='12' y1='16' x2='12.01' y2='16' />
          </svg>
        ) : toast.type === 'success' ? (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <path d='M22 11.08V12a10 10 0 1 1-5.93-9.14' />
            <polyline points='22 4 12 14.01 9 11.01' />
          </svg>
        ) : (
          <svg
            xmlns='http://www.w3.org/2000/svg'
            width='16'
            height='16'
            viewBox='0 0 24 24'
            fill='none'
            stroke='currentColor'
            strokeWidth='2'
            strokeLinecap='round'
            strokeLinejoin='round'
          >
            <circle cx='12' cy='12' r='10' />
            <line x1='12' y1='16' x2='12' y2='12' />
            <line x1='12' y1='8' x2='12.01' y2='8' />
          </svg>
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
        <svg
          xmlns='http://www.w3.org/2000/svg'
          width='14'
          height='14'
          viewBox='0 0 24 24'
          fill='none'
          stroke='currentColor'
          strokeWidth='2'
          strokeLinecap='round'
          strokeLinejoin='round'
        >
          <path d='M18 6 6 18' />
          <path d='m6 6 12 12' />
        </svg>
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
