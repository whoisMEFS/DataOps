-- =====================================================================
-- DataOps | 0001_core.sql
-- Núcleo: funções auxiliares, perfis, preferências, notificações e
-- registros da Central de Dados.
--
-- Esta migration só CRIA objetos. Não apaga nem altera dados existentes.
-- Execute no SQL Editor do Supabase, na ordem dos arquivos (0001 -> 0006).
-- =====================================================================

-- ---------------------------------------------------------------------
-- Funções auxiliares
-- ---------------------------------------------------------------------

-- Mantém updated_at atualizado nos UPDATEs.
create function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- "Hoje" no fuso do Brasil (usado pelas views e funções de KPI).
create function public.today_br()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'America/Sao_Paulo')::date;
$$;

revoke execute on function public.today_br() from public, anon;
grant execute on function public.today_br() to authenticated;

-- ---------------------------------------------------------------------
-- profiles: 1 linha por usuário autenticado (nome, cargo, departamento).
-- O e-mail fica em auth.users e não é copiado.
-- ---------------------------------------------------------------------
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  full_name   text not null default '' check (char_length(full_name) <= 60),
  role_title  text not null default '' check (char_length(role_title) <= 40),
  department  text not null default ''
              check (department in ('', 'finance', 'commercial', 'logistics', 'it', 'other')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- user_preferences: preferências de tela e de notificação (por usuário).
-- ---------------------------------------------------------------------
create table public.user_preferences (
  user_id         uuid primary key references auth.users (id) on delete cascade,
  theme           text    not null default 'dark'   check (theme in ('light', 'dark', 'auto')),
  reduce_motion   boolean not null default false,
  auto_refresh    boolean not null default false,
  default_period  text    not null default 'week'   check (default_period in ('week', 'month', 'year')),
  default_format  text    not null default 'csv'    check (default_format in ('csv')),
  notif_reports   boolean not null default true,
  notif_alerts    boolean not null default true,
  notif_data      boolean not null default true,
  notif_email     boolean not null default false,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

create trigger set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- notifications: notificações pessoais (o estado "lida" é de cada usuário).
-- ---------------------------------------------------------------------
create table public.notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null default auth.uid() references auth.users (id) on delete cascade,
  category    text not null check (category in ('reports', 'alerts', 'data')),
  icon        text not null default 'bx-bell' check (icon ~ '^bx-[a-z0-9-]+$'),
  title       text not null check (char_length(title) between 1 and 120),
  message     text not null check (char_length(message) between 1 and 500),
  read        boolean not null default false,
  created_at  timestamptz not null default now()
);

create index if not exists notifications_user_created_idx
  on public.notifications (user_id, created_at desc);

-- ---------------------------------------------------------------------
-- records: registros da Central de Dados (importação CSV).
-- status usa valores canônicos; a tela traduz para o rótulo.
-- ---------------------------------------------------------------------
create table public.records (
  id           uuid primary key default gen_random_uuid(),
  external_id  text not null check (char_length(external_id) between 1 and 60),
  title        text not null check (char_length(title) between 1 and 200),
  category     text not null default 'Sem categoria' check (char_length(category) between 1 and 80),
  status       text not null
               check (status in ('concluido', 'pendente', 'em_andamento', 'erro', 'outro')),
  sector       text not null check (sector in ('finance', 'commercial', 'logistics', 'it')),
  created_by   uuid default auth.uid() references auth.users (id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  unique (sector, external_id)
);

create index if not exists records_status_idx   on public.records (status);
create index if not exists records_category_idx on public.records (category);
create index if not exists records_created_idx  on public.records (created_at);
create index if not exists records_created_by_idx on public.records (created_by);

create trigger set_updated_at
  before update on public.records
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------
-- Novo usuário (convite aceito) -> cria perfil e preferências.
-- Trigger justificado: o navegador não consegue criar essas linhas antes
-- do primeiro login, e elas precisam existir para as telas funcionarem.
-- ---------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 60))
  on conflict (id) do nothing;

  insert into public.user_preferences (user_id)
  values (new.id)
  on conflict (user_id) do nothing;

  return new;
end;
$$;

revoke execute on function public.handle_new_user() from public, anon, authenticated;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Usuários que já existam no projeto ganham perfil e preferências (não destrutivo).
insert into public.profiles (id)
select u.id from auth.users u
on conflict (id) do nothing;

insert into public.user_preferences (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;

-- ---------------------------------------------------------------------
-- RLS: profiles / user_preferences / notifications
-- ---------------------------------------------------------------------
alter table public.profiles         enable row level security;
alter table public.user_preferences enable row level security;
alter table public.notifications    enable row level security;

revoke all on public.profiles, public.user_preferences, public.notifications from anon;
grant select, update                 on public.profiles         to authenticated;
grant select, insert, update         on public.user_preferences to authenticated;
grant select, insert, update, delete on public.notifications    to authenticated;

-- profiles: todos os usuários autenticados veem nomes; cada um edita o seu.
create policy profiles_select on public.profiles
  for select to authenticated using (true);
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- user_preferences: somente o próprio usuário.
create policy prefs_select_own on public.user_preferences
  for select to authenticated using (user_id = (select auth.uid()));
create policy prefs_insert_own on public.user_preferences
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy prefs_update_own on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- notifications: somente o próprio usuário.
create policy notifications_select_own on public.notifications
  for select to authenticated using (user_id = (select auth.uid()));
create policy notifications_insert_own on public.notifications
  for insert to authenticated with check (user_id = (select auth.uid()));
create policy notifications_update_own on public.notifications
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
create policy notifications_delete_own on public.notifications
  for delete to authenticated using (user_id = (select auth.uid()));

-- ---------------------------------------------------------------------
-- RLS: records (dado compartilhado da empresa)
--   leitura: qualquer usuário autenticado
--   escrita: qualquer autenticado cria; só o autor edita/exclui
-- created_by é preenchido pelo banco (auth.uid()), nunca pelo navegador.
-- ---------------------------------------------------------------------
alter table public.records enable row level security;
revoke all on public.records from anon;
grant select, insert, update, delete on public.records to authenticated;

create policy records_select on public.records
  for select to authenticated using (true);
create policy records_insert on public.records
  for insert to authenticated with check (created_by = (select auth.uid()));
create policy records_update on public.records
  for update to authenticated
  using (created_by = (select auth.uid()))
  with check (created_by = (select auth.uid()));
create policy records_delete on public.records
  for delete to authenticated using (created_by = (select auth.uid()));
