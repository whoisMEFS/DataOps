/* =========================================================
   DataOps | Financeiro (seção #finance do dashboard.html)
   ========================================================= */
(() => {
  'use strict';

  const sec = document.getElementById('finance');
  if (!sec) return;

  /* ---------- DADOS DEMONSTRATIVOS (troque pela sua API/CSV) ---------- */
  const MONTHS_ALL = ['Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
  const COLORS = ['#3b82f6', '#8b5cf6', '#ec4899', '#f59e0b', '#22c55e'];
  const GREEN = '#22c55e', RED = '#ef4444', PURPLE = '#8b5cf6';
  const OPENING_BALANCE = 620000; // saldo em caixa no início do primeiro mês

  const INCOME = [
    { name: 'Vendas',      values: [186400, 172900, 195300, 208700, 221500, 243800] },
    { name: 'Serviços',    values: [ 64200,  71800,  58900,  82300,  90100,  97500] },
    { name: 'Assinaturas', values: [ 41500,  43200,  45900,  48100,  51700,  54300] },
    { name: 'Outras',      values: [ 12300,   9800,  14100,  11600,  13900,  15200] },
    { name: 'Parcerias',   values: [ 18700,  21400,  16200,  24800,  19500,  27100] }
  ];
  const EXPENSE = [
    { name: 'Folha',        values: [132000, 132000, 136500, 136500, 141000, 158000], budget: 840000 },
    { name: 'Fornecedores', values: [ 78400,  69200,  84700,  91300,  88600,  97400], budget: 520000 },
    { name: 'Marketing',    values: [ 31500,  38200,  29400,  42700,  45100,  52300], budget: 240000 },
    { name: 'Utilidades',   values: [ 14800,  15300,  14100,  16900,  15700,  17200], budget: 100000 },
    { name: 'Impostos',     values: [ 56200,  52900,  59800,  64300,  68900,  75400], budget: 400000 }
  ];

  // "in" = dias a partir de hoje (negativo = atrasado)
  const PAY = [
    { name: 'Folha de pagamento',    cat: 'Folha',        in: 2,  value: 141000 },
    { name: 'Aluguel + condomínio',  cat: 'Utilidades',   in: 5,  value: 9400 },
    { name: 'Fornecedor Alpha Ltda', cat: 'Fornecedores', in: 7,  value: 28650 },
    { name: 'Google Ads',            cat: 'Marketing',    in: 8,  value: 12800 },
    { name: 'DAS / Simples',         cat: 'Impostos',     in: 23, value: 24300 }
  ];
  const RECV = [
    { name: 'Cliente Nova Era',  cat: 'Serviços',    in: -3, value: 18900 },
    { name: 'Contrato Orion SA', cat: 'Assinaturas', in: 3,  value: 14200 },
    { name: 'Loja Central',      cat: 'Vendas',      in: 6,  value: 32750 },
    { name: 'Parceria Vértice',  cat: 'Parcerias',   in: 11, value: 9600 },
    { name: 'Cliente Atlas',     cat: 'Serviços',    in: 15, value: 21300 }
  ];

  const SCEN = { base: 1, opt: 1.08, pess: 0.9 };

  /* ---------- ESTADO ---------- */
  const state = {
    range: 6, scenario: 'base', type: 'all', search: '',
    sortKey: null, sortDir: 1, dueTab: 'pay', ready: false, charts: {}
  };

  /* ---------- HELPERS ---------- */
  const $ = (s, r = sec) => r.querySelector(s);
  const $$ = (s, r = sec) => [...r.querySelectorAll(s)];
  const sum = a => a.reduce((x, y) => x + y, 0);
  const pct = (a, b) => (b ? ((a - b) / Math.abs(b)) * 100 : 0);
  const brl = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 0 });
  const brlFull = n => n.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const num1 = n => n.toFixed(1).replace('.', ',');
  const short = n => {
    const a = Math.abs(n);
    return a >= 1e6 ? num1(n / 1e6) + ' mi' : a >= 1e3 ? Math.round(n / 1e3) + ' mil' : String(Math.round(n));
  };
  const dateIn = d => {
    const t = new Date(); t.setDate(t.getDate() + d);
    return t.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
  };
  const totals = (rows, n) => Array.from({ length: n }, (_, i) => sum(rows.map(r => r.values[i])));

  /* dados completos (6 meses) com o cenário aplicado */
  function fullData() {
    const k = SCEN[state.scenario];
    const apply = (arr, m) => arr.map(r => ({ ...r, values: r.values.map(v => Math.round(v * m)) }));
    return { inc: apply(INCOME, k), exp: apply(EXPENSE, 1 + (k - 1) * -0.3) };
  }
  /* dados do período escolhido + saldo acumulado */
  function data() {
    const f = fullData(), n = state.range, all = MONTHS_ALL.length;
    const incAll = totals(f.inc, all), expAll = totals(f.exp, all);
    let acc = OPENING_BALANCE;
    const balAll = incAll.map((v, i) => (acc += v - expAll[i]));
    const cut = rows => rows.map(r => ({ ...r, values: r.values.slice(-n) }));
    return {
      months: MONTHS_ALL.slice(-n),
      inc: cut(f.inc), exp: cut(f.exp),
      bal: balAll.slice(-n),
      balPrev: n < all ? balAll[all - n - 1] : OPENING_BALANCE
    };
  }

  function animateNumber(el, to, fmt) {
    const from = parseFloat(el.dataset.v || '0'), t0 = performance.now(), dur = 700;
    el.dataset.v = to;
    const step = t => {
      const p = Math.min((t - t0) / dur, 1), e = 1 - Math.pow(1 - p, 3);
      el.textContent = fmt(from + (to - from) * e);
      if (p < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }

  /* ---------- KPIs ---------- */
  function deltaHtml(change, goodWhenUp = true, suffix = '%') {
    const up = change >= 0, good = goodWhenUp ? up : !up;
    return `<span class="fin-delta ${good ? 'up' : 'down'}">${up ? '▲' : '▼'} ${num1(Math.abs(change))}${suffix}</span>`;
  }

  function renderKpis() {
    const d = data(), n = d.months.length;
    const inc = totals(d.inc, n), exp = totals(d.exp, n), net = inc.map((v, i) => v - exp[i]);
    const last = n - 1, prev = Math.max(0, n - 2);
    const balPrev = n > 1 ? d.bal[prev] : d.balPrev;

    const cards = [
      { label: 'Receitas', val: sum(inc), icon: 'bx-money', color: 'green', ch: pct(inc[last], inc[prev]), up: true },
      { label: 'Despesas', val: sum(exp), icon: 'bx-receipt', color: 'orange', ch: pct(exp[last], exp[prev]), up: false },
      { label: 'Resultado', val: sum(net), icon: 'bx-calculator', color: 'blue', ch: pct(net[last], net[prev]), up: true },
      { label: 'Saldo em caixa', val: d.bal[last], icon: 'bx-wallet', color: 'purple', ch: pct(d.bal[last], balPrev), up: true }
    ];

    const host = $('#finKpis');
    if (!host.children.length) {
      host.innerHTML = cards.map((c, i) => `
        <article class="stat-card">
          <div class="stat-top"><span>${c.label}</span>
            <span class="stat-icon ${c.color}"><i class="bx ${c.icon}"></i></span></div>
          <h3 data-kpi="${i}">R$ 0</h3>
          <p class="stat-description" data-desc="${i}"></p>
        </article>`).join('');
    }
    cards.forEach((c, i) => {
      animateNumber($(`[data-kpi="${i}"]`), c.val, brl);
      $(`[data-desc="${i}"]`).innerHTML = `${deltaHtml(c.ch, c.up)} vs mês anterior`;
    });

    /* indicadores secundários */
    const tI = sum(inc), tE = sum(exp);
    const burn = tE / n;
    const cover = d.bal[last] / burn;
    const lateVal = sum(RECV.filter(r => r.in < 0).map(r => r.value));
    const delinq = (lateVal / sum(RECV.map(r => r.value))) * 100;
    const metrics = [
      { label: 'Margem líquida', value: num1((sum(net) / tI) * 100) + '%', icon: 'bx-pie-chart-alt-2', color: 'c-purple' },
      { label: 'Despesa média mensal', value: brl(burn), icon: 'bx-trending-down', color: 'c-orange' },
      { label: 'Cobertura de caixa', value: num1(cover) + ' meses', icon: 'bx-shield-quarter', color: cover < 1.5 ? 'c-red' : 'c-green' },
      { label: 'Inadimplência (a receber)', value: num1(delinq) + '%', icon: 'bx-error-circle', color: delinq > 15 ? 'c-red' : 'c-blue' }
    ];
    $('#finMetrics').innerHTML = metrics.map(m => `
      <div class="fin-metric">
        <span class="fin-ico ${m.color}"><i class="bx ${m.icon}"></i></span>
        <div><span class="label">${m.label}</span><strong>${m.value}</strong></div>
      </div>`).join('');
  }

  /* ---------- GRÁFICOS ---------- */
  const axis = { ticks: { color: '#9aa4b2' }, grid: { color: 'rgba(255,255,255,.06)' }, border: { display: false } };
  const legend = { labels: { color: '#c8d0dc', usePointStyle: true, boxWidth: 8, padding: 16 } };

  const centerText = {
    id: 'finCenter',
    afterDraw(chart) {
      const o = chart.options.plugins.finCenter;
      if (!o || !o.value) return;
      const { ctx, chartArea: a } = chart;
      const x = (a.left + a.right) / 2, y = (a.top + a.bottom) / 2;
      ctx.save();
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillStyle = '#9aa4b2'; ctx.font = '12px sans-serif';
      ctx.fillText(o.title, x, y - 14);
      ctx.fillStyle = '#ffffff'; ctx.font = '600 20px sans-serif';
      ctx.fillText(o.value, x, y + 8);
      ctx.restore();
    }
  };

  function createCharts() {
    if (typeof Chart === 'undefined') {
      $$('.fin-chart').forEach(c => (c.innerHTML = '<p class="fin-muted">Chart.js não foi carregado.</p>'));
      return;
    }
    const common = { responsive: true, maintainAspectRatio: false };

    state.charts.cash = new Chart($('#finCashChart'), {
      type: 'bar',
      data: {
        labels: [],
        datasets: [
          { type: 'bar', label: 'Entradas', data: [], backgroundColor: GREEN, borderRadius: 8, maxBarThickness: 28, order: 2 },
          { type: 'bar', label: 'Saídas', data: [], backgroundColor: RED, borderRadius: 8, maxBarThickness: 28, order: 2 },
          {
            type: 'line', label: 'Saldo acumulado', data: [], yAxisID: 'y1', order: 1, tension: .4, fill: true,
            borderColor: PURPLE, backgroundColor: 'rgba(139,92,246,.12)', borderWidth: 3,
            pointRadius: 4, pointBackgroundColor: '#0f1115', pointBorderColor: PURPLE, pointBorderWidth: 2
          }
        ]
      },
      options: {
        ...common,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend, datalabels: { display: false },
          tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${brl(c.parsed.y)}` } }
        },
        scales: {
          x: { ...axis, grid: { display: false } },
          y: { ...axis, ticks: { ...axis.ticks, callback: v => 'R$ ' + short(v) } },
          y1: { ...axis, position: 'right', grid: { drawOnChartArea: false }, ticks: { ...axis.ticks, callback: v => short(v) } }
        }
      }
    });

    state.charts.income = new Chart($('#finIncomeChart'), {
      type: 'doughnut',
      data: { labels: [], datasets: [{ data: [], backgroundColor: COLORS, borderColor: 'rgba(15,17,21,.9)', borderWidth: 3, hoverOffset: 6 }] },
      plugins: [centerText],
      options: {
        ...common, cutout: '68%',
        plugins: {
          legend: { ...legend, position: 'right' }, datalabels: { display: false }, finCenter: {},
          tooltip: {
            callbacks: {
              label: c => {
                const tot = sum(c.dataset.data);
                return ` ${c.label}: ${brl(c.parsed)} (${num1((c.parsed / tot) * 100)}%)`;
              }
            }
          }
        }
      }
    });

    state.charts.expense = new Chart($('#finExpenseChart'), {
      type: 'bar',
      data: { labels: [], datasets: [] },
      options: {
        ...common,
        interaction: { mode: 'index', intersect: false },
        plugins: {
          legend, datalabels: { display: false },
          tooltip: {
            callbacks: {
              label: c => ` ${c.dataset.label}: ${brl(c.parsed.y)}`,
              footer: items => 'Total: ' + brl(sum(items.map(i => i.parsed.y)))
            }
          }
        },
        scales: {
          x: { ...axis, stacked: true, grid: { display: false } },
          y: { ...axis, stacked: true, ticks: { ...axis.ticks, callback: v => 'R$ ' + short(v) } }
        }
      }
    });
  }

  function updateCharts() {
    const c = state.charts;
    if (!c.cash) return;
    const d = data(), n = d.months.length;
    const inc = totals(d.inc, n), exp = totals(d.exp, n);

    c.cash.data.labels = d.months;
    c.cash.data.datasets[0].data = inc;
    c.cash.data.datasets[1].data = exp;
    c.cash.data.datasets[2].data = d.bal;
    c.cash.update();

    const incTot = d.inc.map(r => sum(r.values));
    c.income.data.labels = d.inc.map(r => r.name);
    c.income.data.datasets[0].data = incTot;
    c.income.options.plugins.finCenter = { title: 'Receita total', value: 'R$ ' + short(sum(incTot)) };
    c.income.update();

    c.expense.data.labels = d.months;
    c.expense.data.datasets = d.exp.map((r, i) => ({
      label: r.name, data: r.values, backgroundColor: COLORS[i], borderRadius: 6, borderSkipped: false, maxBarThickness: 46
    }));
    c.expense.update();
  }

  /* ---------- ORÇAMENTO ---------- */
  function renderBudget() {
    const d = data();
    $('#finBudget').innerHTML = d.exp.map((r, i) => {
      const used = sum(r.values), budget = EXPENSE[i].budget * (state.range / 6);
      const p = (used / budget) * 100;
      const color = p > 100 ? RED : p > 85 ? '#f59e0b' : COLORS[i];
      return `<div class="fin-b-row">
        <div class="fin-b-top"><b>${r.name}</b><span>${brl(used)} de ${brl(budget)} · ${Math.round(p)}%</span></div>
        <div class="fin-b-track"><div class="fin-b-fill" data-w="${Math.min(p, 100)}" style="background:${color}"></div></div>
      </div>`;
    }).join('');
    requestAnimationFrame(() => $$('.fin-b-fill').forEach(f => (f.style.width = f.dataset.w + '%')));
  }

  /* ---------- VENCIMENTOS ---------- */
  function renderDue() {
    const pay = state.dueTab === 'pay', list = pay ? PAY : RECV;
    const cls = n => (n < 0 ? 't-late' : n <= 5 ? 't-soon' : 't-ok');
    const txt = n => (n < 0 ? `${-n} d em atraso` : n === 0 ? 'vence hoje' : `em ${n} d`);
    const color = pay ? 'c-red' : 'c-green';
    $('#finDueTotal').innerHTML = pay
      ? `Total a pagar: <b>${brl(sum(PAY.map(i => i.value)))}</b>`
      : `Total a receber: <b>${brl(sum(RECV.map(i => i.value)))}</b>`;
    $('#finDueList').innerHTML = list.map(it => `
      <li>
        <span class="fin-ico ${color}">${it.cat.slice(0, 2).toUpperCase()}</span>
        <div class="info"><b>${it.name}</b><small>${it.cat} · ${dateIn(it.in)}</small></div>
        <div class="amt">${brl(it.value)}<small class="${cls(it.in)}">${txt(it.in)}</small></div>
      </li>`).join('');
  }

  /* ---------- INSIGHTS ---------- */
  function renderInsights() {
    const d = data(), n = d.months.length;
    const inc = totals(d.inc, n), exp = totals(d.exp, n), net = inc.map((v, i) => v - exp[i]);
    const items = [];

    const best = net.indexOf(Math.max(...net));
    items.push({ icon: 'bx-trophy', color: 'c-green', title: `Melhor mês: ${d.months[best]}`, text: `Resultado de ${brl(net[best])}, com margem de ${num1((net[best] / inc[best]) * 100)}%.` });

    const expTot = d.exp.map(r => sum(r.values)), allExp = sum(expTot);
    const big = expTot.indexOf(Math.max(...expTot));
    items.push({ icon: 'bx-pie-chart-alt', color: 'c-purple', title: `${d.exp[big].name} é a maior despesa`, text: `Representa ${num1((expTot[big] / allExp) * 100)}% das saídas do período (${brl(expTot[big])}).` });

    const over = d.exp.map((r, i) => ({ r, p: (sum(r.values) / (EXPENSE[i].budget * (state.range / 6))) * 100 })).sort((a, b) => b.p - a.p)[0];
    items.push(over.p > 100
      ? { icon: 'bx-error', color: 'c-red', title: `${over.r.name} estourou o orçamento`, text: `Já usou ${Math.round(over.p)}% do previsto para o período.` }
      : { icon: 'bx-check-shield', color: over.p > 85 ? 'c-orange' : 'c-green', title: over.p > 85 ? `${over.r.name} perto do limite` : 'Orçamento sob controle', text: `A categoria mais próxima do limite é ${over.r.name}, com ${Math.round(over.p)}% usado.` });

    const late = RECV.filter(r => r.in < 0);
    items.push(late.length
      ? { icon: 'bx-time-five', color: 'c-orange', title: `${late.length} recebimento(s) em atraso`, text: `${brl(sum(late.map(r => r.value)))} aguardando cobrança.` }
      : { icon: 'bx-check-circle', color: 'c-green', title: 'Sem recebimentos atrasados', text: 'Todos os valores a receber estão em dia.' });

    const growth = pct(inc[n - 1], inc[0]);
    items.push({ icon: growth >= 0 ? 'bx-trending-up' : 'bx-trending-down', color: growth >= 0 ? 'c-blue' : 'c-red', title: `Receita ${growth >= 0 ? 'em alta' : 'em queda'}`, text: `${growth >= 0 ? '+' : ''}${num1(growth)}% entre ${d.months[0]} e ${d.months[n - 1]}.` });

    const dueSoon = PAY.filter(p => p.in >= 0 && p.in <= 7);
    items.push({ icon: 'bx-calendar-exclamation', color: 'c-orange', title: 'Próximos 7 dias', text: `${dueSoon.length} conta(s) a pagar somando ${brl(sum(dueSoon.map(p => p.value)))}.` });

    $('#finInsights').innerHTML = items.map(i => `
      <div class="fin-insight">
        <span class="fin-ico ${i.color}"><i class="bx ${i.icon}"></i></span>
        <div><strong>${i.title}</strong><p>${i.text}</p></div>
      </div>`).join('');
  }

  /* ---------- TABELA ---------- */
  function tableRows() {
    const d = data();
    let rows = [
      ...d.inc.map((r, i) => ({ ...r, type: 'Receita', color: COLORS[i], idx: i })),
      ...d.exp.map((r, i) => ({ ...r, type: 'Despesa', color: COLORS[i], idx: i }))
    ].map(r => {
      const total = sum(r.values), first = r.values[0], lastV = r.values[r.values.length - 1];
      let status;
      if (r.type === 'Despesa') {
        const p = (total / (EXPENSE[r.idx].budget * (state.range / 6))) * 100;
        status = p > 100 ? ['danger', 'Estourado'] : p > 85 ? ['pending', 'Atenção'] : ['success', 'No orçamento'];
      } else {
        status = lastV >= first ? ['success', 'Em alta'] : ['danger', 'Em queda'];
      }
      return { ...r, total, change: pct(lastV, first), status };
    });
    if (state.type !== 'all') rows = rows.filter(r => r.type === state.type);
    if (state.search) rows = rows.filter(r => r.name.toLowerCase().includes(state.search.toLowerCase()));
    const k = state.sortKey;
    if (k !== null) {
      const val = r => (k === 'name' ? r.name : k === 'type' ? r.type : k === 'total' ? r.total : k === 'change' ? r.change : r.values[k]);
      rows.sort((a, b) => {
        const x = val(a), y = val(b);
        return (typeof x === 'string' ? x.localeCompare(y) : x - y) * state.sortDir;
      });
    }
    return { d, rows };
  }

  function renderTable() {
    const { d, rows } = tableRows();
    const cols = [
      { k: 'name', l: 'Categoria' }, { k: 'type', l: 'Tipo' },
      ...d.months.map((m, i) => ({ k: i, l: m, num: 1 })),
      { k: 'total', l: 'Total', num: 1 }, { k: 'change', l: 'Variação', num: 1 }, { k: 'status', l: 'Status', nosort: 1 }
    ];
    $('#finTable thead').innerHTML = '<tr>' + cols.map(c =>
      `<th class="${c.num ? 'num' : ''}" data-k="${c.k}" ${c.nosort ? 'data-nosort="1"' : ''}>${c.l}${c.nosort ? '' : `<span class="arr">${state.sortKey === c.k ? (state.sortDir > 0 ? '↑' : '↓') : '↕'}</span>`}</th>`).join('') + '</tr>';

    $$('#finTable th').forEach(th => {
      if (th.dataset.nosort) return;
      th.onclick = () => {
        const raw = th.dataset.k, k = isNaN(raw) ? raw : +raw;
        state.sortDir = state.sortKey === k ? -state.sortDir : 1;
        state.sortKey = k;
        renderTable();
      };
    });

    $('#finTable tbody').innerHTML = rows.length ? rows.map(r => `
      <tr>
        <td class="name"><i style="background:${r.color}"></i>${r.name}</td>
        <td>${r.type}</td>
        ${r.values.map(v => `<td class="num">${brlFull(v)}</td>`).join('')}
        <td class="num"><b>${brlFull(r.total)}</b></td>
        <td class="num" style="color:${(r.type === 'Receita') === (r.change >= 0) ? GREEN : RED}">${r.change >= 0 ? '+' : ''}${num1(r.change)}%</td>
        <td><span class="table-status ${r.status[0]}">${r.status[1]}</span></td>
      </tr>`).join('')
      : `<tr><td class="empty" colspan="${cols.length}">Nenhum resultado encontrado</td></tr>`;

    const n = d.months.length, tI = totals(d.inc, n), tE = totals(d.exp, n);
    const net = tI.map((v, i) => v - tE[i]);
    $('#finTable tfoot').innerHTML = `<tr><td>Resultado líquido</td><td></td>
      ${net.map(v => `<td class="num" style="color:${v >= 0 ? GREEN : RED}">${brlFull(v)}</td>`).join('')}
      <td class="num">${brlFull(sum(net))}</td><td></td><td></td></tr>`;
    $('#finCount').textContent = `${rows.length} categoria(s) exibida(s)`;
  }

  /* ---------- EXPORTAR CSV ---------- */
  function exportCsv() {
    const { d, rows } = tableRows();
    const lines = [['Categoria', 'Tipo', ...d.months, 'Total'], ...rows.map(r => [r.name, r.type, ...r.values, r.total])].map(l => l.join(';'));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob(['﻿' + lines.join('\n')], { type: 'text/csv;charset=utf-8' }));
    a.download = 'financeiro-dataops.csv';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }

  /* ---------- RENDER + EVENTOS ---------- */
  function renderAll() {
    renderKpis(); updateCharts(); renderBudget(); renderDue(); renderInsights(); renderTable();
  }

  function bindEvents() {
    $('#finRange').onchange = e => { state.range = +e.target.value; state.sortKey = null; renderAll(); };
    $('#finScenario').onchange = e => { state.scenario = e.target.value; renderAll(); };
    $('#finExport').onclick = exportCsv;
    $('#finSearch').oninput = e => { state.search = e.target.value; renderTable(); };
    $('#finType').onchange = e => { state.type = e.target.value; renderTable(); };
    $('#finClear').onclick = () => {
      state.search = ''; state.type = 'all'; state.sortKey = null;
      $('#finSearch').value = ''; $('#finType').value = 'all';
      renderTable();
    };
    $$('#finDueTabs button').forEach(b => (b.onclick = () => {
      $$('#finDueTabs button').forEach(x => x.classList.remove('active'));
      b.classList.add('active');
      state.dueTab = b.dataset.tab;
      renderDue();
    }));
  }

  function init() {
    if (state.ready) return;
    state.ready = true;
    createCharts();
    bindEvents();
    renderAll();
  }

  /* abre a aba Financeiro -> desenha (ou só ajusta o tamanho se já existir) */
  const isActive = () => sec.classList.contains('active');
  new MutationObserver(() => {
    if (!isActive()) return;
    if (!state.ready) init();
    else Object.values(state.charts).forEach(ch => ch.resize());
  }).observe(sec, { attributes: true, attributeFilter: ['class'] });

  if (isActive()) init();
})();