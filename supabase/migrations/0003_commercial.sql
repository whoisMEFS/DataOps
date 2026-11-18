-- =====================================================================
-- DataOps | 0003_commercial.sql
-- Comercial: vendedores, canais, pedidos, leads (funil), metas e
-- pipeline aberto. Ticket médio, conversão e % de meta são CALCULADOS.
-- =====================================================================

create table public.sellers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  active      boolean not null default true,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index sellers_name_uidx on public.sellers (lower(name));
create index sellers_created_by_idx on public.sellers (created_by);

create table public.sales_channels (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 1 and 80),
  active      boolean not null default true,
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create unique index sales_channels_name_uidx on public.sales_channels (lower(name));
create index sales_channels_created_by_idx on public.sales_channels (created_by);

-- Pedidos fechados (receita de vendas).
create table public.sales_orders (
  id           uuid primary key default gen_random_uuid(),
  external_id  text not null unique check (char_length(external_id) between 1 and 60),
  order_date   date not null,
  seller_id    uuid not null references public.sellers (id) on delete restrict,
  channel_id   uuid not null references public.sales_channels (id) on delete restrict,
  customer     text not null default '' check (char_length(customer) <= 120),
  amount       numeric(14,2) not null check (amount > 0),
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now()
);
create index sales_orders_date_idx       on public.sales_orders (order_date);
create index sales_orders_seller_idx     on public.sales_orders (seller_id);
create index sales_orders_channel_idx    on public.sales_orders (channel_id);
create index sales_orders_created_by_idx on public.sales_orders (created_by);

-- Leads: o funil (leads -> qualificados -> reuniões -> propostas -> pedidos)
-- e o ciclo de venda saem das datas de cada etapa.
create table public.sales_leads (
  id            uuid primary key default gen_random_uuid(),
  external_id   text not null unique check (char_length(external_id) between 1 and 60),
  created_on    date not null,
  seller_id     uuid not null references public.sellers (id) on delete restrict,
  channel_id    uuid not null references public.sales_channels (id) on delete restrict,
  qualified_on  date check (qualified_on is null or qualified_on >= created_on),
  meeting_on    date check (meeting_on   is null or meeting_on   >= created_on),
  proposal_on   date check (proposal_on  is null or proposal_on  >= created_on),
  order_id      uuid references public.sales_orders (id) on delete set null,
  created_by    uuid default auth.uid() references auth.users (id) on delete set null,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index sales_leads_created_on_idx  on public.sales_leads (created_on);
create index sales_leads_seller_idx      on public.sales_leads (seller_id);
create index sales_leads_channel_idx     on public.sales_leads (channel_id);
create index sales_leads_order_idx       on public.sales_leads (order_id);
create index sales_leads_created_by_idx  on public.sales_leads (created_by);

create trigger set_updated_at
  before update on public.sales_leads
  for each row execute function public.set_updated_at();

-- Meta mensal por vendedor x canal.
create table public.sales_goals (
  id          uuid primary key default gen_random_uuid(),
  month       date not null check (extract(day from month) = 1),
  seller_id   uuid not null references public.sellers (id) on delete restrict,
  channel_id  uuid not null references public.sales_channels (id) on delete restrict,
  amount      numeric(14,2) not null check (amount >= 0),
  created_by  uuid default auth.uid() references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (month, seller_id, channel_id)
);
create index sales_goals_seller_idx     on public.sales_goals (seller_id);
create index sales_goals_channel_idx    on public.sales_goals (channel_id);
create index sales_goals_created_by_idx on public.sales_goals (created_by);

-- Pipeline aberto. "Dias parado" é calculado de last_activity_on (view v_deals).
create table public.deals (
  id                uuid primary key default gen_random_uuid(),
  external_id       text not null unique check (char_length(external_id) between 1 and 60),
  customer          text not null check (char_length(customer) between 1 and 120),
  stage             text not null check (char_length(stage) between 1 and 40),
  amount            numeric(14,2) not null check (amount > 0),
  probability       smallint not null check (probability between 0 and 100),
  seller_id         uuid not null references public.sellers (id) on delete restrict,
  channel_id        uuid not null references public.sales_channels (id) on delete restrict,
  last_activity_on  date not null,
  created_by        uuid default auth.uid() references auth.users (id) on delete set null,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index deals_seller_idx     on public.deals (seller_id);
create index deals_channel_idx    on public.deals (channel_id);
create index deals_created_by_idx on public.deals (created_by);

create trigger set_updated_at
  before update on public.deals
  for each row execute function public.set_updated_at();

-- RLS: leitura para qualquer autenticado; escrita pelo autor.
do $$
declare t text;
begin
  foreach t in array array['sellers', 'sales_channels', 'sales_orders', 'sales_leads', 'sales_goals', 'deals'] loop
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
