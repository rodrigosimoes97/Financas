# Finanças MVP

Personal finance app com Next.js 14 + Supabase, pronto para deploy principal no **Vercel + Supabase**.

## Features

- Autenticação por email/senha (Supabase Auth)
- Multi-tenant com RLS
- CRUD de transações, categorias, contas, cartões, metas
- Fluxo de cartão de crédito com parcelas/faturas
- Dashboard mensal consolidado
- Soft delete e trilha de auditoria para transações

## Stack

- Next.js 14 + TypeScript + App Router
- Supabase (Auth + Postgres + RLS)
- Tailwind CSS + Radix UI

## Estrutura relevante

```txt
app/
components/
lib/
  actions/
  domain/
  validation/
  supabase/
supabase/migrations/
docs/
```

## Setup local

1. `npm install`
2. Copie `.env.example` para `.env.local` e preencha os valores.
3. Aplique as migrações do diretório `supabase/migrations` em ordem.
4. Rode `npm run dev`.

## Deploy

- Guia: `docs/deployment.md`
- Segurança: `docs/security.md`
- Checklist de produção: `docs/production-checklist.md`

## Observação de hospedagem

- O app dinâmico (server actions/runtime) **não deve** ser convertido para static export.
- GitHub Pages é opcional para conteúdo estático (`/docs` ou `/marketing`).
