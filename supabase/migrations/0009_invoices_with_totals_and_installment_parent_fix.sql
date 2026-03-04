create or replace view public.invoices_with_totals as
select
  i.id,
  i.credit_card_id,
  i.reference_month,
  i.closing_date,
  i.due_date,
  i.status,
  i.created_at,
  i.updated_at,
  coalesce(sum(t.amount), 0)::numeric(12,2) as total_amount,
  count(t.id)::int as transactions_count
from public.invoices i
join public.transactions t
  on t.invoice_id = i.id
 and t.payment_method = 'credit'
 and t.type = 'expense'
group by i.id
having count(t.id) > 0;

grant select on public.invoices_with_totals to authenticated;

update public.transactions
set installment_group_id = null
where parent_transaction_id is null
  and coalesce(is_installment, false) = false;

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
      credit_card_id, invoice_id, is_installment, installment_group_id, installment_number,
      installment_index, parent_transaction_id, total_installments, installments_total
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
      false,
      null,
      null,
      null,
      null,
      1,
      1
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

  insert into public.transactions (
    user_id, account_id, category_id, amount, type, description, date, payment_method,
    credit_card_id, installment_group_id, total_installments, installments_total,
    parent_transaction_id, is_installment, installment_number, installment_index, invoice_id
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
    null,
    v_count,
    v_count,
    null,
    false,
    null,
    null,
    null
  ) returning id into v_parent_id;

  insert into public.installment_groups(user_id, credit_card_id, purchase_date, description, total_amount, total_installments)
  values (v_user_id, p_credit_card_id, p_purchase_date, p_description, p_total_amount, v_count)
  returning id into v_group_id;

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

create or replace function public.delete_transaction_cascade(
  p_transaction_id uuid,
  p_user_id uuid
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := coalesce(auth.uid(), p_user_id);
  v_target record;
  v_parent_id uuid;
  v_invoice_id uuid;
begin
  if v_actor_id is null then
    raise exception 'Usuário não autenticado';
  end if;

  select *
  into v_target
  from public.transactions t
  where t.id = p_transaction_id
    and t.user_id = v_actor_id;

  if not found then
    raise exception 'Transação não encontrada';
  end if;

  if v_target.parent_transaction_id is null then
    v_parent_id := v_target.id;
  else
    v_parent_id := v_target.parent_transaction_id;
  end if;

  create temporary table if not exists tmp_affected_invoices (
    invoice_id uuid primary key
  ) on commit drop;

  truncate tmp_affected_invoices;

  with deleted_children as (
    delete from public.transactions child
    where child.user_id = v_actor_id
      and child.is_installment = true
      and child.parent_transaction_id = v_parent_id
    returning child.invoice_id
  )
  insert into tmp_affected_invoices(invoice_id)
  select distinct invoice_id
  from deleted_children
  where invoice_id is not null;

  delete from public.transactions parent
  where parent.id = v_parent_id
    and parent.user_id = v_actor_id;

  for v_invoice_id in select invoice_id from tmp_affected_invoices loop
    if exists (
      select 1
      from public.transactions t
      where t.invoice_id = v_invoice_id
    ) then
      update public.invoices i
      set total_amount = coalesce((
        select sum(t.amount)::numeric(12,2)
        from public.transactions t
        where t.invoice_id = i.id
          and t.payment_method = 'credit'
          and t.type = 'expense'
      ), 0),
      updated_at = now()
      where i.id = v_invoice_id;
    else
      delete from public.invoices i
      where i.id = v_invoice_id;
    end if;
  end loop;
end;
$$;
