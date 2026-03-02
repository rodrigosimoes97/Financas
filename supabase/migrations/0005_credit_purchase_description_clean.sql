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
  v_card public.credit_cards%rowtype;
  v_invoice public.invoices%rowtype;
  v_group_id uuid;
  v_first_ref date;
  v_i int;
  v_count int;
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
      p_description,
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
