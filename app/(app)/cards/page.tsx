import { createClient } from '@/lib/supabase/server';
import { PageHeader } from '@/components/app-shell/page-header';
import { CardsManager } from '@/components/cards/cards-manager';

export default async function CardsPage() {
  const supabase = await createClient();
  const { data: cards } = await supabase.from('credit_cards').select('*').eq('is_archived', false).order('name');

  return (
    <section className="space-y-5">
      <PageHeader title="Cartões" subtitle="Cadastre cartões e acesse as faturas de cada cartão." />
      <CardsManager cards={cards ?? []} />
    </section>
  );
}
