import { redirect } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { createClient } from '@/lib/supabase/server';

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();

  if (!data.user) redirect('/login');

  return (
    <div className="min-h-screen md:flex">
      <Sidebar />
      <main className="w-full p-4 md:p-8">
        <div className="mx-auto max-w-7xl">{children}</div>
      </main>
    </div>
  );
}
