import Link from 'next/link';

export default function HomePage() {
  return (
    <main style={{ padding: '2rem', textAlign: 'center' }}>
      <h1 style={{ marginBottom: '1rem', fontSize: '1.75rem' }}>BeCode</h1>
      <p style={{ marginBottom: '1.5rem', color: '#94a3b8' }}>
        Vitajte. Pre vstup do administrácie sa prihláste.
      </p>
      <Link
        href="/login"
        style={{
          display: 'inline-block',
          padding: '0.75rem 1.5rem',
          background: '#3b82f6',
          color: 'white',
          borderRadius: '8px',
          fontWeight: 600,
        }}
      >
        Prihlásiť sa
      </Link>
    </main>
  );
}
