import type { Metadata } from 'next';
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
      <body>{children}</body>
    </html>
  );
}
