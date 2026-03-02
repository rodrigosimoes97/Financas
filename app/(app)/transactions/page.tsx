import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { QuickAddTransaction } from '@/components/forms/quick-add-transaction';
import { ptBR } from '@/lib/i18n/pt-BR';
import { TransactionsManager } from '@/components/forms/transactions-manager';

export default async function TransactionsPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: categories }, { data: accounts }] = await Promise.all([
    supabase.from('transactions').select('*').order('date', { ascending: false }),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').order('name')
  ]);

  return (
    <section className="space-y-5">
      <PageHeader
        title={ptBR.pages.transactionsTitle}
        subtitle="Gerencie suas movimentações financeiras com clareza."
        actions={<QuickAddTransaction accounts={accounts ?? []} categories={categories ?? []} />}
      />
      <TransactionsManager rows={rows ?? []} categories={categories ?? []} accounts={accounts ?? []} />
    </section>
  );
}
