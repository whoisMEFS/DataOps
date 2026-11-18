document.addEventListener("DOMContentLoaded", function () {

    if (!document.getElementById("logKpis")) return;

    // ==========================================
    // DADOS DEMONSTRATIVOS (troque por dados reais depois)
    // ==========================================

    const MESES = ["jan", "fev", "mar", "abr", "mai", "jun", "jul", "ago", "set", "out", "nov", "dez"];

    const CENTROS = [
        { id: "sp",  nome: "São Paulo", base: 5200, meta: 5400 },
        { id: "cps", nome: "Campinas",  base: 3100, meta: 3200 },
        { id: "cwb", nome: "Curitiba",  base: 2600, meta: 2700 },
        { id: "rec", nome: "Recife",    base: 2100, meta: 2250 }
    ];

    const TRANSP = [
        { id: "rs", nome: "Rápido Sul",     share: 0.34, atraso: 0.05 },
        { id: "tl", nome: "TransLog",       share: 0.29, atraso: 0.08 },
        { id: "en", nome: "Expresso Norte", share: 0.22, atraso: 0.12 },
        { id: "vb", nome: "Via Brasil",     share: 0.15, atraso: 0.07 }
    ];

    const CATEGORIAS = [
        { nome: "Eletrônicos", estoque: 4200, minimo: 3500 },
        { nome: "Alimentos",   estoque: 6100, minimo: 5800 },
        { nome: "Vestuário",   estoque: 3300, minimo: 2600 },
        { nome: "Casa",        estoque: 2400, minimo: 2500 },
        { nome: "Autopeças",   estoque: 1800, minimo: 1500 }
    ];

    const ROTAS = [
        { orig: "São Paulo",  dest: "Rio de Janeiro", via: "Resende",    centro: "sp",  transp: "rs", pedido: "#48210", prog: 72, status: "normal", eta: "Hoje, 16:40" },
        { orig: "São Paulo",  dest: "Belo Horizonte", via: "Poços",      centro: "sp",  transp: "tl", pedido: "#48198", prog: 58, status: "late",   eta: "Hoje, 21:10" },
        { orig: "Campinas",   dest: "Brasília",       via: "Uberlândia", centro: "cps", transp: "vb", pedido: "#48177", prog: 41, status: "normal", eta: "Amanhã, 09:30" },
        { orig: "Curitiba",   dest: "Porto Alegre",   via: "Florianópolis", centro: "cwb", transp: "rs", pedido: "#48163", prog: 86, status: "early", eta: "Hoje, 13:05" },
        { orig: "Recife",     dest: "Salvador",       via: "Maceió",     centro: "rec", transp: "en", pedido: "#48140", prog: 33, status: "late",   eta: "Amanhã, 11:50" },
        { orig: "Recife",     dest: "Fortaleza",      via: "João Pessoa", centro: "rec", transp: "en", pedido: "#48122", prog: 64, status: "normal", eta: "Hoje, 19:20" }
    ];

    // Gerador pseudoaleatório fixo: os números não mudam a cada recarga.
    function gerador(semente) {
        let s = semente;
        return function () {
            s |= 0; s = (s + 0x6D2B79F5) | 0;
            let t = Math.imul(s ^ (s >>> 15), 1 | s);
            t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
            return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
        };
    }

    // Últimos 6 meses até o mês atual.
    const hoje = new Date();
    const mesesBase = [];
    for (let i = 5; i >= 0; i--) {
        const d = new Date(hoje.getFullYear(), hoje.getMonth() - i, 1);
        mesesBase.push({
            indice: 5 - i,
            rotulo: MESES[d.getMonth()] + "/" + String(d.getFullYear()).slice(2)
        });
    }

    // Um registro por mês x centro x transportadora.
    const registros = [];
    const rnd = gerador(2026);

    mesesBase.forEach(function (mes) {
        CENTROS.forEach(function (centro) {
            TRANSP.forEach(function (tr) {
                const pedidos = Math.round(centro.base * tr.share * (0.9 + rnd() * 0.2 + mes.indice * 0.012));
                const entregues = Math.round(pedidos * (0.93 + rnd() * 0.05));

                registros.push({
                    mes: mes.indice,
                    centro: centro.id,
                    transp: tr.id,
                    pedidos: pedidos,
                    entregues: entregues,
                    atrasos: Math.round(entregues * tr.atraso * (0.7 + rnd() * 0.6)),
                    abertos: pedidos - entregues,
                    meta: Math.round(centro.meta * tr.share),
                    dias: 2.1 + tr.atraso * 12 + rnd() * 0.6,
                    custo: 14 + rnd() * 4
                });
            });
        });
    });

    // ==========================================
    // FORMATAÇÃO E CORES
    // ==========================================

    const cor = {
        azul: "#3984ff",
        verde: "#34d399",
        laranja: "#fb923c",
        vermelho: "#f87171",
        texto: "#94a3b8",
        grade: "rgba(148, 163, 184, 0.12)"
    };

    const num = v => Math.round(v).toLocaleString("pt-BR");
    const dec = (v, d) => v.toLocaleString("pt-BR", { minimumFractionDigits: d, maximumFractionDigits: d });
    const pct = (v, d = 1) => dec(v, d) + "%";
    const brl = v => v.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
    const norm = t => String(t || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
    const nomeCentro = id => CENTROS.find(c => c.id === id)?.nome || id;
    const nomeTransp = id => TRANSP.find(t => t.id === id)?.nome || id;

    // ==========================================
    // ELEMENTOS E ESTADO
    // ==========================================

    const el = id => document.getElementById(id);
    const selPeriodo = el("logRange");
    const selCentro = el("logCenter");
    const selTransp = el("logCarrier");

    selCentro.innerHTML = '<option value="all">Todos os centros</option>' +
        CENTROS.map(c => `<option value="${c.id}">${c.nome}</option>`).join("");

    selTransp.innerHTML = '<option value="all">Todas</option>' +
        TRANSP.map(t => `<option value="${t.id}">${t.nome}</option>`).join("");

    let abaRota = "all";
    let linhasTabela = [];
    const graficos = {};

    // ==========================================
    // CÁLCULOS
    // ==========================================

    function agregar(lista) {
        const r = { pedidos: 0, entregues: 0, atrasos: 0, abertos: 0, meta: 0, d: 0, c: 0 };

        lista.forEach(function (x) {
            r.pedidos += x.pedidos;
            r.entregues += x.entregues;
            r.atrasos += x.atrasos;
            r.abertos += x.abertos;
            r.meta += x.meta;
            r.d += x.dias * x.entregues;
            r.c += x.custo * x.entregues;
        });

        r.dias = r.entregues ? r.d / r.entregues : 0;
        r.custo = r.entregues ? r.c / r.entregues : 0;
        r.pont = r.entregues ? ((r.entregues - r.atrasos) / r.entregues) * 100 : 0;
        r.atend = r.pedidos ? (r.entregues / r.pedidos) * 100 : 0;

        return r;
    }

    function filtros() {
        const n = Number(selPeriodo.value);
        const meses = mesesBase.slice(6 - n).map(m => m.indice);

        return { meses: meses, centro: selCentro.value, transp: selTransp.value };
    }

    function selecionar(f, ignorar) {
        return registros.filter(function (r) {
            return f.meses.includes(r.mes) &&
                (ignorar === "centro" || f.centro === "all" || r.centro === f.centro) &&
                (ignorar === "transp" || f.transp === "all" || r.transp === f.transp);
        });
    }

    const variacao = (atual, anterior) => anterior ? ((atual - anterior) / anterior) * 100 : 0;

    // ==========================================
    // INDICADORES
    // ==========================================

    function cartao(titulo, icone, cc, valor, texto, sobe, bom) {
        return `
            <article class="stat-card">
                <div class="log-top">
                    <span>${titulo}</span>
                    <span class="log-icon ${cc}"><i class="bx ${icone}"></i></span>
                </div>
                <strong class="log-value">${valor}</strong>
                <div class="log-foot">
                    <span class="log-delta ${bom ? "up" : "down"}">
                        <i class="bx ${sobe ? "bx-up-arrow-alt" : "bx-down-arrow-alt"}"></i>${texto}
                    </span>
                    <span class="log-desc">vs mês anterior</span>
                </div>
            </article>`;
    }

    function metrica(rotulo, valor, icone, cc) {
        return `
            <div class="log-metric">
                <span class="log-icon ${cc}"><i class="bx ${icone}"></i></span>
                <div><small>${rotulo}</small><strong>${valor}</strong></div>
            </div>`;
    }

    function renderIndicadores(porMes, total) {
        const a = porMes[porMes.length - 1];
        const b = porMes[porMes.length - 2] || a;

        const dEnt = variacao(a.entregues, b.entregues);
        const dPont = a.pont - b.pont;
        const dAtr = variacao(a.atrasos, b.atrasos);
        const dAbe = variacao(a.abertos, b.abertos);

        el("logKpis").innerHTML =
            cartao("Entregas realizadas", "bx-package", "blue", num(total.entregues),
                pct(Math.abs(dEnt)), dEnt >= 0, dEnt >= 0) +
            cartao("Pontualidade", "bx-time-five", "green", pct(total.pont),
                dec(Math.abs(dPont), 1) + " p.p.", dPont >= 0, dPont >= 0) +
            cartao("Entregas atrasadas", "bx-error-circle", "orange", num(total.atrasos),
                pct(Math.abs(dAtr)), dAtr >= 0, dAtr <= 0) +
            cartao("Pedidos em aberto", "bx-box", "purple", num(a.abertos),
                pct(Math.abs(dAbe)), dAbe >= 0, dAbe <= 0);

        el("logMetrics").innerHTML =
            metrica("Tempo médio de entrega", dec(total.dias, 1) + " dias", "bx-timer", "blue") +
            metrica("Custo por entrega", brl(total.custo), "bx-wallet", "green") +
            metrica("Pedidos recebidos", num(total.pedidos), "bx-cart", "orange") +
            metrica("Taxa de atendimento", pct(total.atend), "bx-check-circle", "purple");
    }

    // ==========================================
    // FLUXO DE PEDIDOS
    // ==========================================

    function renderFluxo(ultimo) {
        const p = ultimo.pedidos;
        const e = ultimo.entregues;
        const resto = p - e;

        const etapas = [
            { nome: "Pedido recebido", sub: "Entrada no sistema",  icone: "bx-receipt",   qtd: p },
            { nome: "Separação",       sub: "Picking no armazém",  icone: "bx-box",       qtd: Math.round(e + resto * 0.8) },
            { nome: "Expedição",       sub: "Carga conferida",     icone: "bx-package",   qtd: Math.round(e + resto * 0.55) },
            { nome: "Em trânsito",     sub: "Com a transportadora", icone: "bxs-truck",   qtd: Math.round(e + resto * 0.25) },
            { nome: "Entregue",        sub: "Confirmado ao cliente", icone: "bx-check-circle", qtd: e }
        ];

        let maiorQueda = 0;
        let gargalo = "";

        el("logFlow").innerHTML = etapas.map(function (et, i) {
            const perc = p ? (et.qtd / p) * 100 : 0;
            const cl = perc >= 95 ? "ok" : perc >= 90 ? "mid" : "low";
            const pill = perc >= 95 ? "up" : perc >= 90 ? "mid" : "down";

            if (i > 0) {
                const queda = etapas[i - 1].qtd - et.qtd;
                if (queda > maiorQueda) {
                    maiorQueda = queda;
                    gargalo = etapas[i - 1].nome + " → " + et.nome;
                }
            }

            return `
                <div class="log-stage">
                    <span class="log-stage-icon"><i class="bx ${et.icone}"></i></span>
                    <div class="log-stage-name"><strong>${et.nome}</strong><small>${et.sub}</small></div>
                    <div class="log-stage-count">${num(et.qtd)}<br><span class="log-pill ${pill}">${pct(perc)}</span></div>
                    <div class="log-stage-bar"><div class="${cl}" style="width:${perc.toFixed(1)}%"></div></div>
                </div>`;
        }).join("");

        el("logFlowFoot").innerHTML =
            `Maior perda entre <strong>${gargalo}</strong> (${num(maiorQueda)} pedidos).`;
    }

    // ==========================================
    // MAPA DO ARMAZÉM
    // ==========================================

    function renderMapa(centro) {
        const idx = CENTROS.findIndex(c => c.id === centro);
        const r = gerador(7 + (idx + 1) * 13);
        const media = idx === -1 ? 62 : [68, 55, 60, 72][idx];

        let soma = 0;
        let criticas = 0;
        let html = "";

        for (let i = 0; i < 48; i++) {
            const ocupacao = Math.max(8, Math.min(99, Math.round(media + (r() - 0.5) * 70)));
            const nivel = ocupacao <= 25 ? "l1" : ocupacao <= 50 ? "l2" : ocupacao <= 75 ? "l3" : "l4";
            const coluna = i % 8;
            const corredor = coluna === 2 || coluna === 5 ? " aisle" : "";

            soma += ocupacao;
            if (nivel === "l4") criticas++;

            html += `<div class="log-zone ${nivel}${corredor}" title="Zona ${i + 1}: ${ocupacao}% ocupada"></div>`;
        }

        el("logMap").innerHTML = html;
        el("logMapFoot").innerHTML =
            `<strong>${pct(soma / 48, 0)}</strong> de ocupação média · <strong>${criticas}</strong> zona(s) acima de 75%.`;

        return criticas;
    }

    // ==========================================
    // GRÁFICOS
    // ==========================================

    function opcoes(extra) {
        return Object.assign({
            responsive: true,
            maintainAspectRatio: false,
            interaction: { intersect: false, mode: "index" },
            animation: { duration: 650, easing: "easeOutQuart" },
            plugins: {
                legend: {
                    position: "top",
                    labels: {
                        color: cor.texto, usePointStyle: true, pointStyle: "circle",
                        padding: 18, boxWidth: 8, boxHeight: 8, font: { size: 12 }
                    }
                },
                tooltip: {
                    backgroundColor: "#111a2a", titleColor: "#f1f5f9", bodyColor: "#f1f5f9",
                    borderColor: "rgba(57, 132, 255, 0.35)", borderWidth: 1, padding: 12, cornerRadius: 10
                },
                // O plugin de rótulos é global no dashboard; aqui fica desligado.
                datalabels: { display: false }
            },
            scales: {
                x: { ticks: { color: cor.texto, font: { size: 11 } }, grid: { display: false }, border: { display: false } },
                y: {
                    beginAtZero: true,
                    ticks: { color: cor.texto, font: { size: 11 }, callback: v => v.toLocaleString("pt-BR") },
                    grid: { color: cor.grade, drawTicks: false },
                    border: { display: false }
                }
            }
        }, extra || {});
    }

    function barra(c) {
        return window.DataOpsCharts?.barFill?.(c) || c;
    }

    function desenhar(chave, canvasId, config) {
        const canvas = el(canvasId);
        if (!canvas || typeof Chart === "undefined") return;

        if (graficos[chave]) {
            graficos[chave].data = config.data;
            graficos[chave].update();
        } else {
            graficos[chave] = new Chart(canvas, config);
        }
    }

    function renderGraficos(porMes, f) {
        const rotulos = f.meses.map(i => mesesBase[i].rotulo);

        desenhar("entregas", "logDeliveryChart", {
            type: "bar",
            data: {
                labels: rotulos,
                datasets: [
                    {
                        label: "Entregas",
                        data: porMes.map(m => m.entregues),
                        backgroundColor: barra(cor.azul),
                        hoverBackgroundColor: "#5b9aff",
                        borderRadius: 8,
                        borderSkipped: false,
                        maxBarThickness: 46
                    },
                    {
                        type: "line",
                        label: "Meta",
                        data: porMes.map(m => m.meta),
                        borderColor: cor.laranja,
                        backgroundColor: cor.laranja,
                        borderDash: [6, 5],
                        borderWidth: 2,
                        pointRadius: 3,
                        tension: 0.3
                    }
                ]
            },
            options: opcoes()
        });

        // Estoque: ajusta o volume ao porte do centro selecionado.
        const centro = CENTROS.find(c => c.id === f.centro);
        const fator = centro ? centro.base / 5200 * 1.6 : 1.6;

        desenhar("estoque", "logStockChart", {
            type: "bar",
            data: {
                labels: CATEGORIAS.map(c => c.nome),
                datasets: [
                    {
                        label: "Em estoque",
                        data: CATEGORIAS.map(c => Math.round(c.estoque * fator)),
                        backgroundColor: barra(cor.azul),
                        borderRadius: 8,
                        borderSkipped: false,
                        maxBarThickness: 34
                    },
                    {
                        label: "Estoque mínimo",
                        data: CATEGORIAS.map(c => Math.round(c.minimo * fator)),
                        backgroundColor: barra(cor.laranja),
                        borderRadius: 8,
                        borderSkipped: false,
                        maxBarThickness: 34
                    }
                ]
            },
            options: opcoes()
        });

        // Atrasos por transportadora (ignora o filtro de transportadora).
        const porTransp = TRANSP.map(function (t) {
            const a = agregar(selecionar(f, "transp").filter(r => r.transp === t.id));
            return a.entregues ? (a.atrasos / a.entregues) * 100 : 0;
        });

        desenhar("transp", "logCarrierChart", {
            type: "bar",
            data: {
                labels: TRANSP.map(t => t.nome),
                datasets: [{
                    label: "Atrasos (%)",
                    data: porTransp.map(v => Number(v.toFixed(1))),
                    backgroundColor: porTransp.map(v => v > 10 ? cor.vermelho : v > 7 ? cor.laranja : cor.azul),
                    borderRadius: 8,
                    borderSkipped: false,
                    maxBarThickness: 46
                }]
            },
            options: opcoes({
                plugins: Object.assign({}, opcoes().plugins, {
                    legend: { display: false },
                    tooltip: Object.assign({}, opcoes().plugins.tooltip, {
                        callbacks: { label: c => "Atrasos: " + pct(c.parsed.y) }
                    })
                })
            })
        });

        return porTransp;
    }

    // ==========================================
    // META POR CENTRO
    // ==========================================

    function renderMetas(f) {
        el("logGoals").innerHTML = CENTROS.map(function (c) {
            const a = agregar(selecionar(f, "centro").filter(r => r.centro === c.id));
            const perc = a.meta ? (a.entregues / a.meta) * 100 : 0;
            const cl = perc >= 100 ? "ok" : perc >= 90 ? "mid" : "low";

            return `
                <div class="log-goal">
                    <div class="log-goal-head">
                        <strong>${c.nome}</strong>
                        <span class="${cl}">${pct(perc)}</span>
                    </div>
                    <div class="log-bar"><div class="log-fill ${cl}" style="width:${Math.min(perc, 100).toFixed(1)}%"></div></div>
                    <small>${num(a.entregues)} de ${num(a.meta)} entregas da meta</small>
                </div>`;
        }).join("");
    }

    // ==========================================
    // INSIGHTS
    // ==========================================

    function renderInsights(total, ultimo, porTransp, zonasCriticas, f) {
        const lista = [];
        const add = (tipo, icone, titulo, texto) => lista.push({ tipo, icone, titulo, texto });

        if (total.pont >= 95) {
            add("success", "bx-check-circle", "Pontualidade em dia",
                `${pct(total.pont)} das entregas chegaram no prazo no período.`);
        } else if (total.pont >= 90) {
            add("warning", "bx-time-five", "Pontualidade abaixo do ideal",
                `${pct(total.pont)} no prazo. A referência é manter acima de 95%.`);
        } else {
            add("danger", "bx-error-circle", "Pontualidade crítica",
                `Apenas ${pct(total.pont)} das entregas chegaram no prazo.`);
        }

        const pior = porTransp.indexOf(Math.max(...porTransp));
        if (porTransp[pior] > 10) {
            add("danger", "bxs-truck", `Atrasos concentrados em ${TRANSP[pior].nome}`,
                `A transportadora tem ${pct(porTransp[pior])} de entregas atrasadas. Vale rever o contrato.`);
        }

        const abaixo = CENTROS.filter(function (c) {
            const a = agregar(selecionar(f, "centro").filter(r => r.centro === c.id));
            return a.meta && a.entregues < a.meta;
        }).map(c => c.nome);

        if (abaixo.length) {
            add("warning", "bx-target-lock", "Centros abaixo da meta", abaixo.join(", ") + " ainda não atingiram a meta do período.");
        } else {
            add("success", "bx-target-lock", "Todas as metas batidas", "Todos os centros entregaram acima da meta no período.");
        }

        if (zonasCriticas >= 8) {
            add("warning", "bx-building-house", "Armazém com ocupação alta",
                `${zonasCriticas} zonas acima de 75%. Considere remanejar estoque.`);
        }

        const atrasadas = ROTAS.filter(r => r.status === "late").length;
        if (atrasadas) {
            add("info", "bx-map-alt", "Rotas atrasadas em andamento",
                `${atrasadas} carga(s) estão com previsão fora do prazo agora.`);
        }

        el("logInsights").innerHTML = lista.map(i => `
            <div class="log-insight ${i.tipo}">
                <i class="bx ${i.icone}"></i>
                <div><strong>${i.titulo}</strong><p>${i.texto}</p></div>
            </div>`).join("");
    }

    // ==========================================
    // ROTAS EM ANDAMENTO
    // ==========================================

    function renderRotas() {
        const centro = selCentro.value;
        const transp = selTransp.value;

        const base = ROTAS.filter(r =>
            (centro === "all" || r.centro === centro) &&
            (transp === "all" || r.transp === transp));

        const atrasadas = base.filter(r => r.status === "late").length;
        const lista = abaRota === "late" ? base.filter(r => r.status === "late") : base;

        el("logRouteTotal").innerHTML =
            `<strong>${base.length}</strong> rota(s) ativa(s) · <strong>${atrasadas}</strong> atrasada(s)`;

        if (!lista.length) {
            el("logRoutes").innerHTML = '<div class="log-empty">Nenhuma rota encontrada para os filtros atuais.</div>';
            return;
        }

        const texto = { normal: "No prazo", late: "Atrasada", early: "Adiantada" };
        const pill = { normal: "mid", late: "down", early: "up" };

        el("logRoutes").innerHTML = lista.map(function (r) {
            const cl = r.status === "late" ? "late" : r.status === "early" ? "early" : "";
            const pilulaCl = r.status === "normal" ? "up" : pill[r.status];

            return `
                <div class="log-route">
                    <div class="log-route-info">
                        <strong>${r.orig} → ${r.dest}</strong>
                        <small>${nomeTransp(r.transp)} · Pedido ${r.pedido}</small>
                    </div>

                    <div class="log-track">
                        <span class="log-track-line">
                            <span class="log-track-fill ${cl}" style="display:block;width:${r.prog}%"></span>
                        </span>
                        <div class="log-stop done" style="left:0"><em>${r.orig}</em></div>
                        <div class="log-stop ${r.prog >= 50 ? "done" : ""}" style="left:50%"><em>${r.via}</em></div>
                        <div class="log-stop ${r.prog >= 100 ? "done" : ""}" style="left:100%"><em>${r.dest}</em></div>
                        <span class="log-truck ${cl}" style="left:${r.prog}%"><i class="bx bxs-truck"></i></span>
                    </div>

                    <div class="log-route-side">
                        <span class="log-pill ${pilulaCl}">${texto[r.status]}</span>
                        <small>Chegada: ${r.eta}</small>
                    </div>
                </div>`;
        }).join("");
    }

    // ==========================================
    // TABELA DE DETALHAMENTO
    // ==========================================

    function montarLinhas(f) {
        const linhas = [];

        f.meses.slice().reverse().forEach(function (m) {
            CENTROS.forEach(function (c) {
                const a = agregar(selecionar(f).filter(r => r.mes === m && r.centro === c.id));
                if (!a.pedidos) return;

                linhas.push({
                    mes: mesesBase[m].rotulo,
                    centro: c.nome,
                    pedidos: a.pedidos, entregues: a.entregues,
                    pont: a.pont, atrasos: a.atrasos, meta: a.meta
                });
            });
        });

        return linhas;
    }

    function renderTabela() {
        const busca = norm(el("logSearch").value);
        const status = el("logStatus").value;

        const visiveis = linhasTabela.filter(function (l) {
            const okBusca = !busca || norm(l.mes + " " + l.centro).includes(busca);
            const okStatus = status === "all" ||
                (status === "up" ? l.entregues >= l.meta : l.entregues < l.meta);
            return okBusca && okStatus;
        });

        const tabela = el("logTable");

        tabela.querySelector("thead").innerHTML = `
            <tr>
                <th>Mês</th><th>Centro</th>
                <th class="num">Pedidos</th><th class="num">Entregas</th>
                <th class="num">No prazo</th><th class="num">Atrasos</th>
                <th class="num">Meta</th><th class="num">Resultado</th>
            </tr>`;

        tabela.querySelector("tbody").innerHTML = visiveis.length
            ? visiveis.map(function (l) {
                const dif = variacao(l.entregues, l.meta);
                return `
                    <tr>
                        <td>${l.mes}</td><td>${l.centro}</td>
                        <td class="num">${num(l.pedidos)}</td>
                        <td class="num">${num(l.entregues)}</td>
                        <td class="num">${pct(l.pont)}</td>
                        <td class="num">${num(l.atrasos)}</td>
                        <td class="num">${num(l.meta)}</td>
                        <td class="num"><span class="log-pill ${dif >= 0 ? "up" : "down"}">${dif >= 0 ? "+" : ""}${dec(dif, 1)}%</span></td>
                    </tr>`;
            }).join("")
            : '<tr><td colspan="8" class="log-empty">Nenhum registro encontrado.</td></tr>';

        const t = visiveis.reduce(function (s, l) {
            s.pedidos += l.pedidos; s.entregues += l.entregues;
            s.atrasos += l.atrasos; s.meta += l.meta;
            return s;
        }, { pedidos: 0, entregues: 0, atrasos: 0, meta: 0 });

        const pontTotal = t.entregues ? ((t.entregues - t.atrasos) / t.entregues) * 100 : 0;
        const difTotal = variacao(t.entregues, t.meta);

        tabela.querySelector("tfoot").innerHTML = visiveis.length ? `
            <tr>
                <td colspan="2">Total</td>
                <td class="num">${num(t.pedidos)}</td>
                <td class="num">${num(t.entregues)}</td>
                <td class="num">${pct(pontTotal)}</td>
                <td class="num">${num(t.atrasos)}</td>
                <td class="num">${num(t.meta)}</td>
                <td class="num">${difTotal >= 0 ? "+" : ""}${dec(difTotal, 1)}%</td>
            </tr>` : "";

        el("logCount").textContent = `${visiveis.length} linha(s) exibida(s).`;
        tabela.dataset.visiveis = JSON.stringify(visiveis);
    }

    // ==========================================
    // EXPORTAR CSV
    // ==========================================

    el("logExport").addEventListener("click", function () {
        const visiveis = JSON.parse(el("logTable").dataset.visiveis || "[]");

        if (!visiveis.length) {
            alert("Não há registros para exportar.");
            return;
        }

        const dados = [
            ["Mês", "Centro", "Pedidos", "Entregas", "No prazo (%)", "Atrasos", "Meta"],
            ...visiveis.map(l => [l.mes, l.centro, l.pedidos, l.entregues, l.pont.toFixed(1).replace(".", ","), l.atrasos, l.meta])
        ];

        const csv = dados.map(l => l.map(v => '"' + String(v).replace(/"/g, '""') + '"').join(";")).join("\r\n");
        const arquivo = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
        const link = document.createElement("a");

        link.href = URL.createObjectURL(arquivo);
        link.download = "logistica-dataops.csv";
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
    });

    // ==========================================
    // RENDERIZAÇÃO GERAL
    // ==========================================

    function renderizar() {
        const f = filtros();
        const recs = selecionar(f);
        const porMes = f.meses.map(m => agregar(recs.filter(r => r.mes === m)));
        const total = agregar(recs);
        const ultimo = porMes[porMes.length - 1];

        renderIndicadores(porMes, total);
        renderFluxo(ultimo);
        const zonas = renderMapa(f.centro);
        const porTransp = renderGraficos(porMes, f);
        renderMetas(f);
        renderInsights(total, ultimo, porTransp || [0], zonas, f);
        renderRotas();

        linhasTabela = montarLinhas(f);
        renderTabela();
    }

    // ==========================================
    // EVENTOS
    // ==========================================

    [selPeriodo, selCentro, selTransp].forEach(s => s.addEventListener("change", renderizar));

    el("logSearch").addEventListener("input", renderTabela);
    el("logStatus").addEventListener("change", renderTabela);

    el("logClear").addEventListener("click", function () {
        el("logSearch").value = "";
        el("logStatus").value = "all";
        renderTabela();
    });

    el("logRouteTabs").addEventListener("click", function (e) {
        const botao = e.target.closest("button[data-tab]");
        if (!botao) return;

        abaRota = botao.dataset.tab;
        this.querySelectorAll("button").forEach(b => b.classList.toggle("active", b === botao));
        renderRotas();
    });

    // Ajusta os gráficos quando a página é aberta (eles nascem escondidos).
    const redimensionar = () => setTimeout(() => {
        Object.values(graficos).forEach(g => g.resize());
    }, 120);

    document.querySelector('.menu-item[data-page="logistics"]')?.addEventListener("click", redimensionar);
    window.addEventListener("hashchange", redimensionar);

    renderizar();
});
