-- =====================================================================
-- DataOps | 0002_finance.sql
-- Financeiro: lançamentos, orçamento mensal, contas a pagar/receber e
-- saldo inicial. Saldos, KPIs e inadimplência são CALCULADOS (0006).
-- =====================================================================

-- Receitas e despesas realizadas (substitui INCOME e EXPENSE do demo).
create table public.fin_transactions (
  id           uuid primary key default gen_random_uuid(),
  external_id  text not null unique check (char_length(external_id) between 1 and 60),
  kind         text not null check (kind in ('income', 'expense')),
  category     text not null check (char_length(category) between 1 and 80),
  amount       numeric(14,2) not null check (amount > 0),
  occurred_on  date not null,
  description  text not null default '' check (char_length(description) <= 200),
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index fin_transactions_kind_date_idx on public.fin_transactions (kind, occurred_on);
create index fin_transactions_date_idx      on public.fin_transactions (occurred_on);
create index fin_transactions_created_by_idx on public.fin_transactions (created_by);

-- Orçamento MENSAL por categoria de despesa.
create table public.fin_budgets (
  id          uuid primary key default gen_random_uuid(),
  category    text not null check (char_length(category) between 1 and 80),
  month       date not null check (extract(day from month) = 1),
  amount      numeric(14,2) not null check (amount >= 0),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (category, month)
);
create index fin_budgets_created_by_idx on public.fin_budgets (created_by);

-- Contas a pagar e a receber. settled_on nulo = em aberto.
create table public.fin_titles (
  id            uuid primary key default gen_random_uuid(),
  external_id   text not null unique check (char_length(external_id) between 1 and 60),
  kind          text not null check (kind in ('payable', 'receivable')),
  counterparty  text not null check (char_length(counterparty) between 1 and 120),
  category      text not null check (char_length(category) between 1 and 80),
  amount        numeric(14,2) not null check (amount > 0),
  due_date      date not null,
  settled_on    date,
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index fin_titles_open_idx on public.fin_titles (kind, due_date) where settled_on is null;
create index fin_titles_created_by_idx on public.fin_titles (created_by);

create trigger set_updated_at
  before update on public.fin_titles
  for each row execute function public.set_updated_at();

-- Saldo em caixa no início de uma data (substitui OPENING_BALANCE).
create table public.fin_opening_balance (
  as_of       date primary key,
  amount      numeric(14,2) not null,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index fin_opening_balance_created_by_idx on public.fin_opening_balance (created_by);

-- RLS: leitura para qualquer autenticado; escrita pelo autor.
do $$
declare t text;
begin
  foreach t in array array['fin_transactions', 'fin_budgets', 'fin_titles', 'fin_opening_balance'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format('create policy %I on public.%I for select to authenticated using (true)', t || '_select', t);
    execute format('create policy %I on public.%I for insert to authenticated with check (created_by = (select auth.uid()))', t || '_insert', t);
    execute format('create policy %I on public.%I for update to authenticated using (created_by = (select auth.uid())) with check (created_by = (select auth.uid()))', t || '_update', t);
    execute format('create policy %I on public.%I for delete to authenticated using (created_by = (select auth.uid()))', t || '_delete', t);
  end loop;
end
$$;
