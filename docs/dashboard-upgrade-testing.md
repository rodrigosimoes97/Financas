# Dashboard v2 (Forecast + Insights + Investimentos) — Como testar

1. Rode as migrações:
   - `supabase db push` (ou o fluxo de migração que você já usa).
2. (Opcional) Recarregue o schema cache da API no Supabase:
   - Settings → API → Reload schema cache.
3. Insira dados de teste com o seed SQL:
   - `psql "$SUPABASE_DB_URL" -f supabase/seeds/dashboard_v2_seed.sql`
4. Inicie o app:
   - `npm run dev`
5. Abra `/dashboard` e valide:
   - Card de previsão muda conforme o dia.
   - “Para onde seu dinheiro está indo?” mostra donut + essenciais/não essenciais + mix.
   - Insights exibe no máximo 3 itens.
   - Metas de investimento mostram progresso, aporte do mês e sugestão mensal.
6. Valide rede/queries:
   - Dashboard deve chamar principalmente `get_dashboard_summary` (+ auth/session).

## Cenários de aceite
- Sem erro de schema cache para as RPCs novas.
- RLS: usuário só vê seus próprios dados.
- Forecast, insights e metas mudam ao alterar transações/aportes.
- Mutations invalidam cache do dashboard.

## Diagnóstico e correção do schema cache (RPC)
Execute no SQL Editor do Supabase:

```sql
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) AS args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'get_dashboard_summary'
ORDER BY 1, 2;
```

Resultado esperado após migração:
- apenas `public.get_dashboard_summary(p_user_id uuid, p_month_start date, p_next_month_start date, p_today date)`

Teste de execução:

```sql
SELECT public.get_dashboard_summary(
  '<uuid-do-usuario-logado>'::uuid,
  '2026-03-01'::date,
  '2026-04-01'::date,
  now()::date
);
```

Depois, em **Settings → API → Reload schema cache**.

## Correção: acesso negado com Service Role
Diagnóstico da assinatura em produção:

```sql
SELECT n.nspname, p.proname, pg_get_function_identity_arguments(p.oid) args
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE p.proname = 'get_dashboard_summary';
```

Após aplicar a migração `0014_allow_service_role_dashboard_summary.sql`, o comportamento esperado é:
- JWT role `service_role`: execução permitida sem `auth.uid()`.
- Demais roles: exige `auth.uid() = p_user_id`.

Permissões esperadas:
- `authenticated`: execute
- `service_role`: execute
- `anon`: sem execute

Recarregue cache da API no Supabase: **Settings → API → Reload schema cache**.

## Checklist obrigatório (cookies/cache/auth)
1. Com usuário logado, execute `debug_request_context` via client normal e confirme `auth_uid` preenchido.
2. No server-side (admin client), execute `debug_request_context` e confirme `service_role` em pelo menos um campo (`auth_role` ou `current_user` ou `jwt_role_claim`).
3. Abra `/dashboard` e valide: sem erro de `cookies inside unstable_cache`, sem `Acesso negado`, e summary carregando normalmente.
