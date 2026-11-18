-- =====================================================================
-- DataOps | 0006_views_and_kpis.sql
-- Views e funções de KPI. Tudo roda com as permissões de QUEM CHAMA
-- (security invoker), então o RLS das tabelas continua valendo.
-- O banco devolve linhas já agregadas no mesmo formato que os arrays
-- do demo, para o JavaScript de cada aba continuar filtrando e desenhando.
-- =====================================================================

-- ---------------------------------------------------------------------
-- VIEWS
-- ---------------------------------------------------------------------

-- Pipeline com "dias parado" calculado.
create view public.v_deals with (security_invoker = true) as
select d.id, d.external_id, d.customer, d.stage, d.amount, d.probability,
       d.seller_id, d.channel_id, d.last_activity_on,
       (public.today_br() - d.last_activity_on) as stalled_days
from public.deals d;

-- Contas a pagar/receber em aberto, com dias até o vencimento
-- (negativo = atrasado).
create view public.v_fin_titles_open with (security_invoker = true) as
select t.id, t.external_id, t.kind, t.counterparty, t.category, t.amount, t.due_date,
       (t.due_date - public.today_br()) as days_until_due
from public.fin_titles t
where t.settled_on is null;

-- Entregas em aberto (em rota), com situação derivada das datas:
-- late  = ETA depois do prazo prometido
-- early = ETA antes do prazo prometido
-- normal = demais casos (inclui ETA ainda não informado)
create view public.v_shipments_open with (security_invoker = true) as
select s.id, s.order_number, s.center_id, c.name as center_name,
       s.carrier_id, ca.name as carrier_name,
       s.origin, s.destination, s.via, s.ordered_on, s.promised_on,
       s.eta_at, s.progress_pct,
       case
         when s.eta_at is null then 'normal'
         when (s.eta_at at time zone 'America/Sao_Paulo')::date > s.promised_on then 'late'
         when (s.eta_at at time zone 'America/Sao_Paulo')::date < s.promised_on then 'early'
         else 'normal'
       end as delivery_state
from public.shipments s
join public.distribution_centers c  on c.id  = s.center_id
join public.carriers             ca on ca.id = s.carrier_id
where s.delivered_on is null;

-- Incidentes com horas desde a abertura e tempos de reconhecimento/resolução.
create view public.v_it_incidents with (security_invoker = true) as
select i.id, i.code, i.title, i.service_id, sv.team,
       i.severity, i.status, i.owner, i.opened_at, i.acknowledged_at, i.resolved_at,
       i.cause, i.auto_resolved, i.reopened,
       i.hypothesis_summary, i.hypothesis_detail,
       round((extract(epoch from (now() - i.opened_at)) / 3600)::numeric, 2) as hours_ago,
       round((extract(epoch from (i.acknowledged_at - i.opened_at)) / 60)::numeric, 1) as ack_minutes,
       round((extract(epoch from (i.resolved_at - i.opened_at)) / 60)::numeric, 1)     as resolve_minutes
from public.it_incidents i
join public.it_services sv on sv.id = i.service_id;

revoke all on public.v_deals, public.v_fin_titles_open,
              public.v_shipments_open, public.v_it_incidents from public, anon;
grant select on public.v_deals, public.v_fin_titles_open,
                public.v_shipments_open, public.v_it_incidents to authenticated;

-- ---------------------------------------------------------------------
-- VISÃO GERAL / ANÁLISES (sobre public.records)
-- ---------------------------------------------------------------------

-- Cards: total, concluídos, pendentes e taxa de sucesso (+ apoio ao gráfico de status).
create function public.rpc_overview_summary()
returns table (
  total         bigint,
  concluidos    bigint,
  pendentes     bigint,
  em_andamento  bigint,
  erros         bigint,
  outros        bigint,
  taxa_sucesso  numeric
)
language sql
stable
set search_path = ''
as $$
  select
    count(*),
    count(*) filter (where r.status = 'concluido'),
    count(*) filter (where r.status = 'pendente'),
    count(*) filter (where r.status = 'em_andamento'),
    count(*) filter (where r.status = 'erro'),
    count(*) filter (where r.status = 'outro'),
    coalesce(100.0 * count(*) filter (where r.status = 'concluido') / nullif(count(*), 0), 0)
  from public.records r;
$$;

-- Registros e concluídos por categoria (gráfico por categoria).
create function public.rpc_overview_by_category()
returns table (category text, registros bigint, concluidos bigint)
language sql
stable
set search_path = ''
as $$
  select r.category,
         count(*),
         count(*) filter (where r.status = 'concluido')
  from public.records r
  group by r.category
  order by count(*) desc, r.category;
$$;

