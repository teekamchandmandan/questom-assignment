'use client';

import { useState, useEffect } from 'react';
import { WifiOffIcon } from './Icons';

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
      <WifiOffIcon className='flex-shrink-0' />
      <span>You&apos;re offline — reconnect to continue</span>
    </div>
  );
}
