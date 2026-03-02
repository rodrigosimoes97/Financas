-- Ensure RLS stays enforced for credit entities
alter table public.credit_cards enable row level security;
alter table public.invoices enable row level security;
alter table public.installment_groups enable row level security;

-- idempotent policy creation
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_cards' AND policyname='credit_cards_select_own') THEN
    CREATE POLICY "credit_cards_select_own" ON public.credit_cards FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_cards' AND policyname='credit_cards_insert_own') THEN
    CREATE POLICY "credit_cards_insert_own" ON public.credit_cards FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_cards' AND policyname='credit_cards_update_own') THEN
    CREATE POLICY "credit_cards_update_own" ON public.credit_cards FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='credit_cards' AND policyname='credit_cards_delete_own') THEN
    CREATE POLICY "credit_cards_delete_own" ON public.credit_cards FOR DELETE USING (auth.uid() = user_id);
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='invoices_select_own') THEN
    CREATE POLICY "invoices_select_own" ON public.invoices FOR SELECT USING (
      EXISTS (SELECT 1 FROM public.credit_cards c WHERE c.id = invoices.credit_card_id AND c.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='invoices_insert_own') THEN
    CREATE POLICY "invoices_insert_own" ON public.invoices FOR INSERT WITH CHECK (
      EXISTS (SELECT 1 FROM public.credit_cards c WHERE c.id = invoices.credit_card_id AND c.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='invoices_update_own') THEN
    CREATE POLICY "invoices_update_own" ON public.invoices FOR UPDATE USING (
      EXISTS (SELECT 1 FROM public.credit_cards c WHERE c.id = invoices.credit_card_id AND c.user_id = auth.uid())
    ) WITH CHECK (
      EXISTS (SELECT 1 FROM public.credit_cards c WHERE c.id = invoices.credit_card_id AND c.user_id = auth.uid())
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='invoices' AND policyname='invoices_delete_own') THEN
    CREATE POLICY "invoices_delete_own" ON public.invoices FOR DELETE USING (
      EXISTS (SELECT 1 FROM public.credit_cards c WHERE c.id = invoices.credit_card_id AND c.user_id = auth.uid())
    );
  END IF;

  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='installment_groups' AND policyname='installment_groups_select_own') THEN
    CREATE POLICY "installment_groups_select_own" ON public.installment_groups FOR SELECT USING (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='installment_groups' AND policyname='installment_groups_insert_own') THEN
    CREATE POLICY "installment_groups_insert_own" ON public.installment_groups FOR INSERT WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='installment_groups' AND policyname='installment_groups_update_own') THEN
    CREATE POLICY "installment_groups_update_own" ON public.installment_groups FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='installment_groups' AND policyname='installment_groups_delete_own') THEN
    CREATE POLICY "installment_groups_delete_own" ON public.installment_groups FOR DELETE USING (auth.uid() = user_id);
  END IF;
END $$;

