import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { CardsManager } from '@/components/cards/cards-manager';

export default async function CardsPage() {
  const supabase = await createClient();
  const month = new Date().toISOString().slice(0, 7) + '-01';
  const { data: cards } = await supabase.from('credit_cards').select('*').eq('is_archived', false).order('name');

  const cardsWithInvoice = await Promise.all((cards ?? []).map(async (card) => {
    const { data: inv } = await supabase
      .from('invoices')
      .select('total_amount,status')
      .eq('credit_card_id', card.id)
      .eq('reference_month', month)
      .maybeSingle();
    return { ...card, invoice: inv };
  }));

  return (
    <section className="space-y-5">
      <PageHeader title="Cartões" subtitle="Cadastre cartões, acompanhe faturas e parcelas." />
      <CardsManager cards={cardsWithInvoice} />
    </section>
  );
}
