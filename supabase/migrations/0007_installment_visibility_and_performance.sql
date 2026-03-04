-- Normalize installment flags to avoid child rows leaking into generic transaction listings.
update public.transactions
set is_installment = true,
    installment_index = coalesce(installment_index, installment_number),
    installments_total = coalesce(installments_total, total_installments)
where installment_group_id is not null
  and (
    installment_number is not null
    or installment_index is not null
    or coalesce(total_installments, installments_total) is not null
  );

-- Attach orphan installment rows to their parent transaction when possible.
do $$
declare
  missing_group record;
begin
  with parent_by_group as (
    select
      t.installment_group_id,
      min(t.id) as parent_id
    from public.transactions t
    where t.installment_group_id is not null
      and coalesce(t.is_installment, false) = false
      and t.parent_transaction_id is null
      and t.installment_number is null
      and t.installment_index is null
    group by t.installment_group_id
  )
  update public.transactions child
  set parent_transaction_id = parent_by_group.parent_id,
      is_installment = true,
      installment_index = coalesce(child.installment_index, child.installment_number),
      installments_total = coalesce(child.installments_total, child.total_installments)
  from parent_by_group
  where child.installment_group_id = parent_by_group.installment_group_id
    and child.id <> parent_by_group.parent_id
    and (
      child.installment_number is not null
      or child.installment_index is not null
      or coalesce(child.total_installments, child.installments_total) is not null
    )
    and child.parent_transaction_id is null;

  for missing_group in
    select distinct child.installment_group_id
    from public.transactions child
    where child.installment_group_id is not null
      and (
        child.installment_number is not null
        or child.installment_index is not null
        or coalesce(child.total_installments, child.installments_total) is not null
      )
      and child.parent_transaction_id is null
      and not exists (
        select 1
        from public.transactions parent
        where parent.installment_group_id = child.installment_group_id
          and coalesce(parent.is_installment, false) = false
          and parent.parent_transaction_id is null
          and parent.installment_number is null
          and parent.installment_index is null
      )
  loop
    raise notice 'Installment group % has child transactions without a valid parent transaction.', missing_group.installment_group_id;
  end loop;
end $$;

create index if not exists idx_transactions_parent_listing
  on public.transactions(user_id, date desc, id desc)
  where parent_transaction_id is null
    and is_installment = false
    and installment_number is null
    and installment_index is null;

create index if not exists idx_transactions_invoice_installments
  on public.transactions(invoice_id, installment_number, installment_index)
  where invoice_id is not null;

alter table public.transactions
  drop constraint if exists transactions_installment_requires_parent;

alter table public.transactions
  add constraint transactions_installment_requires_parent
  check (is_installment = false or parent_transaction_id is not null);

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
  v_parent_id uuid;
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

  if v_count = 1 then
    select * into v_invoice
    from public.get_or_create_invoice(p_credit_card_id, v_first_ref);

    insert into public.transactions (
      user_id, account_id, category_id, amount, type, description, date, payment_method,
      credit_card_id, invoice_id, is_installment
    ) values (
      v_user_id,
      p_account_id,
      p_category_id,
      p_total_amount,
      'expense',
      p_description,
      p_purchase_date,
      'credit',
      p_credit_card_id,
      v_invoice.id,
      false
    ) returning id into v_parent_id;

    update public.invoices i
    set total_amount = coalesce((
      select sum(t.amount)::numeric(12,2)
      from public.transactions t
      where t.invoice_id = i.id and t.payment_method = 'credit' and t.type = 'expense'
    ), 0),
    updated_at = now()
    where i.id = v_invoice.id;

    return jsonb_build_object(
      'parent_transaction_id', v_parent_id,
      'invoice_first_month', v_first_ref,
      'invoice_last_month', v_first_ref,
      'installments', jsonb_build_array(jsonb_build_object('month', v_first_ref, 'value', p_total_amount))
    );
  end if;

  insert into public.installment_groups(user_id, credit_card_id, purchase_date, description, total_amount, total_installments)
  values (v_user_id, p_credit_card_id, p_purchase_date, p_description, p_total_amount, v_count)
  returning id into v_group_id;

  insert into public.transactions (
    user_id, account_id, category_id, amount, type, description, date, payment_method,
    credit_card_id, installment_group_id, total_installments, installments_total,
    parent_transaction_id, is_installment
  ) values (
    v_user_id,
    p_account_id,
    p_category_id,
    p_total_amount,
    'expense',
    p_description,
    p_purchase_date,
    'credit',
    p_credit_card_id,
    v_group_id,
    v_count,
    v_count,
    null,
    false
  ) returning id into v_parent_id;

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
      credit_card_id, invoice_id, installment_group_id, installment_number, total_installments,
      parent_transaction_id, is_installment, installment_index, installments_total
    ) values (
      v_user_id,
      p_account_id,
      p_category_id,
      v_installment_amount,
      'expense',
      p_description,
      (date_trunc('month', v_ref_month)::date),
      'credit',
      p_credit_card_id,
      v_invoice.id,
      v_group_id,
      v_i,
      v_count,
      v_parent_id,
      true,
      v_i,
      v_count
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
    'parent_transaction_id', v_parent_id,
    'invoice_first_month', v_first_ref,
    'invoice_last_month', v_ref_month,
    'installments', v_rows
  );
end;
$$;
