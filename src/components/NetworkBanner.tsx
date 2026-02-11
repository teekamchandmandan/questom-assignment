'use client';

import { useState, useEffect } from 'react';

export function NetworkBanner() {
  const [isOffline, setIsOffline] = useState(
    () => typeof navigator !== 'undefined' && !navigator.onLine,
  );

  useEffect(() => {
    const handleOffline = () => setIsOffline(true);
    const handleOnline = () => setIsOffline(false);

    window.addEventListener('offline', handleOffline);
    window.addEventListener('online', handleOnline);

    return () => {
      window.removeEventListener('offline', handleOffline);
      window.removeEventListener('online', handleOnline);
    };
  }, []);

  if (!isOffline) return null;

  return (
    <div
      role='alert'
      className='flex-shrink-0 bg-amber-950/80 border-b border-amber-800/50 px-4 py-2 flex items-center justify-center gap-2 text-sm text-amber-300 animate-message-in'
    >
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
        className='flex-shrink-0'
      >
        <path d='M12 9v4' />
        <path d='M12 17h.01' />
        <path d='M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-.274.868-.656 1.686-1.132 2.44' />
        <path d='m2 2 20 20' />
      </svg>
      <span>
        You&apos;re offline — messages won&apos;t send until the connection is
        restored
      </span>
    </div>
  );
}
