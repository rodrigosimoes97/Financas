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
