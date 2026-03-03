import { PageHeader } from '@/components/app-shell/page-header';
import { AccountsManager } from '@/components/forms/accounts-manager';
import { ptBR } from '@/lib/i18n/pt-BR';
import { createClient } from '@/lib/supabase/server';

export default async function AccountsPage() {
  const supabase = await createClient();
  const { data: rows } = await supabase.from('accounts').select('*').order('archived_at', { ascending: true }).order('name');

  return (
    <section className="space-y-5">
      <PageHeader title={ptBR.pages.accountsTitle} subtitle="Gerencie suas contas para organizar onde cada transação acontece." />
      <AccountsManager rows={rows ?? []} />
    </section>
  );
}
