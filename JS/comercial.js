/* ========================================
   DATAOPS | COMERCIAL
======================================== */
 
(function () {
    'use strict';
 
    const section = document.getElementById('commercial');
    if (!section) return;
 
    const $ = (id) => document.getElementById(id);
 
 
    /* ========================================
       1. DADOS DEMONSTRATIVOS
    ======================================== */
 
    const MONTH_NAMES = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
                         'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
 
    // 12 meses: o último é o mês atual
    const BASE = {
        vendas: [318000, 342000, 361000, 355000, 389000, 412000,
                 398000, 436000, 452000, 447000, 481000, 503000],
        meta:   [330000, 340000, 350000, 360000, 380000, 400000,
                 410000, 420000, 440000, 450000, 470000, 490000],
        ticket: [11200, 11450, 11600, 11900, 11800, 12100,
                 12000, 12350, 12500, 12400, 12750, 12900]
    };
 
    // share = parcela das vendas | tk = ajuste do ticket | cv = eficiência de conversão
    const SELLERS = [
        { id: 'ana',   nome: 'Ana Souza',   share: 0.34, tk: 1.06, cv: 1.08, seed: 1 },
        { id: 'bruno', nome: 'Bruno Lima',  share: 0.27, tk: 0.97, cv: 1.00, seed: 2 },
        { id: 'carla', nome: 'Carla Dias',  share: 0.23, tk: 1.02, cv: 0.96, seed: 3 },
        { id: 'diego', nome: 'Diego Alves', share: 0.16, tk: 0.94, cv: 0.90, seed: 4 }
    ];
 
    // conv = conversão lead → venda | r = taxas das etapas do funil | cycle = ciclo em dias
    const CHANNELS = [
        { id: 'in',  nome: 'Inbound',    share: 0.38, tk: 0.96, conv: 0.019, r: [0.12, 0.50, 0.55], cycle: 12, seed: 5 },
        { id: 'out', nome: 'Outbound',   share: 0.27, tk: 1.10, conv: 0.011, r: [0.07, 0.48, 0.52], cycle: 26, seed: 6 },
        { id: 'par', nome: 'Parcerias',  share: 0.21, tk: 1.05, conv: 0.021, r: [0.14, 0.55, 0.60], cycle: 20, seed: 7 },
        { id: 'ind', nome: 'Indicações', share: 0.14, tk: 0.92, conv: 0.035, r: [0.22, 0.60, 0.65], cycle: 14, seed: 8 }
    ];
 
    const DEALS = [
        { cliente: 'Grupo Nexa',    etapa: 'Negociação', valor: 48500, prob: 85, seller: 'ana',   channel: 'out', parado: 2  },
        { cliente: 'Vértice Tech',  etapa: 'Proposta',   valor: 32900, prob: 70, seller: 'bruno', channel: 'in',  parado: 6  },
        { cliente: 'Lumina Saúde',  etapa: 'Negociação', valor: 27400, prob: 80, seller: 'carla', channel: 'par', parado: 3  },
        { cliente: 'Orbital Log.',  etapa: 'Contrato',   valor: 21000, prob: 92, seller: 'ana',   channel: 'ind', parado: 1  },
        { cliente: 'Prisma Edu',    etapa: 'Proposta',   valor: 15800, prob: 60, seller: 'diego', channel: 'in',  parado: 11 },
        { cliente: 'Atlas Foods',   etapa: 'Reunião',    valor: 38200, prob: 35, seller: 'bruno', channel: 'out', parado: 19 },
        { cliente: 'Norte Energia', etapa: 'Proposta',   valor: 54000, prob: 45, seller: 'carla', channel: 'out', parado: 15 },
        { cliente: 'Mercúrio Pay',  etapa: 'Negociação', valor: 29700, prob: 75, seller: 'diego', channel: 'ind', parado: 4  },
        { cliente: 'Brisa Hotéis',  etapa: 'Proposta',   valor: 18600, prob: 40, seller: 'ana',   channel: 'par', parado: 13 },
        { cliente: 'Delta Seguros', etapa: 'Reunião',    valor: 44100, prob: 30, seller: 'diego', channel: 'par', parado: 21 }
    ];
 
    const SELLER_MAP  = Object.fromEntries(SELLERS.map((s) => [s.id, s]));
    const CHANNEL_MAP = Object.fromEntries(CHANNELS.map((c) => [c.id, c]));
 
    const LABELS = (function () {
        const now = new Date();
        return Array.from({ length: 12 }, (_, i) => {
            const d = new Date(now.getFullYear(), now.getMonth() - 11 + i, 1);
            return MONTH_NAMES[d.getMonth()] + '/' + String(d.getFullYear()).slice(-2);
        });
    })();
 
 
    /* ========================================
       2. ESTADO E FORMATADORES
    ======================================== */
 
    const state = {
        range: 6,
        seller: 'all',
        channel: 'all',
        deal: 'hot',
        search: '',
        status: 'all'
    };
 
    const charts = {};
    let current = null;
    let tableRows = [];
 
    const brl = (v) => v.toLocaleString('pt-BR', {
        style: 'currency', currency: 'BRL', maximumFractionDigits: 0
    });
    const num = (v) => Math.round(v).toLocaleString('pt-BR');
    const pct = (v, d) => v.toFixed(d === undefined ? 1 : d).replace('.', ',') + '%';
 
    const FMT = {
        brl:  brl,
        int:  num,
        pct:  (v) => pct(v, 1),
        days: (v) => Math.round(v) + ' dias'
    };
 
    const COLORS = {
        blue: '#3984ff', purple: '#a78bfa', green: '#22c55e', orange: '#f59e0b',
        text: '#94a3b8', grid: 'rgba(148, 163, 184, 0.12)', card: '#0f1729'
    };
 
 
    /* ========================================
       3. CÁLCULOS
    ======================================== */
 
    const KEYS = ['vendas', 'meta', 'pedidos', 'leads', 'qual', 'reun', 'prop'];
 
    function addCells(list) {
        const total = {};
        KEYS.forEach((k) => { total[k] = 0; });
        list.forEach((c) => KEYS.forEach((k) => { total[k] += c[k]; }));
        return total;
    }
 
    // Dados de um mês (i = 0..11) para um vendedor e um canal
    function cell(i, sId, cId) {
        if (sId === 'all') return addCells(SELLERS.map((s) => cell(i, s.id, cId)));
        if (cId === 'all') return addCells(CHANNELS.map((c) => cell(i, sId, c.id)));
 
        const s = SELLER_MAP[sId];
        const c = CHANNEL_MAP[cId];
 
        const wobble = 1 + 0.07 * Math.sin((s.seed + c.seed) * 1.7 + i * 1.1);
        const share = s.share * c.share;
 
        const vendas = BASE.vendas[i] * share * wobble;
        const meta = BASE.meta[i] * share;
        const ticket = BASE.ticket[i] * s.tk * c.tk;
        const pedidos = Math.max(1, Math.round(vendas / ticket));
 
        const drift = 0.94 + 0.012 * i;
        let leads = Math.max(pedidos, Math.round(pedidos / (c.conv * s.cv * drift)));
 
        let qual = Math.round(leads * c.r[0]);
        let reun = Math.round(qual * c.r[1]);
        let prop = Math.round(reun * c.r[2]);
 
        prop = Math.max(prop, pedidos);
        reun = Math.max(reun, prop);
        qual = Math.max(qual, reun);
        leads = Math.max(leads, qual);
 
        return { vendas, meta, pedidos, leads, qual, reun, prop };
    }
 
    const ticketOf = (t) => (t.pedidos ? t.vendas / t.pedidos : 0);
    const metaOf   = (t) => (t.meta ? (t.vendas / t.meta) * 100 : 0);
    const convOf   = (t) => (t.leads ? (t.pedidos / t.leads) * 100 : 0);
    const pctDelta = (a, b) => (b ? ((a - b) / b) * 100 : 0);
 
    const monthIndexes = (n) => Array.from({ length: n }, (_, k) => 12 - n + k);
 
    function compute() {
        const n = state.range;
        const cells = Array.from({ length: 12 }, (_, i) => cell(i, state.seller, state.channel));
        const cur = cells.slice(12 - n);
        const prev = cells.slice(12 - 2 * n, 12 - n);
 
        return {
            n: n,
            cells: cells,
            cur: cur,
            t: addCells(cur),
            p: addCells(prev),
            labels: LABELS.slice(12 - n)
        };
    }
 
    function byChannel(n) {
        return CHANNELS.map((c) => ({
            c: c,
            t: addCells(monthIndexes(n).map((i) => cell(i, state.seller, c.id)))
        }));
    }
 
    function bySeller(n) {
        return SELLERS.map((s) => ({
            s: s,
            t: addCells(monthIndexes(n).map((i) => cell(i, s.id, state.channel)))
        }));
    }
 
    function filteredDeals() {
        return DEALS.filter((d) =>
            (state.seller === 'all' || d.seller === state.seller) &&
            (state.channel === 'all' || d.channel === state.channel)
        );
    }
 
    const isRisk = (d) => d.parado >= 10 || d.prob <= 45;
 
 
    /* ========================================
       4. INDICADORES
    ======================================== */
 
    function animateValue(el) {
        const to = parseFloat(el.dataset.to);
        const format = FMT[el.dataset.fmt];
        el.textContent = format(to);
 
        if (!section.classList.contains('active')) return;
 
        const duration = 700;
        const start = performance.now();
 
        (function step(now) {
            const p = Math.min((now - start) / duration, 1);
            el.textContent = format(to * (1 - Math.pow(1 - p, 3)));
            if (p < 1) requestAnimationFrame(step);
        })(start);
    }
 
    function deltaChip(value, unit) {
        const up = value >= 0;
        const sign = up ? '+' : '';
        return '<span class="com-delta ' + (up ? 'up' : 'down') + '">' +
            '<i class="bx ' + (up ? 'bx-up-arrow-alt' : 'bx-down-arrow-alt') + '"></i>' +
            sign + value.toFixed(1).replace('.', ',') + unit +
            '</span>';
    }
 
    function renderKpis(d) {
        const items = [
            {
                label: 'Receita de vendas', icon: 'bx-wallet', color: 'green',
                value: d.t.vendas, fmt: 'brl',
                delta: pctDelta(d.t.vendas, d.p.vendas), unit: '%',
                desc: num(d.t.pedidos) + ' pedidos fechados'
            },
            {
                label: 'Ticket médio', icon: 'bx-purchase-tag', color: 'purple',
                value: ticketOf(d.t), fmt: 'brl',
                delta: pctDelta(ticketOf(d.t), ticketOf(d.p)), unit: '%',
                desc: 'Valor médio por pedido'
            },
            {
                label: 'Meta atingida', icon: 'bx-target-lock', color: 'blue',
                value: metaOf(d.t), fmt: 'pct',
                delta: metaOf(d.t) - metaOf(d.p), unit: ' p.p.',
                desc: 'Meta: ' + brl(d.t.meta)
            },
            {
                label: 'Taxa de conversão', icon: 'bx-transfer-alt', color: 'orange',
                value: convOf(d.t), fmt: 'pct',
                delta: convOf(d.t) - convOf(d.p), unit: ' p.p.',
                desc: 'De lead para venda'
            }
        ];
 
        $('comKpis').innerHTML = items.map((k) =>
            '<article class="stat-card">' +
                '<div class="com-top">' +
                    '<span>' + k.label + '</span>' +
                    '<span class="com-icon ' + k.color + '"><i class="bx ' + k.icon + '"></i></span>' +
                '</div>' +
                '<strong class="com-value" data-to="' + k.value + '" data-fmt="' + k.fmt + '"></strong>' +
                '<div class="com-foot">' + deltaChip(k.delta, k.unit) +
                    '<span class="com-desc">' + k.desc + '</span></div>' +
            '</article>'
        ).join('');
 
        $('comKpis').querySelectorAll('.com-value').forEach(animateValue);
    }
 
    function renderMetrics(d) {
        let cycle;
        if (state.channel !== 'all') {
            cycle = CHANNEL_MAP[state.channel].cycle;
        } else {
            const bc = byChannel(d.n);
            const total = bc.reduce((a, x) => a + x.t.vendas, 0) || 1;
            cycle = bc.reduce((a, x) => a + x.c.cycle * (x.t.vendas / total), 0);
        }
 
        const last3 = d.cells.slice(9);
        const forecast = (last3.reduce((a, c) => a + c.vendas, 0) / last3.length) * 1.03;
 
        const items = [
            { label: 'Ciclo médio de venda',    icon: 'bx-timer',      color: 'blue',   value: Math.round(cycle) + ' dias' },
            { label: 'Novos clientes',          icon: 'bx-user-plus',  color: 'green',  value: num(d.t.pedidos * 0.62) },
            { label: 'Propostas em aberto',     icon: 'bx-file',       color: 'orange', value: num(Math.max(0, d.t.prop - d.t.pedidos)) },
            { label: 'Previsão do próximo mês', icon: 'bx-line-chart', color: 'purple', value: brl(forecast) }
        ];
 
        $('comMetrics').innerHTML = items.map((m) =>
            '<div class="com-metric">' +
                '<span class="com-icon ' + m.color + '"><i class="bx ' + m.icon + '"></i></span>' +
                '<div><small>' + m.label + '</small><strong>' + m.value + '</strong></div>' +
            '</div>'
        ).join('');
    }
 
 
    /* ========================================
       5. GRÁFICOS (Chart.js)
    ======================================== */
 
    function chartBase() {
        return {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { datalabels: { display: false } }
        };
    }
 
    function axisX() {
        return { grid: { display: false }, ticks: { color: COLORS.text } };
    }
 
    function axisMoney() {
        return {
            beginAtZero: true,
            grid: { color: COLORS.grid },
            ticks: {
                color: COLORS.text,
                callback: (v) => 'R$ ' + Math.round(v / 1000) + 'k'
            }
        };
    }
 
    function renderCharts(d) {
        if (typeof Chart === 'undefined') return;
 
        /* --- Vendas x meta --- */
        const sales = d.cur.map((c) => Math.round(c.vendas));
        const goal = d.cur.map((c) => Math.round(c.meta));
 
        if (!charts.sales) {
            const opt = chartBase();
            opt.interaction = { mode: 'index', intersect: false };
            opt.plugins.legend = { labels: { color: COLORS.text, usePointStyle: true, boxWidth: 8 } };
            opt.plugins.tooltip = {
                callbacks: { label: (c) => ' ' + c.dataset.label + ': ' + brl(c.parsed.y) }
            };
            opt.scales = { x: axisX(), y: axisMoney() };
 
            charts.sales = new Chart($('comSalesChart'), {
                type: 'bar',
                data: {
                    labels: d.labels,
                    datasets: [
                        {
                            type: 'bar', label: 'Vendas', data: sales,
                            backgroundColor: 'rgba(57, 132, 255, 0.78)',
                            borderRadius: 8, maxBarThickness: 48, order: 2
                        },
                        {
                            type: 'line', label: 'Meta', data: goal,
                            borderColor: COLORS.orange, backgroundColor: COLORS.orange,
                            borderDash: [6, 5], borderWidth: 2, pointRadius: 3,
                            tension: 0.3, order: 1
                        }
                    ]
                },
                options: opt
            });
        } else {
            charts.sales.data.labels = d.labels;
            charts.sales.data.datasets[0].data = sales;
            charts.sales.data.datasets[1].data = goal;
            charts.sales.update();
        }
 
        /* --- Vendas por canal --- */
        const bc = byChannel(d.n);
        const channelColors = [COLORS.blue, COLORS.purple, COLORS.green, COLORS.orange];
        const channelData = bc.map((x) => Math.round(x.t.vendas));
        const channelOffset = bc.map((x) => (state.channel === x.c.id ? 14 : 0));
 
        if (!charts.channel) {
            const opt = chartBase();
            opt.cutout = '66%';
            opt.plugins.legend = {
                position: 'bottom',
                labels: { color: COLORS.text, usePointStyle: true, boxWidth: 8, padding: 16 }
            };
            opt.plugins.tooltip = {
                callbacks: {
                    label: (c) => {
                        const total = c.dataset.data.reduce((a, b) => a + b, 0) || 1;
                        return ' ' + c.label + ': ' + brl(c.parsed) +
                               ' (' + pct((c.parsed / total) * 100) + ')';
                    }
                }
            };
 
            charts.channel = new Chart($('comChannelChart'), {
                type: 'doughnut',
                data: {
                    labels: bc.map((x) => x.c.nome),
                    datasets: [{
                        data: channelData,
                        backgroundColor: channelColors,
                        borderColor: COLORS.card,
                        borderWidth: 3,
                        offset: channelOffset
                    }]
                },
                options: opt
            });
        } else {
            charts.channel.data.datasets[0].data = channelData;
            charts.channel.data.datasets[0].offset = channelOffset;
            charts.channel.update();
        }
 
        /* --- Desempenho por vendedor --- */
        const ranking = bySeller(d.n).sort((a, b) => b.t.vendas - a.t.vendas);
        const sellerData = ranking.map((x) => Math.round(x.t.vendas));
        const sellerColors = ranking.map((x) =>
            (state.seller === 'all' || state.seller === x.s.id)
                ? COLORS.blue : 'rgba(57, 132, 255, 0.3)');
 
        if (!charts.seller) {
            const opt = chartBase();
            opt.indexAxis = 'y';
            opt.plugins.legend = { display: false };
            opt.plugins.tooltip = {
                callbacks: { label: (c) => ' ' + brl(c.parsed.x) }
            };
            opt.scales = {
                x: axisMoney(),
                y: { grid: { display: false }, ticks: { color: COLORS.text } }
            };
 
            charts.seller = new Chart($('comSellerChart'), {
                type: 'bar',
                data: {
                    labels: ranking.map((x) => x.s.nome),
                    datasets: [{
                        label: 'Vendas', data: sellerData,
                        backgroundColor: sellerColors,
                        borderRadius: 8, maxBarThickness: 34
                    }]
                },
                options: opt
            });
        } else {
            charts.seller.data.labels = ranking.map((x) => x.s.nome);
            charts.seller.data.datasets[0].data = sellerData;
            charts.seller.data.datasets[0].backgroundColor = sellerColors;
            charts.seller.update();
        }
    }
 
 
    /* ========================================
       6. FUNIL E METAS
    ======================================== */
 
    function renderFunnel(d) {
        const stages = [
            ['Leads', d.t.leads],
            ['Qualificados', d.t.qual],
            ['Reunião realizada', d.t.reun],
            ['Proposta enviada', d.t.prop],
            ['Fechados', d.t.pedidos]
        ];
        const widths = [100, 86, 72, 58, 44];
 
        $('comFunnel').innerHTML = stages.map((st, i) => {
            const rate = i === 0 ? ''
                : '↓ ' + pct((st[1] / stages[i - 1][1]) * 100);
 
            return '<div class="com-step' + (i === stages.length - 1 ? ' last' : '') +
                   '" style="width:' + widths[i] + '%">' +
                   '<strong>' + num(st[1]) + '</strong>' +
                   '<div><b>' + st[0] + '</b>' + (rate ? '<small>' + rate + '</small>' : '') + '</div>' +
                   '</div>';
        }).join('');
 
        $('comFunnelFoot').innerHTML =
            'Conversão geral: <strong>' + pct(convOf(d.t), 2) + '</strong>';
    }
 
    function renderGoals(d) {
        $('comGoals').innerHTML = bySeller(d.n)
            .sort((a, b) => metaOf(b.t) - metaOf(a.t))
            .map((x) => {
                const p = metaOf(x.t);
                const level = p >= 100 ? 'ok' : p >= 90 ? 'mid' : 'low';
 
                return '<div class="com-goal">' +
                    '<div class="com-goal-head"><strong>' + x.s.nome + '</strong>' +
                        '<span class="' + level + '">' + pct(p) + '</span></div>' +
                    '<div class="com-track"><div class="com-fill ' + level +
                        '" style="width:' + Math.min(p, 100).toFixed(1) + '%"></div></div>' +
                    '<small>' + brl(x.t.vendas) + ' de ' + brl(x.t.meta) + '</small>' +
                '</div>';
            }).join('');
    }
 
 
    /* ========================================
       7. NEGÓCIOS E INSIGHTS
    ======================================== */
 
    function renderDeals() {
        const all = filteredDeals();
        const hot = state.deal === 'hot';
 
        const list = hot
            ? all.filter((x) => x.prob >= 70).sort((a, b) => b.prob - a.prob)
            : all.filter(isRisk).sort((a, b) => b.parado - a.parado);
 
        const total = list.reduce((a, x) => a + x.valor, 0);
 
        $('comDealTotal').innerHTML = list.length
            ? (hot ? 'Alta chance de fechamento: ' : 'Exigem atenção: ') +
              '<strong>' + brl(total) + '</strong> em ' + list.length +
              (list.length === 1 ? ' negócio' : ' negócios')
            : '';
 
        $('comDealList').innerHTML = list.length
            ? list.map((x) =>
                '<li>' +
                    '<div class="com-li-main"><strong>' + x.cliente + '</strong>' +
                        '<small>' + x.etapa + ' · ' + SELLER_MAP[x.seller].nome + '</small></div>' +
                    '<div class="com-li-side"><strong>' + brl(x.valor) + '</strong>' +
                        (hot
                            ? '<span class="com-pill up">' + x.prob + '% de chance</span>'
                            : '<span class="com-pill ' + (x.parado >= 10 ? 'down' : 'mid') + '">' +
                              x.parado + ' dias parado</span>') +
                    '</div>' +
                '</li>').join('')
            : '<li class="com-empty">Nenhum negócio encontrado para estes filtros.</li>';
    }
 
    function renderInsights(d) {
        const items = [];
        const pm = metaOf(d.t);
 
        if (pm >= 100) {
            items.push(['success', 'bx-check-circle', 'Meta superada',
                'O período fechou em ' + pct(pm) + ' da meta (' + brl(d.t.vendas) +
                ' de ' + brl(d.t.meta) + ').']);
        } else if (pm >= 90) {
            items.push(['info', 'bx-info-circle', 'Perto da meta',
                'Faltam ' + brl(d.t.meta - d.t.vendas) + ' para bater a meta do período (' +
                pct(pm) + ' atingido).']);
        } else {
            items.push(['warning', 'bx-error', 'Abaixo da meta',
                'O período está em ' + pct(pm) + ' da meta. Faltam ' +
                brl(d.t.meta - d.t.vendas) + ' para alcançá-la.']);
        }
 
        if (state.channel === 'all') {
            const best = byChannel(d.n).sort((a, b) => b.t.vendas - a.t.vendas)[0];
            items.push(['info', 'bx-trending-up', 'Canal destaque',
                best.c.nome + ' responde por ' + pct((best.t.vendas / d.t.vendas) * 100) +
                ' das vendas do período.']);
        }
 
        if (state.seller === 'all') {
            const top = bySeller(d.n).sort((a, b) => metaOf(b.t) - metaOf(a.t))[0];
            items.push(['success', 'bx-star', 'Vendedor destaque',
                top.s.nome + ' lidera com ' + pct(metaOf(top.t)) + ' da meta individual.']);
        }
 
        const dc = convOf(d.t) - convOf(d.p);
        items.push(dc < 0
            ? ['warning', 'bx-down-arrow-alt', 'Conversão em queda',
               'A conversão de lead para venda caiu ' + Math.abs(dc).toFixed(2).replace('.', ',') +
               ' p.p. em relação ao período anterior.']
            : ['success', 'bx-up-arrow-alt', 'Conversão em alta',
               'A conversão de lead para venda subiu ' + dc.toFixed(2).replace('.', ',') +
               ' p.p. em relação ao período anterior.']);
 
        const risk = filteredDeals().filter(isRisk);
        if (risk.length) {
            const sum = risk.reduce((a, x) => a + x.valor, 0);
            items.push(['danger', 'bx-time-five', 'Negócios em risco',
                risk.length + (risk.length === 1 ? ' negócio' : ' negócios') + ' (' + brl(sum) +
                ') estão parados há mais de 10 dias ou com baixa chance de fechamento.']);
        }
 
        $('comInsights').innerHTML = items.slice(0, 5).map((it) =>
            '<div class="com-insight ' + it[0] + '">' +
                '<i class="bx ' + it[1] + '"></i>' +
                '<div><strong>' + it[2] + '</strong><p>' + it[3] + '</p></div>' +
            '</div>'
        ).join('');
    }
 
 
    /* ========================================
       8. TABELA DE DETALHAMENTO
    ======================================== */
 
    function buildRows(d) {
        const sellers = state.seller === 'all' ? SELLERS : [SELLER_MAP[state.seller]];
        const rows = [];
 
        for (let k = d.n - 1; k >= 0; k--) {
            const i = 12 - d.n + k;
 
            sellers.forEach((s) => {
                const c = cell(i, s.id, state.channel);
                rows.push({
                    mes: LABELS[i],
                    vendedor: s.nome,
                    pedidos: c.pedidos,
                    vendas: c.vendas,
                    meta: c.meta,
                    atingido: (c.vendas / c.meta) * 100,
                    ticket: c.vendas / c.pedidos
                });
            });
        }
 
        return rows;
    }
 
    function renderTable() {
        const all = buildRows(current);
        const term = state.search.trim().toLowerCase();
 
        tableRows = all.filter((r) => {
            const matchText = !term || (r.mes + ' ' + r.vendedor).toLowerCase().indexOf(term) !== -1;
            const matchStatus = state.status === 'all' ||
                (state.status === 'up' ? r.atingido >= 100 : r.atingido < 100);
            return matchText && matchStatus;
        });
 
        $('comTable').querySelector('thead').innerHTML =
            '<tr><th>Mês</th><th>Vendedor</th><th class="num">Pedidos</th>' +
            '<th class="num">Vendas</th><th class="num">Meta</th>' +
            '<th class="num">% da meta</th><th class="num">Ticket médio</th><th>Resultado</th></tr>';
 
        $('comTable').querySelector('tbody').innerHTML = tableRows.length
            ? tableRows.map((r) =>
                '<tr><td>' + r.mes + '</td><td>' + r.vendedor + '</td>' +
                '<td class="num">' + num(r.pedidos) + '</td>' +
                '<td class="num">' + brl(r.vendas) + '</td>' +
                '<td class="num">' + brl(r.meta) + '</td>' +
                '<td class="num">' + pct(r.atingido) + '</td>' +
                '<td class="num">' + brl(r.ticket) + '</td>' +
                '<td><span class="com-pill ' + (r.atingido >= 100 ? 'up' : 'down') + '">' +
                    (r.atingido >= 100 ? 'Acima da meta' : 'Abaixo da meta') + '</span></td></tr>'
              ).join('')
            : '<tr><td colspan="8" class="com-empty">Nenhum registro encontrado.</td></tr>';
 
        if (tableRows.length) {
            const t = tableRows.reduce((a, r) => {
                a.pedidos += r.pedidos; a.vendas += r.vendas; a.meta += r.meta;
                return a;
            }, { pedidos: 0, vendas: 0, meta: 0 });
 
            $('comTable').querySelector('tfoot').innerHTML =
                '<tr><td colspan="2">Total</td>' +
                '<td class="num">' + num(t.pedidos) + '</td>' +
                '<td class="num">' + brl(t.vendas) + '</td>' +
                '<td class="num">' + brl(t.meta) + '</td>' +
                '<td class="num">' + pct((t.vendas / t.meta) * 100) + '</td>' +
                '<td class="num">' + brl(t.vendas / t.pedidos) + '</td><td></td></tr>';
        } else {
            $('comTable').querySelector('tfoot').innerHTML = '';
        }
 
        $('comCount').textContent = tableRows.length + ' de ' + all.length + ' registros';
    }
 
 
    /* ========================================
       9. EXPORTAR CSV
    ======================================== */
 
    function exportCsv() {
        const dec = (v) => v.toFixed(2).replace('.', ',');
        const quote = (v) => '"' + String(v).replace(/"/g, '""') + '"';
 
        const header = ['Mês', 'Vendedor', 'Pedidos', 'Vendas (R$)', 'Meta (R$)',
                        '% da meta', 'Ticket médio (R$)', 'Resultado'];
 
        const lines = [header.map(quote).join(';')].concat(
            tableRows.map((r) => [
                r.mes, r.vendedor, r.pedidos, dec(r.vendas), dec(r.meta),
                dec(r.atingido), dec(r.ticket),
                r.atingido >= 100 ? 'Acima da meta' : 'Abaixo da meta'
            ].map(quote).join(';'))
        );
 
        const blob = new Blob(['\uFEFF' + lines.join('\r\n')],
                              { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
 
        link.href = url;
        link.download = 'comercial-' + new Date().toISOString().slice(0, 10) + '.csv';
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    }
 
 
    /* ========================================
       10. RENDERIZAÇÃO E EVENTOS
    ======================================== */
 
    function render() {
        current = compute();
 
        renderKpis(current);
        renderMetrics(current);
        renderCharts(current);
        renderFunnel(current);
        renderGoals(current);
        renderDeals();
        renderInsights(current);
        renderTable();
    }
 
    function fillSelect(id, allLabel, list) {
        $(id).innerHTML = '<option value="all">' + allLabel + '</option>' +
            list.map((x) => '<option value="' + x.id + '">' + x.nome + '</option>').join('');
    }
 
    function init() {
        // Mesma fonte do tema nos gráficos
        if (typeof Chart !== 'undefined') {
            Chart.defaults.font.family = "'Sora', 'Segoe UI', system-ui, sans-serif";
        }
 
        fillSelect('comSeller', 'Todos', SELLERS);
        fillSelect('comChannel', 'Todos', CHANNELS);
 
        $('comRange').addEventListener('change', (e) => {
            state.range = parseInt(e.target.value, 10);
            render();
        });
 
        $('comSeller').addEventListener('change', (e) => {
            state.seller = e.target.value;
            render();
        });
 
        $('comChannel').addEventListener('change', (e) => {
            state.channel = e.target.value;
            render();
        });
 
        $('comDealTabs').addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-tab]');
            if (!btn) return;
 
            state.deal = btn.dataset.tab;
            $('comDealTabs').querySelectorAll('button').forEach((b) => {
                b.classList.toggle('active', b === btn);
            });
            renderDeals();
        });
 
        $('comSearch').addEventListener('input', (e) => {
            state.search = e.target.value;
            renderTable();
        });
 
        $('comStatus').addEventListener('change', (e) => {
            state.status = e.target.value;
            renderTable();
        });
 
        $('comClear').addEventListener('click', () => {
            state.search = '';
            state.status = 'all';
            $('comSearch').value = '';
            $('comStatus').value = 'all';
            renderTable();
        });
 
        $('comExport').addEventListener('click', exportCsv);
 
        // Gráficos criados com a seção escondida precisam se ajustar ao abrir a aba
        new MutationObserver(() => {
            if (section.classList.contains('active')) {
                Object.keys(charts).forEach((k) => charts[k].resize());
                $('comKpis').querySelectorAll('.com-value').forEach(animateValue);
            }
        }).observe(section, { attributes: true, attributeFilter: ['class'] });
 
        render();
    }
 
    init();
 
})();