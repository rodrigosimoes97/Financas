-- Seed simples para validar dashboard v2
-- Ajuste o UUID para um usuário real do seu ambiente antes de executar.

-- Exemplo:
-- \set user_id '00000000-0000-0000-0000-000000000000'

do $$
declare
  v_user uuid := :'user_id';
  v_account uuid;
  v_cat_salary uuid;
  v_cat_food uuid;
  v_cat_rent uuid;
  v_cat_fun uuid;
  v_goal uuid;
begin
  select id into v_account from public.accounts where user_id = v_user limit 1;

  if v_account is null then
    insert into public.accounts(user_id, name) values (v_user, 'Conta principal') returning id into v_account;
  end if;

  insert into public.categories(user_id, name, type, is_essential)
  values
    (v_user, 'Salário', 'income', true),
    (v_user, 'Alimentação', 'expense', true),
    (v_user, 'Moradia', 'expense', true),
    (v_user, 'Lazer', 'expense', false)
  on conflict (user_id, name, type) do nothing;

  select id into v_cat_salary from public.categories where user_id=v_user and name='Salário' and type='income' limit 1;
  select id into v_cat_food from public.categories where user_id=v_user and name='Alimentação' and type='expense' limit 1;
  select id into v_cat_rent from public.categories where user_id=v_user and name='Moradia' and type='expense' limit 1;
  select id into v_cat_fun from public.categories where user_id=v_user and name='Lazer' and type='expense' limit 1;

  insert into public.transactions(user_id, account_id, category_id, amount, type, payment_method, description, date, invoice_month)
  values
    (v_user, v_account, v_cat_salary, 8000, 'income', 'pix', 'Salário mensal', date_trunc('month', current_date)::date + 1, date_trunc('month', current_date)::date),
    (v_user, v_account, v_cat_rent, 2200, 'expense', 'pix', 'Aluguel', date_trunc('month', current_date)::date + 3, date_trunc('month', current_date)::date),
    (v_user, v_account, v_cat_food, 980, 'expense', 'debit', 'Mercado', date_trunc('month', current_date)::date + 6, date_trunc('month', current_date)::date),
    (v_user, v_account, v_cat_food, 320, 'expense', 'pix', 'Restaurante', date_trunc('month', current_date)::date + 9, date_trunc('month', current_date)::date),
    (v_user, v_account, v_cat_fun, 450, 'expense', 'credit', 'Streaming e lazer', date_trunc('month', current_date)::date + 11, date_trunc('month', current_date)::date),
    (v_user, v_account, v_cat_food, 760, 'expense', 'debit', 'Mercado mês anterior', (date_trunc('month', current_date) - interval '1 month')::date + 8, (date_trunc('month', current_date) - interval '1 month')::date)
  on conflict do nothing;

  insert into public.goals(user_id, category_id, monthly_limit, target_amount, current_amount, month, type, name)
  values (v_user, v_cat_food, 1200, 1200, 0, date_trunc('month', current_date)::date, 'SPEND_LIMIT', 'Limite Alimentação')
  on conflict (user_id,month,type,category_id) do update
    set monthly_limit = excluded.monthly_limit,
        target_amount = excluded.target_amount;

  insert into public.investment_goals(user_id, name, target_amount, current_amount, start_date, target_date, monthly_contribution_target, risk_profile)
  values
    (v_user, 'Reserva Emergência', 15000, 2500, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '18 months')::date, 700, 'conservative'),
    (v_user, 'Viagem internacional', 10000, 1000, date_trunc('month', current_date)::date, (date_trunc('month', current_date) + interval '10 months')::date, 900, 'moderate')
  on conflict do nothing;

  select id into v_goal from public.investment_goals where user_id=v_user and name='Reserva Emergência' limit 1;
  if v_goal is not null then
    insert into public.investment_contributions(user_id, goal_id, amount, date, source)
    values
      (v_user, v_goal, 500, date_trunc('month', current_date)::date + 5, 'pix'),
      (v_user, v_goal, 300, date_trunc('month', current_date)::date + 12, 'debit')
    on conflict do nothing;
  end if;
end $$;