-- Série do gráfico principal.
--   week : 7 dias (bucket 0 = mais antigo)
--   month: 4 faixas que cobrem os últimos 30 dias
--   year : 12 meses
-- registros = criados na faixa; processos = desses, os concluídos.
create function public.rpc_overview_series(p_period text)
returns table (bucket integer, bucket_start date, registros bigint, processos bigint)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_today date := public.today_br();
begin
  if p_period = 'week' then
    return query
    select g.i,
           (v_today - (6 - g.i))::date,
           count(r.id),
           count(r.id) filter (where r.status = 'concluido')
    from generate_series(0, 6) as g(i)
    left join public.records r
      on (r.created_at at time zone 'America/Sao_Paulo')::date = v_today - (6 - g.i)
    group by g.i
    order by g.i;

  elsif p_period = 'month' then
    return query
    select g.i,
           (v_today - (ceil(7.5 * (4 - g.i))::integer - 1))::date,
           count(r.id),
           count(r.id) filter (where r.status = 'concluido')
    from generate_series(0, 3) as g(i)
    left join public.records r
      on (r.created_at at time zone 'America/Sao_Paulo')::date between v_today - 29 and v_today
     and 3 - ((v_today - (r.created_at at time zone 'America/Sao_Paulo')::date) * 4 / 30) = g.i
    group by g.i
    order by g.i;

  elsif p_period = 'year' then
    return query
    select g.i,
           (date_trunc('month', v_today::timestamp) + make_interval(months => g.i - 11))::date,
           count(r.id),
           count(r.id) filter (where r.status = 'concluido')
    from generate_series(0, 11) as g(i)
    left join public.records r
      on date_trunc('month', (r.created_at at time zone 'America/Sao_Paulo')::date::timestamp)
       = date_trunc('month', v_today::timestamp) + make_interval(months => g.i - 11)
    group by g.i
    order by g.i;

  else
    raise exception 'Período inválido: %. Use week, month ou year.', p_period
      using errcode = '22023';
  end if;
end;
$$;

-- ---------------------------------------------------------------------
-- FINANCEIRO
-- ---------------------------------------------------------------------

-- Totais mensais por tipo e categoria, nos últimos p_months meses
-- (inclui o mês atual). Meses/categorias sem lançamento não aparecem.
create function public.rpc_fin_monthly(p_months integer default 6)
returns table (month date, kind text, category text, total numeric)
language sql
stable
set search_path = ''
as $$
  select date_trunc('month', t.occurred_on::timestamp)::date,
         t.kind,
         t.category,
         sum(t.amount)
  from public.fin_transactions t
  where t.occurred_on >= (date_trunc('month', public.today_br()::timestamp)
                          - make_interval(months => least(greatest(p_months, 1), 36) - 1))::date
    and t.occurred_on <  (date_trunc('month', public.today_br()::timestamp) + interval '1 month')::date
  group by 1, 2, 3
  order by 1, 2, 3;
$$;

-- Saldo em caixa no INÍCIO de p_from: último saldo inicial cadastrado até
-- p_from + lançamentos entre essa data e p_from (exclusive).
-- Sem saldo inicial cadastrado, parte de zero.
create function public.rpc_fin_opening(p_from date)
returns numeric
language sql
stable
set search_path = ''
as $$
  with base as (
    select b.as_of, b.amount
    from public.fin_opening_balance b
    where b.as_of <= p_from
    order by b.as_of desc
    limit 1
  )
  select coalesce((select amount from base), 0)
       + coalesce((
           select sum(case when t.kind = 'income' then t.amount else -t.amount end)
           from public.fin_transactions t
           where t.occurred_on <  p_from
             and t.occurred_on >= coalesce((select as_of from base), '-infinity'::date)
         ), 0);
$$;

-- ---------------------------------------------------------------------
-- COMERCIAL
-- ---------------------------------------------------------------------

-- Linhas mês x vendedor x canal, no mesmo formato do cell() do demo:
-- vendas, meta, pedidos, leads, qual, reun, prop.
--   pedidos/vendas: pelo mês do pedido; leads e etapas: pelo mês de criação do lead.
create function public.rpc_com_monthly(p_months integer default 12)
returns table (
  month      date,
  seller_id  uuid,
  channel_id uuid,
  vendas     numeric,
  meta       numeric,
  pedidos    bigint,
  leads      bigint,
  qual       bigint,
  reun       bigint,
  prop       bigint
)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (date_trunc('month', public.today_br()::timestamp)
            - make_interval(months => least(greatest(p_months, 1), 36) - 1))::date as first_month
  ),
  o as (
    select date_trunc('month', so.order_date::timestamp)::date as m,
           so.seller_id, so.channel_id,
           sum(so.amount) as vendas, count(*) as pedidos
    from public.sales_orders so cross join bounds b
    where so.order_date >= b.first_month
    group by 1, 2, 3
  ),
  l as (
    select date_trunc('month', sl.created_on::timestamp)::date as m,
           sl.seller_id, sl.channel_id,
           count(*) as leads,
           count(sl.qualified_on) as qual,
           count(sl.meeting_on)   as reun,
           count(sl.proposal_on)  as prop
    from public.sales_leads sl cross join bounds b
    where sl.created_on >= b.first_month
    group by 1, 2, 3
  ),
  g as (
    select sg.month as m, sg.seller_id, sg.channel_id, sum(sg.amount) as meta
    from public.sales_goals sg cross join bounds b
    where sg.month >= b.first_month
    group by 1, 2, 3
  ),
  k as (
    select m, seller_id, channel_id from o
    union select m, seller_id, channel_id from l
    union select m, seller_id, channel_id from g
  )
  select k.m, k.seller_id, k.channel_id,
         coalesce(o.vendas, 0), coalesce(g.meta, 0), coalesce(o.pedidos, 0),
         coalesce(l.leads, 0), coalesce(l.qual, 0), coalesce(l.reun, 0), coalesce(l.prop, 0)
  from k
  left join o on o.m = k.m and o.seller_id = k.seller_id and o.channel_id = k.channel_id
  left join l on l.m = k.m and l.seller_id = k.seller_id and l.channel_id = k.channel_id
  left join g on g.m = k.m and g.seller_id = k.seller_id and g.channel_id = k.channel_id
  order by k.m, k.seller_id, k.channel_id;
