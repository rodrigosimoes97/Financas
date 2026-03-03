alter table public.credit_cards
  add column if not exists archived_at timestamptz;

create index if not exists idx_credit_cards_user_archived
  on public.credit_cards(user_id, archived_at, name);

-- Backfill legacy archived flag to timestamp-based archive
update public.credit_cards
set archived_at = coalesce(archived_at, now())
where is_archived = true
  and archived_at is null;
