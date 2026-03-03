-- Soft delete for accounts
alter table public.accounts
  add column if not exists archived_at timestamptz;

create index if not exists idx_accounts_user_active
  on public.accounts(user_id, archived_at, name);

-- Parent/child modeling for installments
alter table public.transactions
  add column if not exists parent_transaction_id uuid references public.transactions(id) on delete set null,
  add column if not exists is_installment boolean not null default false,
  add column if not exists installments_total int,
  add column if not exists installment_index int;

create index if not exists idx_transactions_parent on public.transactions(parent_transaction_id);
create index if not exists idx_transactions_user_parent on public.transactions(user_id, parent_transaction_id, is_installment, date desc);

-- Backfill legacy installment rows and create representative parent transactions.
update public.transactions
set is_installment = true,
    installment_index = coalesce(installment_index, installment_number),
    installments_total = coalesce(installments_total, total_installments)
where installment_group_id is not null;

do $$
declare
  group_row record;
  new_parent_id uuid;
begin
  for group_row in
    select
      t.user_id,
      t.installment_group_id,
      min(t.account_id) as account_id,
      min(t.category_id) as category_id,
      min(t.credit_card_id) as credit_card_id,
      min(t.description) as description,
      min(t.date) as purchase_date,
      min(t.created_at) as created_at,
      max(coalesce(t.installments_total, t.total_installments)) as installments_total,
      sum(t.amount)::numeric(12,2) as total_amount
    from public.transactions t
    where t.installment_group_id is not null
      and t.parent_transaction_id is null
      and t.is_installment = true
    group by t.user_id, t.installment_group_id
  loop
    if not exists (
      select 1
      from public.transactions p
      where p.installment_group_id = group_row.installment_group_id
        and p.parent_transaction_id is null
        and p.is_installment = false
    ) then
      insert into public.transactions (
        user_id,
        account_id,
        category_id,
        amount,
        type,
        payment_method,
        credit_card_id,
        description,
        date,
        created_at,
        installment_group_id,
        installments_total
      ) values (
        group_row.user_id,
        group_row.account_id,
        group_row.category_id,
        group_row.total_amount,
        'expense',
        'credit',
        group_row.credit_card_id,
        regexp_replace(coalesce(group_row.description, ''), '\s*\([0-9]+/[0-9]+\)$', ''),
        group_row.purchase_date,
        group_row.created_at,
        group_row.installment_group_id,
        group_row.installments_total
      )
      returning id into new_parent_id;
    else
      select p.id into new_parent_id
      from public.transactions p
      where p.installment_group_id = group_row.installment_group_id
        and p.parent_transaction_id is null
        and p.is_installment = false
      limit 1;
    end if;

    update public.transactions
    set parent_transaction_id = new_parent_id,
        is_installment = true
    where installment_group_id = group_row.installment_group_id
      and id <> new_parent_id
      and (parent_transaction_id is null or parent_transaction_id <> new_parent_id);
  end loop;
end $$;

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

  if v_count > 1 then
    insert into public.installment_groups(user_id, credit_card_id, purchase_date, description, total_amount, total_installments)
    values (v_user_id, p_credit_card_id, p_purchase_date, p_description, p_total_amount, v_count)
    returning id into v_group_id;
  end if;

  insert into public.transactions (
    user_id, account_id, category_id, amount, type, description, date, payment_method,
    credit_card_id, installment_group_id, installments_total
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
    case when v_count > 1 then v_count else null end
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
      case when v_count > 1 then concat(coalesce(p_description,''), ' (', v_i, '/', v_count, ')') else p_description end,
      (date_trunc('month', v_ref_month)::date),
      'credit',
      p_credit_card_id,
      v_invoice.id,
      v_group_id,
      case when v_count > 1 then v_i else null end,
      case when v_count > 1 then v_count else null end,
      v_parent_id,
      v_count > 1,
      case when v_count > 1 then v_i else null end,
      case when v_count > 1 then v_count else null end
    );

    update public.invoices i
    set total_amount = coalesce((
      select sum(t.amount)::numeric(12,2)
      from public.transactions t
      where t.invoice_id = i.id and t.payment_method = 'credit' and t.type = 'expense'
        and (t.is_installment = true or t.parent_transaction_id is null)
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
