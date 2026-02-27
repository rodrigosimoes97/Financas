import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Finanças | Controle financeiro pessoal',
  description: 'Aplicativo pessoal para controlar receitas, despesas e metas.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>{children}</body>
    </html>
  );
}
