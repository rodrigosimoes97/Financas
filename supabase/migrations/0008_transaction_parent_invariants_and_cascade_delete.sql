-- Normalize parent rows so they are never mistaken for installments.
update public.transactions parent_tx
set is_installment = false,
    parent_transaction_id = null,
    installment_number = null,
    installment_index = null,
    invoice_id = null
where coalesce(parent_tx.is_installment, false) = false
  and parent_tx.parent_transaction_id is null
  and exists (
    select 1
    from public.transactions child_tx
    where child_tx.parent_transaction_id = parent_tx.id
  );

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
  v_group_id uuid;
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
    select *
    into v_target
    from public.transactions t
    where t.id = v_target.parent_transaction_id
      and t.user_id = v_actor_id;

    if not found then
      raise exception 'Transação pai não encontrada';
    end if;

    v_parent_id := v_target.id;
  end if;

  v_group_id := v_target.installment_group_id;

  create temporary table if not exists tmp_affected_invoices (
    invoice_id uuid primary key
  ) on commit drop;

  truncate tmp_affected_invoices;

  with deleted_children as (
    delete from public.transactions child
    where child.user_id = v_actor_id
      and child.is_installment = true
      and (
        child.parent_transaction_id = v_parent_id
        or (v_group_id is not null and child.installment_group_id = v_group_id)
      )
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

grant execute on function public.delete_transaction_cascade(uuid, uuid) to authenticated;
