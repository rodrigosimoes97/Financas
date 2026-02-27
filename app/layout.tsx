import './globals.css';
import type { Metadata } from 'next';
import { ToastProvider } from '@/components/ui/toast';

export const metadata: Metadata = {
  title: 'Finanças | Controle financeiro pessoal',
  description: 'Aplicativo pessoal para controlar receitas, despesas e metas.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR" className="dark">
      <body>
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
