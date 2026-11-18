-- =====================================================================
-- DataOps | 0005_it.sql
-- TI: serviços, dependências e incidentes. MTTA/MTTR e contagens por
-- severidade são CALCULADOS a partir dos timestamps.
-- =====================================================================

create table public.it_services (
  id                text primary key check (id ~ '^[a-z0-9-]{1,60}$'),
  team              text not null check (char_length(team) between 1 and 60),
  requests_per_sec  numeric(12,1) check (requests_per_sec is null or requests_per_sec >= 0),
  map_x             numeric(5,2) check (map_x is null or map_x between 0 and 100),
  map_y             numeric(5,2) check (map_y is null or map_y between 0 and 100),
  created_by        uuid default auth.uid() references auth.users (id) on delete set null,
  created_at        timestamptz not null default now()
);
create index it_services_created_by_idx on public.it_services (created_by);

-- (service_id depende de depends_on_id)
create table public.it_service_dependencies (
  service_id     text not null references public.it_services (id) on delete cascade,
  depends_on_id  text not null references public.it_services (id) on delete cascade,
  created_by     uuid default auth.uid() references auth.users (id) on delete set null,
  created_at     timestamptz not null default now(),
  primary key (service_id, depends_on_id),
  check (service_id <> depends_on_id)
);
create index it_service_dependencies_dep_idx        on public.it_service_dependencies (depends_on_id);
create index it_service_dependencies_created_by_idx on public.it_service_dependencies (created_by);

create table public.it_incidents (
  id                  uuid primary key default gen_random_uuid(),
  code                text not null unique check (char_length(code) between 1 and 30),
  title               text not null check (char_length(title) between 1 and 200),
  service_id          text not null references public.it_services (id) on delete restrict,
  severity            smallint not null check (severity between 1 and 3),
  status              text not null check (status in ('triggered', 'ack', 'mitigated', 'resolved')),
  owner               text check (owner is null or char_length(owner) <= 60),
  opened_at           timestamptz not null,
  acknowledged_at     timestamptz check (acknowledged_at is null or acknowledged_at >= opened_at),
  resolved_at         timestamptz check (resolved_at is null or resolved_at >= opened_at),
  cause               text check (cause is null or char_length(cause) <= 80),
  auto_resolved       boolean not null default false,
  reopened            boolean not null default false,
  hypothesis_summary  text check (hypothesis_summary is null or char_length(hypothesis_summary) <= 300),
  hypothesis_detail   text check (hypothesis_detail   is null or char_length(hypothesis_detail)   <= 1000),
  created_by          uuid default auth.uid() references auth.users (id) on delete set null,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  check (status <> 'resolved' or resolved_at is not null)
);
create index it_incidents_opened_idx     on public.it_incidents (opened_at desc);
create index it_incidents_service_idx    on public.it_incidents (service_id);
create index it_incidents_status_idx     on public.it_incidents (status);
create index it_incidents_created_by_idx on public.it_incidents (created_by);

create trigger set_updated_at
  before update on public.it_incidents
  for each row execute function public.set_updated_at();

-- RLS: leitura para qualquer autenticado; escrita pelo autor.
do $$
declare t text;
begin
  foreach t in array array['it_services', 'it_service_dependencies', 'it_incidents'] loop
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
