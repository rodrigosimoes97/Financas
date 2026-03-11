# Production checklist

- [ ] Variáveis de ambiente preenchidas no Vercel e Supabase.
- [ ] Migrações aplicadas em ordem (incluindo `0021_financial_integrity_soft_delete_audit.sql`).
- [ ] RLS validada com usuário A/B (sem cross-tenant).
- [ ] Seeds executadas apenas em ambiente de desenvolvimento.
- [ ] Auditoria (`audit_log`) gravando eventos de transações.
- [ ] Monitoramento e alertas configurados (Sentry/Logs).
- [ ] Estratégia de backup do banco ativa.
- [ ] Plano de rollback documentado (restore + reversão de release).
