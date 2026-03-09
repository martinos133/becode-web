import type { Metadata } from 'next';
import Link from 'next/link';
import './globals.css';

export const metadata: Metadata = {
  title: 'BeCode – Admin',
  description: 'BeCode admin rozhranie',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="sk">
      <body>
        <header
          style={{
            position: 'sticky',
            top: 0,
            zIndex: 20,
            borderBottom: '1px solid var(--becode-border)',
            background:
              'linear-gradient(to right, rgba(10,10,10,0.96), rgba(10,10,10,0.98))',
            backdropFilter: 'blur(12px)',
          }}
        >
          <nav
            style={{
              width: '100%',
              margin: 0,
              padding: '0.75rem 3rem',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: '1rem',
            }}
          >
            <span
              style={{
                fontWeight: 600,
                letterSpacing: '0.04em',
                fontSize: '0.85rem',
                textTransform: 'uppercase',
                color: 'var(--becode-text-muted)',
              }}
            >
              BeCode&nbsp;
              <span style={{ color: 'var(--becode-primary)' }}>Admin</span>
            </span>
            <div
              style={{
                display: 'flex',
                gap: '0.5rem',
                fontSize: '0.9rem',
              }}
            >
              <NavItem href="/projects" label="Projekty" />
              <NavItem href="/employees" label="Zamestnanci" />
              <NavItem href="/stats" label="Štatistiky" />
              <NavItem href="/settings" label="Admin" primary />
            </div>
          </nav>
        </header>
        <main style={{ minHeight: 'calc(100vh - 56px)' }}>{children}</main>
      </body>
    </html>
  );
}

type NavItemProps = {
  href: string;
  label: string;
  primary?: boolean;
};

function NavItem({ href, label, primary }: NavItemProps) {
  const baseStyle = {
    padding: '0.35rem 0.75rem',
    borderRadius: '999px',
    border: '1px solid transparent',
    fontSize: '0.85rem',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
  } as const;

  const style = primary
    ? {
        ...baseStyle,
        background: 'var(--becode-primary)',
        color: '#fff',
        borderColor: 'var(--becode-primary)',
      }
    : {
        ...baseStyle,
        background: 'transparent',
        color: 'var(--becode-text-muted)',
        borderColor: 'var(--becode-border)',
      };

  return (
    <Link href={href} style={style}>
      {label}
    </Link>
  );
}
