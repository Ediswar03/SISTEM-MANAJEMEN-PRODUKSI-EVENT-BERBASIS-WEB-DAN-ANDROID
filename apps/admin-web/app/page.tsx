'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getAccessToken } from './lib/api-client';

export default function RootPage() {
  const router = useRouter();

  useEffect(() => {
    const token = getAccessToken();
    router.replace(token ? '/dashboard' : '/login');
  }, [router]);

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--bg-base)',
      }}
    >
      <div className="spinner" style={{ width: '32px', height: '32px' }} />
    </div>
  );
}
