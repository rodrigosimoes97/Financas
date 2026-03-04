import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { QuickAddTransaction } from '@/components/forms/quick-add-transaction';
import { ptBR } from '@/lib/i18n/pt-BR';
import { TransactionsManager } from '@/components/forms/transactions-manager';
import { formatMonthBR } from '@/lib/utils';
import Link from 'next/link';
import { Transaction } from '@/types/models';

const PAGE_SIZE = 50;

export default async function TransactionsPage({
  searchParams
}: {
  searchParams?: { page?: string };
}) {
  const supabase = await createClient();
  const page = Math.max(Number(searchParams?.page ?? 1) || 1, 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const [{ data: rows }, { data: categories }, { data: activeAccounts }, { data: creditCards }] = await Promise.all([
    supabase
      .from('transactions')
      .select('id,user_id,created_at,amount,type,description,date,account_id,category_id,payment_method,total_installments,installments_total,account:accounts(name),category:categories(name,type)')
      .is('parent_transaction_id', null)
      .eq('is_installment', false)
      .order('date', { ascending: false })
      .order('id', { ascending: false })
      .range(from, to),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').is('archived_at', null).order('name'),
    supabase.from('credit_cards').select('*').is('archived_at', null).order('name')
  ]);

  const hasNextPage = (rows?.length ?? 0) === PAGE_SIZE;

  return (
    <section className="space-y-5">
      <PageHeader
        title={ptBR.pages.transactionsTitle}
        subtitle="Gerencie suas movimentações financeiras com clareza."
        actions={<QuickAddTransaction accounts={activeAccounts ?? []} categories={categories ?? []} creditCards={creditCards ?? []} />}
      />
      <TransactionsManager
        rows={((rows ?? []) as unknown as Transaction[])}
        categories={categories ?? []}
        accounts={activeAccounts ?? []}
        currentMonthLabel={formatMonthBR(new Date())}
      />
      <div className="flex items-center justify-end gap-2 text-sm">
        {page > 1 ? (
          <Link href={`/transactions?page=${page - 1}`} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800">
            Anterior
          </Link>
        ) : null}
        {hasNextPage ? (
          <Link href={`/transactions?page=${page + 1}`} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800">
            Próxima
          </Link>
        ) : null}
      </div>
    </section>
  );
}