create or replace function public.create_credit_purchase(
  p_account_id uuid,
  p_category_id uuid,
  p_credit_card_id uuid,
  p_purchase_date date,
  p_description text,
  p_total_amount numeric,
  p_total_installments int default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_card record;
  v_first_ref date;
  v_group_id uuid;
  v_i int;
  v_count int;
  v_invoice record;
  v_installment_amount numeric(12,2);
  v_sum numeric(12,2) := 0;
  v_rows jsonb := '[]'::jsonb;
  v_ref_month date;
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select * into v_card
  from public.credit_cards
  where id = p_credit_card_id and user_id = v_user_id and is_archived = false;

  if not found then
    raise exception 'Cartão não encontrado';
  end if;

  if p_total_amount <= 0 then
    raise exception 'Valor inválido';
  end if;

  v_count := greatest(coalesce(p_total_installments, 1), 1);

  v_first_ref := date_trunc('month', p_purchase_date)::date;
  if extract(day from p_purchase_date) > v_card.closing_day then
    v_first_ref := (v_first_ref + interval '1 month')::date;
  end if;

  if v_count > 1 then
    insert into public.installment_groups(user_id, credit_card_id, purchase_date, description, total_amount, total_installments)
    values (v_user_id, p_credit_card_id, p_purchase_date, p_description, p_total_amount, v_count)
    returning id into v_group_id;
  end if;

  v_installment_amount := round((p_total_amount / v_count)::numeric, 2);

  for v_i in 1..v_count loop
    v_ref_month := (v_first_ref + make_interval(months => v_i - 1))::date;

    select * into v_invoice
    from public.get_or_create_invoice(p_credit_card_id, v_ref_month);

    if v_i = v_count then
      v_installment_amount := round((p_total_amount - v_sum)::numeric, 2);
    end if;

    insert into public.transactions (
      user_id, account_id, category_id, amount, type, description, date, payment_method,
      credit_card_id, invoice_id, installment_group_id, installment_number, total_installments
    ) values (
      v_user_id,
      p_account_id,
      p_category_id,
      v_installment_amount,
      'expense',
      case when v_count > 1 then concat(coalesce(p_description,''), ' (', v_i, '/', v_count, ')') else p_description end,
      (date_trunc('month', v_ref_month)::date),
      'credit',
      p_credit_card_id,
      v_invoice.id,
      v_group_id,
      case when v_count > 1 then v_i else null end,
      case when v_count > 1 then v_count else null end
    );

    update public.invoices i
    set total_amount = coalesce((
      select sum(t.amount)::numeric(12,2)
      from public.transactions t
      where t.invoice_id = i.id and t.payment_method = 'credit' and t.type = 'expense'
    ), 0),
    updated_at = now()
    where i.id = v_invoice.id;

    v_sum := v_sum + v_installment_amount;
    v_rows := v_rows || jsonb_build_array(jsonb_build_object('month', v_ref_month, 'value', v_installment_amount));
  end loop;

  return jsonb_build_object(
    'invoice_first_month', v_first_ref,
    'invoice_last_month', v_ref_month,
    'installments', v_rows
  );
end;
$$;

create or replace function public.simulate_credit_purchase(
  p_credit_card_id uuid,
  p_purchase_date date,
  p_total_amount numeric,
  p_total_installments int default 1,
  p_months_ahead int default 12
)
returns table(
  month date,
  total_before numeric,
  total_after numeric,
  delta numeric,
  exceeds_limit boolean
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_user_id uuid := auth.uid();
  v_card record;
  v_count int;
  v_i int;
  v_first_ref date;
  v_ref date;
  v_base_amount numeric(12,2);
  v_sum numeric(12,2) := 0;
  v_installment numeric(12,2);
begin
  if v_user_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select * into v_card from public.credit_cards where id = p_credit_card_id and user_id = v_user_id and is_archived = false;
  if not found then
    raise exception 'Cartão não encontrado';
  end if;

  v_count := greatest(coalesce(p_total_installments,1),1);
  v_first_ref := date_trunc('month', p_purchase_date)::date;
  if extract(day from p_purchase_date) > v_card.closing_day then
    v_first_ref := (v_first_ref + interval '1 month')::date;
  end if;

  v_base_amount := round((p_total_amount / v_count)::numeric, 2);

  for v_i in 1..least(v_count, greatest(coalesce(p_months_ahead,12),1)) loop
    v_ref := (v_first_ref + make_interval(months => v_i - 1))::date;

    if v_i = v_count then
      v_installment := round((p_total_amount - v_sum)::numeric, 2);
    else
      v_installment := v_base_amount;
    end if;

    return query
    with base as (
      select coalesce(sum(i.total_amount),0)::numeric(12,2) as total_before
      from public.invoices i
      where i.credit_card_id = p_credit_card_id and i.reference_month = v_ref
    )
    select
      v_ref as month,
      b.total_before,
      (b.total_before + v_installment)::numeric(12,2) as total_after,
      v_installment as delta,
      case when v_card.limit_amount is null then false else (b.total_before + v_installment) > v_card.limit_amount end as exceeds_limit
    from base b;

    v_sum := v_sum + v_installment;
  end loop;
end;
$$;

grant execute on function public.create_credit_purchase(uuid,uuid,uuid,date,text,numeric,int) to authenticated;
grant execute on function public.simulate_credit_purchase(uuid,date,numeric,int,int) to authenticated;
