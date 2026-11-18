-- =====================================================================
-- DataOps | 0004_logistics.sql
-- Logística: centros, transportadoras, entregas, metas e estoque.
-- Entregue / atrasado / aberto, pontualidade e custo médio são CALCULADOS.
-- =====================================================================

create table public.distribution_centers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  active      boolean not null default true,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index distribution_centers_name_uidx on public.distribution_centers (lower(name));
create index distribution_centers_created_by_idx on public.distribution_centers (created_by);

create table public.carriers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  active      boolean not null default true,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index carriers_name_uidx on public.carriers (lower(name));
create index carriers_created_by_idx on public.carriers (created_by);

-- Uma linha por pedido/entrega. delivered_on nulo = ainda em aberto/em rota.
create table public.shipments (
  id            uuid primary key default gen_random_uuid(),
  order_number  text not null unique check (char_length(order_number) between 1 and 40),
  center_id     uuid not null references public.distribution_centers (id) on delete restrict,
  carrier_id    uuid not null references public.carriers (id) on delete restrict,
  origin        text not null check (char_length(origin) between 1 and 80),
  destination   text not null check (char_length(destination) between 1 and 80),
  via           text not null default '' check (char_length(via) <= 80),
  ordered_on    date not null,
  promised_on   date not null check (promised_on >= ordered_on),
  delivered_on  date check (delivered_on is null or delivered_on >= ordered_on),
  eta_at        timestamptz,
  freight_cost  numeric(12,2) not null default 0 check (freight_cost >= 0),
  progress_pct  smallint check (progress_pct is null or progress_pct between 0 and 100),
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index shipments_ordered_on_idx on public.shipments (ordered_on);
create index shipments_center_idx     on public.shipments (center_id);
create index shipments_carrier_idx    on public.shipments (carrier_id);
create index shipments_open_idx       on public.shipments (promised_on) where delivered_on is null;
create index shipments_created_by_idx on public.shipments (created_by);

create trigger set_updated_at
  before update on public.shipments
  for each row execute function public.set_updated_at();

-- Meta mensal de pedidos por centro.
create table public.logistics_goals (
  id             uuid primary key default gen_random_uuid(),
  month          date not null check (extract(day from month) = 1),
  center_id      uuid not null references public.distribution_centers (id) on delete restrict,
  target_orders  integer not null check (target_orders >= 0),
  created_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  unique (month, center_id)
);
create index logistics_goals_center_idx     on public.logistics_goals (center_id);
create index logistics_goals_created_by_idx on public.logistics_goals (created_by);

-- Estoque atual por categoria (posição corrente, não histórico).
create table public.stock_levels (
  category    text primary key check (char_length(category) between 1 and 80),
  quantity    integer not null check (quantity >= 0),
  minimum     integer not null check (minimum >= 0),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index stock_levels_created_by_idx on public.stock_levels (created_by);

create trigger set_updated_at
  before update on public.stock_levels
  for each row execute function public.set_updated_at();

-- RLS: leitura para qualquer autenticado; escrita pelo autor.
do $$
declare t text;
begin
  foreach t in array array['distribution_centers', 'carriers', 'shipments', 'logistics_goals', 'stock_levels'] loop
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
