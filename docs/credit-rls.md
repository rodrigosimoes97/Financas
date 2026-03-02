# RLS de Cartão de Crédito

Aplicado em `supabase/migrations/0004_credit_rpc_and_rls_hardening.sql`.

## Regras

- `credit_cards`: acesso apenas com `user_id = auth.uid()`.
- `installment_groups`: acesso apenas com `user_id = auth.uid()`.
- `invoices`: acesso por vínculo do cartão do usuário:
  - `EXISTS (SELECT 1 FROM credit_cards c WHERE c.id = invoices.credit_card_id AND c.user_id = auth.uid())`

## RPCs seguras

As funções abaixo são `SECURITY DEFINER` e **não recebem user_id do client**:

- `public.create_credit_purchase(...)`
- `public.simulate_credit_purchase(...)`

Ambas usam `auth.uid()` internamente para validar ownership do cartão.
