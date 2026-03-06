import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { QuickAddTransaction } from '@/components/forms/quick-add-transaction';
import { ptBR } from '@/lib/i18n/pt-BR';
import { TransactionsManager } from '@/components/forms/transactions-manager';
import Link from 'next/link';
import { Transaction } from '@/types/models';

const PAGE_SIZE = 50;

interface TransactionsSearchParams {
  page?: string;
  month?: string;
  type?: 'income' | 'expense';
  category?: string;
  payment?: 'credit' | 'debit' | 'pix' | 'cash';
  q?: string;
}

export default async function TransactionsPage({
  searchParams
}: {
  searchParams?: TransactionsSearchParams;
}) {
  const supabase = await createClient();
  const page = Math.max(Number(searchParams?.page ?? 1) || 1, 1);
  const from = (page - 1) * PAGE_SIZE;
  const to = from + PAGE_SIZE - 1;

  const now = new Date();
  const monthValue = searchParams?.month?.match(/^\d{4}-\d{2}$/)
    ? searchParams.month
    : `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  const monthStart = `${monthValue}-01`;
  const [year, month] = monthValue.split('-').map(Number);
  const monthEnd = new Date(Date.UTC(year, month, 0)).toISOString().slice(0, 10);

  let rowsQuery = supabase
    .from('transactions')
    .select(
      'id,user_id,created_at,amount,type,description,date,account_id,category_id,payment_method,credit_card_id,is_installment,installment_number,installment_index,total_installments,installment_total,installments_total,parent_transaction_id,installment_group_id,account:accounts(name),category:categories(name,type),credit_card:credit_cards(name)',
      { count: 'exact' }
    )
    .is('parent_transaction_id', null)
    .gte('date', monthStart)
    .lte('date', monthEnd);

  if (searchParams?.type === 'income' || searchParams?.type === 'expense') {
    rowsQuery = rowsQuery.eq('type', searchParams.type);
  }

  if (searchParams?.category) {
    rowsQuery = rowsQuery.eq('category_id', searchParams.category);
  }

  if (searchParams?.payment && ['credit', 'debit', 'pix', 'cash'].includes(searchParams.payment)) {
    rowsQuery = rowsQuery.eq('payment_method', searchParams.payment);
  }

  if (searchParams?.q?.trim()) {
    rowsQuery = rowsQuery.ilike('description', `%${searchParams.q.trim()}%`);
  }

  const [{ data: rows, count }, { data: categories }, { data: activeAccounts }, { data: creditCards }] = await Promise.all([
    rowsQuery.order('date', { ascending: false }).order('id', { ascending: false }).range(from, to),
    supabase.from('categories').select('*').order('name'),
    supabase.from('accounts').select('*').is('archived_at', null).order('name'),
    supabase.from('credit_cards').select('*').is('archived_at', null).order('name')
  ]);

  const hasNextPage = (count ?? 0) > page * PAGE_SIZE;
  const queryWithoutPage = new URLSearchParams();

  if (monthValue) queryWithoutPage.set('month', monthValue);
  if (searchParams?.type) queryWithoutPage.set('type', searchParams.type);
  if (searchParams?.category) queryWithoutPage.set('category', searchParams.category);
  if (searchParams?.payment) queryWithoutPage.set('payment', searchParams.payment);
  if (searchParams?.q) queryWithoutPage.set('q', searchParams.q);

  const makePaginationHref = (targetPage: number) => {
    const params = new URLSearchParams(queryWithoutPage);
    params.set('page', String(targetPage));
    return `/transactions?${params.toString()}`;
  };

  return (
    <section className="space-y-5">
      <PageHeader
        title={ptBR.pages.transactionsTitle}
        subtitle="Gerencie suas movimentações financeiras com clareza."
        actions={<QuickAddTransaction accounts={activeAccounts ?? []} categories={categories ?? []} creditCards={creditCards ?? []} />}
      />
      <TransactionsManager
        rows={(rows ?? []) as unknown as Transaction[]}
        categories={categories ?? []}
        accounts={activeAccounts ?? []}
        creditCards={creditCards ?? []}
        currentFilters={{
          month: monthValue,
          type: searchParams?.type ?? '',
          category: searchParams?.category ?? '',
          payment: searchParams?.payment ?? '',
          q: searchParams?.q ?? ''
        }}
      />
      <div className="flex items-center justify-end gap-2 text-sm">
        {page > 1 ? (
          <Link href={makePaginationHref(page - 1)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800">
            Anterior
          </Link>
        ) : null}
        {hasNextPage ? (
          <Link href={makePaginationHref(page + 1)} className="rounded-lg border border-zinc-700 px-3 py-1.5 text-zinc-300 hover:bg-zinc-800">
            Próxima
          </Link>
        ) : null}
      </div>
    </section>
  );
}
