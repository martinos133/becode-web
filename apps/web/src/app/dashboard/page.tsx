'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/projects');
  }, [router]);

  return (
    <main style={{ padding: '2rem', textAlign: 'center', color: 'var(--becode-text-muted)' }}>
      <p>Presmerovávam na projekty…</p>
    </main>
  );
}
