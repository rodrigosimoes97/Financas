# Deploy (Vercel + Supabase)

## Estratégia principal
- App principal: **Next.js App Router em runtime/server actions** no Vercel.
- Banco/Auth/Storage: Supabase.
- GitHub Pages: uso opcional somente para conteúdo estático (docs/marketing).

## Passo a passo
1. Criar projeto no Supabase e aplicar migrações (`supabase/migrations`).
2. Configurar variáveis de ambiente no Vercel (ver `.env.example`).
3. Configurar URL pública do app para auth redirect.
4. Rodar build (`npm run build`) e validar health do dashboard/transações/cartões.

## Observabilidade
- Preparar `SENTRY_DSN` e `NEXT_PUBLIC_SENTRY_DSN` (opcional imediato).
- Logs estruturados para ações críticas já suportados por ações de dashboard e transações.
