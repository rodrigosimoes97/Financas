import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { QuickAddTransaction } from '@/components/forms/quick-add-transaction';
import { ptBR } from '@/lib/i18n/pt-BR';
import { TransactionsManager } from '@/components/forms/transactions-manager';

export default async function TransactionsPage() {
  const supabase = await createClient();
  const [{ data: rows }, { data: categories }, { data: allAccounts }, { data: activeAccounts }, { data: creditCards }] = await Promise.all([
    supabase
      .from('transactions')
      .select('*, account:accounts(name), category:categories(name,type)')
      .is('parent_transaction_id', null)
      .eq('is_installment', false)
      .order('date', { ascending: false }),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').order('name'),
    supabase.from('accounts').select('*').is('archived_at', null).order('name'),
    supabase.from('credit_cards').select('*').eq('is_archived', false).order('name')
  ]);

  return (
    <section className="space-y-5">
      <PageHeader
        title={ptBR.pages.transactionsTitle}
        subtitle="Gerencie suas movimentações financeiras com clareza."
        actions={<QuickAddTransaction accounts={activeAccounts ?? []} categories={categories ?? []} creditCards={creditCards ?? []} />}
      />
      <TransactionsManager rows={rows ?? []} categories={categories ?? []} accounts={activeAccounts ?? []} allAccounts={allAccounts ?? []} />
    </section>
  );
}
