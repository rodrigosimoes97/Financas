# Security model (produção)

## Camadas aplicadas
- **RLS em todas as tabelas financeiras** (`accounts`, `categories`, `transactions`, `credit_cards`, `invoices`, `goals`, `goal_contributions`, `audit_log`).
- **Server Actions com validação de ownership**: operações críticas exigem usuário autenticado e `user_id` no filtro de update/delete.
- **Validação de payload na borda**: parsing centralizado em `lib/validation/schemas.ts` para transações e filtros.
- **Auditoria mínima**: `audit_log` registra criação, atualização, soft delete e delete de transações.

## Regras importantes
- Nenhuma mutação crítica depende apenas de dados vindos do client.
- Valores monetários são normalizados com precisão de centavos antes de persistir.
- Campos textuais são sanitizados (trim + limite).

## Próximos passos recomendados
- Ativar CSP estrita por ambiente em `next.config.mjs`.
- Conectar Sentry DSN em produção.
- Monitorar eventos de `audit_log` para anomalias (ex.: exclusões em lote).
