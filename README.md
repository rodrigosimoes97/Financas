# Finanças MVP

Personal Finance MVP built with Next.js 14 App Router + Supabase.

## Features

- Email/password authentication with Supabase Auth
- Secure multi-tenant data with Row Level Security
- Transactions CRUD
- Categories CRUD
- Goals CRUD (monthly limits per category)
- Monthly dashboard with:
  - Total income
  - Total expenses
  - Current balance
  - Expense pie chart by category
- Dark mode UI by default
- Responsive layout + sidebar navigation + quick-add transaction modal

## Tech Stack

- Next.js 14 + TypeScript
- Supabase (Auth + Postgres)
- Tailwind CSS
- Recharts
- Radix Dialog

## Project Structure

```txt
app/
  (auth)/login, signup
  (app)/dashboard, transactions, categories, goals
components/
  dashboard/
  forms/
  layout/
lib/
  actions/
  supabase/
supabase/migrations/
types/
```

## Setup

1. Install dependencies

```bash
npm install
```

2. Create `.env.local`

```bash
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

3. Run SQL migration in Supabase SQL editor:

- `supabase/migrations/0001_init_financas.sql`

4. Start app

```bash
npm run dev
```

## Security Notes

- All data tables (`accounts`, `categories`, `transactions`, `goals`) have RLS enabled.
- Policies restrict data access to `auth.uid() = user_id` for select/insert/update/delete.
- Trigger creates default account + starter categories on user signup.

## Implementation Notes

- Server Components are default for pages and data fetching.
- Client Components are only used for interactive chart + modal.
- Server Actions are used for CRUD operations.
- Financial totals are centralized in `lib/utils.ts`.