$$;

-- Ciclo médio de venda (dias entre criação do lead e o pedido) por canal.
create function public.rpc_com_cycle(p_months integer default 12)
returns table (channel_id uuid, cycle_days numeric)
language sql
stable
set search_path = ''
as $$
  select sl.channel_id,
         avg(so.order_date - sl.created_on)
  from public.sales_leads sl
  join public.sales_orders so on so.id = sl.order_id
  where sl.created_on >= (date_trunc('month', public.today_br()::timestamp)
                          - make_interval(months => least(greatest(p_months, 1), 36) - 1))::date
  group by sl.channel_id;
$$;

-- ---------------------------------------------------------------------
-- LOGÍSTICA
-- ---------------------------------------------------------------------

-- Linhas mês x centro x transportadora, no mesmo formato do demo:
-- pedidos, entregues, atrasos, abertos, meta, dias (média) e custo (média).
--   atrasos : entregues depois do prazo prometido
--   abertos : pedidos ainda sem entrega
--   dias    : média de (entrega - pedido) das entregues
--   custo   : média do frete das entregues
--   meta    : meta do centro no mês, rateada pela participação de cada
--             transportadora nos pedidos do centro (como no demo).
--             Meta de um centro sem nenhum pedido no mês não aparece.
create function public.rpc_log_monthly(p_months integer default 6)
returns table (
  month       date,
  center_id   uuid,
  carrier_id  uuid,
  pedidos     bigint,
  entregues   bigint,
  atrasos     bigint,
  abertos     bigint,
  meta        numeric,
  dias        numeric,
  custo       numeric
)
language sql
stable
set search_path = ''
as $$
  with bounds as (
    select (date_trunc('month', public.today_br()::timestamp)
            - make_interval(months => least(greatest(p_months, 1), 36) - 1))::date as first_month
  ),
  s as (
    select date_trunc('month', sh.ordered_on::timestamp)::date as m,
           sh.center_id, sh.carrier_id,
           count(*) as pedidos,
           count(sh.delivered_on) as entregues,
           count(*) filter (where sh.delivered_on > sh.promised_on) as atrasos,
           count(*) filter (where sh.delivered_on is null) as abertos,
           coalesce(avg(sh.delivered_on - sh.ordered_on) filter (where sh.delivered_on is not null), 0) as dias,
           coalesce(avg(sh.freight_cost) filter (where sh.delivered_on is not null), 0) as custo
    from public.shipments sh cross join bounds b
    where sh.ordered_on >= b.first_month
    group by 1, 2, 3
  ),
  t as (
    select s.m, s.center_id, sum(s.pedidos) as tot
    from s group by 1, 2
  ),
  g as (
    select lg.month as m, lg.center_id, lg.target_orders
    from public.logistics_goals lg cross join bounds b
    where lg.month >= b.first_month
  )
  select s.m, s.center_id, s.carrier_id,
         s.pedidos, s.entregues, s.atrasos, s.abertos,
         coalesce(g.target_orders * s.pedidos::numeric / nullif(t.tot, 0), 0),
         s.dias, s.custo
  from s
  join t on t.m = s.m and t.center_id = s.center_id
  left join g on g.m = s.m and g.center_id = s.center_id
  order by s.m, s.center_id, s.carrier_id;
$$;

-- ---------------------------------------------------------------------
-- Permissões das funções: somente usuários autenticados.
-- ---------------------------------------------------------------------
revoke execute on function
  public.rpc_overview_summary(),
  public.rpc_overview_by_category(),
  public.rpc_overview_series(text),
  public.rpc_fin_monthly(integer),
  public.rpc_fin_opening(date),
  public.rpc_com_monthly(integer),
  public.rpc_com_cycle(integer),
  public.rpc_log_monthly(integer)
from public, anon;

grant execute on function
  public.rpc_overview_summary(),
  public.rpc_overview_by_category(),
  public.rpc_overview_series(text),
  public.rpc_fin_monthly(integer),
  public.rpc_fin_opening(date),
  public.rpc_com_monthly(integer),
  public.rpc_com_cycle(integer),
  public.rpc_log_monthly(integer)
to authenticated;
