import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finanças MVP',
  description: 'Personal Finance Web App MVP'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body>{children}</body>
    </html>
  );
}
