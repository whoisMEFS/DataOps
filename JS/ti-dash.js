/* ========================================
   DATAOPS | TI (War Room de incidentes)
   Dados demonstrativos gerados localmente.
======================================== */
(function () {
    "use strict";

    document.addEventListener("DOMContentLoaded", function () {
        if (!document.getElementById("tiKpis")) return;

        const $ = (id) => document.getElementById(id);

        // ---------- Utilidades ----------
        const esc = (v) => String(v == null ? "" : v).replace(/[&<>"']/g, (c) =>
            ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
        const norm = (v) => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();
        const avg = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
        const fmtMin = (m) => {
            if (m == null) return "—";
            if (m < 60) return Math.round(m) + " min";
            return Math.floor(m / 60) + "h " + String(Math.round(m % 60)).padStart(2, "0") + "m";
        };
        const fmtAgo = (h) => (h < 1 ? Math.max(1, Math.round(h * 60)) + " min" : h < 24 ? Math.round(h) + " h" : Math.round(h / 24) + " d");
        const NOW = Date.now();
        const fmtT = (t) => {
            const d = new Date(t);
            return (NOW - t) / 3600000 > 20
                ? d.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" })
                : d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
        };

        // ---------- Serviços, dependências e equipes ----------
        const SERVICES = [
            { id: "api-gateway",     team: "Plataforma",       rps: "18.2k", x: 8,  y: 48 },
            { id: "auth",            team: "Plataforma",       rps: "6.4k",  x: 32, y: 18 },
            { id: "checkout",        team: "Pagamentos",       rps: "12.4k", x: 32, y: 38 },
            { id: "cart",            team: "Plataforma",       rps: "9.7k",  x: 32, y: 58 },
            { id: "search-svc",      team: "Busca",            rps: "11.4k", x: 32, y: 78 },
            { id: "payments",        team: "Pagamentos",       rps: "4.3k",  x: 58, y: 18 },
            { id: "inventory",       team: "Plataforma",       rps: "4.2k",  x: 58, y: 38 },
            { id: "autocomplete",    team: "Busca",            rps: "14.5k", x: 58, y: 58 },
            { id: "recommendations", team: "Busca",            rps: "3.1k",  x: 58, y: 78 },
            { id: "db-orders",       team: "Infraestrutura",   rps: "2.8k",  x: 88, y: 18 },
            { id: "notify-svc",      team: "Infraestrutura",   rps: "1.9k",  x: 88, y: 38 },
            { id: "redis-cache",     team: "Infraestrutura",   rps: "31k",   x: 88, y: 58 },
            { id: "search-index",    team: "Busca",            rps: "5.1k",  x: 88, y: 78 }
        ];
        const SV = {};
        SERVICES.forEach((s) => (SV[s.id] = s));
        const TEAMS = ["Plataforma", "Pagamentos", "Busca", "Infraestrutura"];

        // [dependente, dependência]
        const EDGES = [
            ["api-gateway", "auth"], ["api-gateway", "checkout"], ["api-gateway", "cart"], ["api-gateway", "search-svc"],
            ["checkout", "payments"], ["checkout", "inventory"], ["checkout", "cart"],
            ["cart", "inventory"], ["cart", "redis-cache"],
            ["payments", "db-orders"], ["payments", "notify-svc"],
            ["inventory", "db-orders"], ["inventory", "redis-cache"],
            ["auth", "redis-cache"],
            ["autocomplete", "search-svc"], ["autocomplete", "redis-cache"],
            ["recommendations", "search-svc"], ["recommendations", "redis-cache"],
            ["search-svc", "search-index"]
        ];
        const dependents = {};
        EDGES.forEach(([a, b]) => (dependents[b] = (dependents[b] || []).concat(a)));
        function blastOf(id) {
            const seen = new Set([id]);
            const fila = [id];
            while (fila.length) {
                (dependents[fila.shift()] || []).forEach((d) => {
                    if (!seen.has(d)) { seen.add(d); fila.push(d); }
                });
            }
            return seen;
        }

        // ---------- Dados dos incidentes ----------
        const CAUSES = ["Deploy / regressão", "Capacidade", "Dependência externa", "Configuração", "Banco de dados", "Rede"];
        const ACTIONS = {
            "Deploy / regressão": "rollback para a versão anterior",
            "Capacidade": "escala horizontal das instâncias",
            "Dependência externa": "failover para o provedor secundário",
            "Configuração": "reversão da configuração",
            "Banco de dados": "failover da réplica e limpeza de conexões",
            "Rede": "redirecionamento de tráfego entre zonas"
        };
        const OWNERS = ["Priscila A.", "Diego M.", "Samuel R.", "Larissa C.", "Rafael T."];
        const TITLES = {
            "api-gateway": ["Latência elevada no gateway", "Picos de 502 em rotas públicas"],
            "auth": ["Falha intermitente de login", "Tokens expirando antes do prazo"],
            "checkout": ["Erro ao finalizar pedido", "Timeout no cálculo de frete"],
            "cart": ["Carrinho perdendo itens", "Lentidão ao adicionar produtos"],
            "search-svc": ["Resultados de busca vazios", "Taxa de erro acima do normal"],
            "payments": ["Recusas anormais no gateway", "Atraso na confirmação de pagamento"],
            "inventory": ["Estoque divergente entre regiões", "Fila de reserva travada"],
            "autocomplete": ["Sugestões lentas", "Autocomplete retornando 500"],
            "recommendations": ["Recomendações desatualizadas", "Job de treino falhou"],
            "db-orders": ["Conexões esgotadas no pool", "Réplica com atraso de replicação"],
            "notify-svc": ["Backlog de e-mails", "Falha no envio de SMS"],
            "redis-cache": ["Evicções em alta", "Latência do cluster elevada"],
            "search-index": ["Reindexação lenta", "Latência p99 elevada"]
        };

        function rng(seed) {
            return function () {
                seed |= 0; seed = (seed + 0x6D2B79F5) | 0;
                let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
                t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
                return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
            };
        }
        const rand = rng(20261029);
        const pick = (a) => a[Math.floor(rand() * a.length)];

        // Incidentes "ao vivo" (curados para a demonstração)
        const LIVE = [
            { id: "INC-2294", title: "Taxa de erro 5xx acima de 2%", service: "payments", sev: 2, status: "triggered", owner: "—", hoursAgo: 0.15, ackMin: null, resolveMin: null, cause: "Banco de dados", auto: false, reopened: false,
              hyp: { strong: "74% dos 5xx em payments vêm de db-orders · pool=primary", text: "Conexões do pool em 100% desde <code>14:02</code>. Recomendado: failover para a réplica." } },
            { id: "INC-2293", title: "Memória do cache em 91%", service: "redis-cache", sev: 3, status: "triggered", owner: "—", hoursAgo: 0.4, ackMin: null, resolveMin: null, cause: "Capacidade", auto: false, reopened: false,
              hyp: { strong: "Evicções crescendo desde o deploy #4466", text: "Chaves sem TTL em <code>session:*</code>. Recomendado: aplicar TTL e escalar o cluster." } },
            { id: "INC-2291", title: "Cache-warm reiniciando em loop", service: "search-svc", sev: 2, status: "ack", owner: "Priscila A.", hoursAgo: 0.9, ackMin: 4, resolveMin: null, cause: "Deploy / regressão", auto: false, reopened: false,
              hyp: { strong: "89% dos erros em search-svc compartilham region=us-east-1 · build=4471", text: "Provável regressão do cache-warm no deploy <code>#4471</code>. Recomendado: rollback — similar ao INC-2104 (resolvido em 11 min)." } },
            { id: "INC-2289", title: "Latência p99 elevada", service: "search-index", sev: 3, status: "ack", owner: "Diego M.", hoursAgo: 1.6, ackMin: 6, resolveMin: null, cause: "Capacidade", auto: false, reopened: false },
            { id: "INC-2288", title: "Backlog na fila de notificações", service: "notify-svc", sev: 3, status: "mitigated", owner: "Rafael T.", hoursAgo: 3.2, ackMin: 5, mitigateMin: 96, resolveMin: null, cause: "Capacidade", auto: false, reopened: false }
        ];

        // Histórico gerado (60 dias)
        const hist = [];
        for (let n = 0; n < 200; n++) {
            const r = rand();
            const sev = r < 0.05 ? 1 : r < 0.33 ? 2 : 3;
            const svc = pick(SERVICES);
            const h = sev === 1 ? 168 + rand() * 1250 : 2 + rand() * 1438;
            const auto = sev === 3 && rand() < 0.45;
            const ackMin = auto ? 1 : Math.round(sev === 1 ? 1 + rand() * 4 : sev === 2 ? 2 + rand() * 8 : 3 + rand() * 15);
            let res = Math.round(sev === 1 ? 50 + rand() * 190 : sev === 2 ? 25 + rand() * 130 : 12 + rand() * 110);
            res = Math.max(ackMin + 2, Math.min(res, Math.floor(h * 60) - 5));
            hist.push({
                title: pick(TITLES[svc.id]), service: svc.id, sev, status: "resolved",
                owner: auto ? "Automático" : pick(OWNERS), hoursAgo: h, ackMin, resolveMin: res,
                cause: pick(CAUSES), auto, reopened: rand() < 0.06
            });
        }
        hist.sort((a, b) => a.hoursAgo - b.hoursAgo).forEach((i, k) => (i.id = "INC-" + (2287 - k)));

        const all = LIVE.concat(hist);
        const byId = {};
        all.forEach((i) => (byId[i.id] = i));

        // ---------- Estado ----------
        const st = { range: 24, service: "all", sev: "all", team: "all", sel: null, svc: null, hover: null, q: "", status: "all" };
        const base = (i) =>
            (st.service === "all" || i.service === st.service) &&
            (st.sev === "all" || i.sev === Number(st.sev)) &&
            (st.team === "all" || SV[i.service].team === st.team);
        const win = (a, b) => all.filter((i) => base(i) && i.hoursAgo >= a && i.hoursAgo < b);
        const active = (arr) => arr.filter((i) => i.status !== "resolved");

        const STATUS = {
            triggered: { label: "Acionado", pill: "down" },
            ack: { label: "Reconhecido", pill: "info" },
            mitigated: { label: "Mitigado", pill: "mid" },
            resolved: { label: "Resolvido", pill: "up" }
        };

        // ---------- Filtros (preenche selects) ----------
        $("tiService").innerHTML = '<option value="all">Todos</option>' + SERVICES.map((s) => `<option value="${s.id}">${s.id}</option>`).join("");
        $("tiTeam").innerHTML = '<option value="all">Todas</option>' + TEAMS.map((t) => `<option value="${t}">${t}</option>`).join("");

        // ============================================================
        // INDICADORES
        // ============================================================
        function delta(c, p, lowerIsBetter) {
            if (c == null || p == null || p === 0) return "";
            const diff = c - p;
            const pct = Math.round((diff / p) * 100);
            const good = lowerIsBetter ? diff <= 0 : diff >= 0;
            const arrow = diff > 0 ? "bx-up-arrow-alt" : "bx-down-arrow-alt";
            return `<span class="ti-delta ${good ? "up" : "down"}"><i class="bx ${arrow}"></i>${Math.abs(pct)}%</span>`;
        }

        function renderKpis() {
            const cur = win(0, st.range);
            const prev = win(st.range, st.range * 2);
            const act = active(all.filter(base));
            const n = (s) => act.filter((i) => i.sev === s).length;
            const mtta = (a) => avg(a.filter((i) => i.ackMin != null).map((i) => i.ackMin));
            const mttr = (a) => avg(a.filter((i) => i.status === "resolved").map((i) => i.resolveMin));

            const cards = [
                { label: "Incidentes ativos", icon: "bx-error-circle", color: "orange", value: act.length, delta: "", desc: `${n(1)} SEV-1 · ${n(2)} SEV-2 · ${n(3)} SEV-3` },
                { label: "Incidentes no período", icon: "bx-bell", color: "blue", value: cur.length, delta: delta(cur.length, prev.length, true), desc: "vs período anterior" },
                { label: "MTTA", icon: "bx-time-five", color: "purple", value: fmtMin(mtta(cur)), delta: delta(mtta(cur), mtta(prev), true), desc: "meta: até 10 min" },
                { label: "MTTR", icon: "bx-timer", color: "green", value: fmtMin(mttr(cur)), delta: delta(mttr(cur), mttr(prev), true), desc: "meta: até 2 h" }
            ];

            $("tiKpis").innerHTML = cards.map((c) => `
                <article class="stat-card">
                    <div class="ti-top"><span>${c.label}</span><span class="ti-icon ${c.color}"><i class="bx ${c.icon}"></i></span></div>
                    <span class="ti-value">${c.value}</span>
                    <div class="ti-foot">${c.delta}<span class="ti-desc">${c.desc}</span></div>
                </article>`).join("");
        }

        function renderMetrics() {
            const cur = win(0, st.range);
            const resolved = cur.filter((i) => i.status === "resolved");
            const sla = { 1: 120, 2: 240, 3: 480 };
            const slaOk = resolved.length ? Math.round((resolved.filter((i) => i.resolveMin <= sla[i.sev]).length / resolved.length) * 100) : null;
            const autoPct = cur.length ? Math.round((cur.filter((i) => i.auto).length / cur.length) * 100) : null;
            const reopenPct = cur.length ? Math.round((cur.filter((i) => i.reopened).length / cur.length) * 100) : null;
            const sev1 = all.filter((i) => base(i) && i.sev === 1).map((i) => i.hoursAgo);
            const daysNo = sev1.length ? Math.floor(Math.min.apply(null, sev1) / 24) + " d" : "—";
            const perDay = cur.length / (st.range / 24);

            const countBy = (key) => {
                const m = {};
                cur.forEach((i) => { const k = key(i); m[k] = (m[k] || 0) + 1; });
                const e = Object.entries(m).sort((a, b) => b[1] - a[1])[0];
                return e ? e[0] : "—";
            };

            const items = [
                ["Dias sem SEV-1", daysNo, "bx-shield-quarter", "green", "Tempo desde o último incidente crítico"],
                ["SLA cumprido", slaOk == null ? "—" : slaOk + "%", "bx-badge-check", "green", "Resolvidos dentro da meta por severidade"],
                ["Auto-resolvidos", autoPct == null ? "—" : autoPct + "%", "bx-bot", "purple", "Resolvidos por runbook automático"],
                ["Reaberturas", reopenPct == null ? "—" : reopenPct + "%", "bx-refresh", "orange", "Incidentes reabertos após resolução"],
                ["Incidentes por dia", perDay.toLocaleString("pt-BR", { maximumFractionDigits: 1 }), "bx-calendar", "blue", "Média no período"],
                ["Escalonamentos", cur.filter((i) => i.sev <= 2).length, "bx-up-arrow-circle", "orange", "SEV-1 + SEV-2 no período"],
                ["Serviço mais afetado", countBy((i) => i.service), "bx-server", "blue", "Maior número de incidentes"],
                ["Principal causa raiz", countBy((i) => i.cause), "bx-bug", "purple", "Causa mais frequente"]
            ];

            $("tiMetrics").innerHTML = items.map((m) => `
                <div class="ti-metric" title="${esc(m[4])}">
                    <span class="ti-icon ${m[3]}"><i class="bx ${m[2]}"></i></span>
                    <div><small>${m[0]}</small><strong>${esc(m[1])}</strong></div>
                </div>`).join("");
        }

        // ============================================================
        // PLANTÃO
        // ============================================================
        function renderOnCall() {
            const d = new Date(NOW);
            const nxt = new Date(d);
            nxt.setMinutes(0, 0, 0);
            const h = d.getHours();
            nxt.setHours(h < 8 ? 8 : h < 20 ? 20 : 32);
            const diff = Math.round((nxt - d) / 60000);
            const handoff = Math.floor(diff / 60) + "h " + String(diff % 60).padStart(2, "0") + "m";
            const own = (key) => active(all).filter((i) => i.owner === key).length;

            const people = [
                { role: "Primário", name: "Priscila Alves", ini: "PA", info: `${own("Priscila A.")} incidente(s) ativo(s) · troca em ${handoff}` },
                { role: "Secundário", name: "Diego Martins", ini: "DM", info: own("Diego M.") ? `backup · ${own("Diego M.")} ativo(s)` : "backup · livre" },
                { role: "Gestor", name: "Samuel Rocha", ini: "SR", info: "escalonamento nível 3" }
            ];

            $("tiOnCall").innerHTML = people.map((p) => `
                <div class="ti-person">
                    <span class="ti-avatar">${p.ini}</span>
                    <div><small>${p.role}</small><strong>${p.name}</strong><span>${p.info}</span></div>
                </div>`).join("");
        }

        // ============================================================
        // COPILOTO
        // ============================================================
        function renderCopilot() {
            const box = $("tiCopilot");
            const top = active(all).filter((i) => i.hyp).sort((a, b) => a.sev - b.sev || a.hoursAgo - b.hoursAgo)[0];
            if (!top) { box.style.display = "none"; return; }
            box.style.display = "";
            const blast = Array.from(blastOf(top.service)).filter((s) => s !== top.service);
            const impacto = blast.length ? ` Raio de impacto previsto: ${esc(blast.join(", "))}.` : "";

            box.innerHTML = `
                <span class="ti-copilot-tag">Copiloto de causa raiz</span>
                <div class="ti-copilot-text"><strong>${esc(top.hyp.strong)}</strong>${top.hyp.text}${impacto}</div>
                <button type="button" data-id="${top.id}">Investigar →</button>`;
        }

        // ============================================================
        // QUADRO
        // ============================================================
        function boardItems() {
            return all.filter((i) => base(i) && (!st.svc || i.service === st.svc) && (i.status !== "resolved" || i.hoursAgo < st.range));
        }

        function renderBoard() {
            const items = boardItems();
            const groups = [
                ["triggered", "Acionados"], ["ack", "Reconhecidos"], ["mitigated", "Mitigados"], ["resolved", "Resolvidos recentemente"]
            ];
            let html = "";
            groups.forEach(([key, title]) => {
                let list = items.filter((i) => i.status === key).sort((a, b) => a.hoursAgo - b.hoursAgo);
                if (key === "resolved") list = list.slice(0, 3);
                html += `<div class="ti-group-title"><span>${title}</span><span>${list.length}</span></div>`;
                if (!list.length) {
                    if (key === "triggered") html += '<div class="ti-empty">Nenhum alerta acionado</div>';
                    return;
                }
                html += list.map((i) => `
                    <button type="button" class="ti-incident s${i.sev}${st.sel === i.id ? " active" : ""}" data-id="${i.id}">
                        <div class="ti-inc-head">
                            <span><span class="ti-sev s${i.sev}">SEV-${i.sev}</span> ${i.id}</span>
                            <span class="ti-pill ${STATUS[i.status].pill}">${STATUS[i.status].label}</span>
                        </div>
                        <strong>${esc(i.title)}</strong>
                        <small>${esc(i.service)} · ${esc(i.owner)} · há ${fmtAgo(i.hoursAgo)}</small>
                    </button>`).join("");
            });
            $("tiBoard").innerHTML = html;
            const open = items.filter((i) => i.status !== "resolved").length;
            $("tiBoardCount").textContent = `${open} ${open === 1 ? "aberto" : "abertos"}`;
        }

        // ============================================================
        // MAPA DE DEPENDÊNCIAS
        // ============================================================
        const DOT_OFFSET = 3.6; // alinha as linhas ao centro do círculo
        const nodeEls = new Map();
        const lineEls = [];
        const svg = $("tiEdges");
        const mapEl = $("tiMap");

        EDGES.forEach(([a, b]) => {
            const l = document.createElementNS("http://www.w3.org/2000/svg", "line");
            l.setAttribute("x1", SV[a].x); l.setAttribute("y1", SV[a].y + DOT_OFFSET);
            l.setAttribute("x2", SV[b].x); l.setAttribute("y2", SV[b].y + DOT_OFFSET);
            svg.appendChild(l);
            lineEls.push({ a, b, el: l });
        });

        SERVICES.forEach((s) => {
            const b = document.createElement("button");
            b.type = "button";
            b.className = "ti-node";
            b.style.left = s.x + "%";
            b.style.top = s.y + "%";
            b.dataset.id = s.id;
            b.innerHTML = `<span class="ti-node-dot"></span><b>${s.id}</b><small>${s.rps} rps</small>`;
            const over = () => { st.hover = s.id; applyMap(); };
            const out = () => { st.hover = null; applyMap(); };
            b.addEventListener("mouseenter", over);
            b.addEventListener("mouseleave", out);
            b.addEventListener("focus", over);
            b.addEventListener("blur", out);
            b.addEventListener("click", () => {
                st.svc = st.svc === s.id ? null : s.id;
                st.sel = null;
                renderSelection();
            });
            mapEl.appendChild(b);
            nodeEls.set(s.id, b);
        });

        mapEl.addEventListener("click", (e) => {
            if (e.target === mapEl || e.target === svg) {
                st.svc = null; st.sel = null;
                renderSelection();
            }
        });

        function renderMap() {
            const act = active(all);
            let ok = 0, warn = 0, crit = 0;
            SERVICES.forEach((s) => {
                const list = act.filter((i) => i.service === s.id);
                const isCrit = list.some((i) => i.sev <= 2 && i.status !== "mitigated");
                const el = nodeEls.get(s.id);
                el.classList.toggle("crit", isCrit);
                el.classList.toggle("warn", !isCrit && list.length > 0);
                if (isCrit) crit++; else if (list.length) warn++; else ok++;
            });
            mapEl.dataset.summary = `<strong>${SERVICES.length}</strong> serviços · ${ok} saudáveis · ${warn} em atenção · ${crit} crítico(s)`;
            applyMap();
        }

        function applyMap() {
            const selSvc = st.svc || (st.sel && byId[st.sel] ? byId[st.sel].service : null);
            const focus = st.hover || selSvc;
            const blast = focus ? blastOf(focus) : null;

            nodeEls.forEach((el, id) => {
                el.classList.toggle("hot", !!blast && blast.has(id));
                el.classList.toggle("dim", !!blast && !blast.has(id));
                el.classList.toggle("sel", id === selSvc);
            });
            lineEls.forEach((l) => {
                const inside = !!blast && blast.has(l.a) && blast.has(l.b);
                l.el.classList.toggle("hot", inside);
                l.el.classList.toggle("dim", !!blast && !inside);
            });

            if (focus) {
                const dep = Array.from(blast).filter((s) => s !== focus);
                $("tiMapFoot").innerHTML = `Raio de impacto de <strong>${esc(focus)}</strong>: ` +
                    (dep.length ? `${dep.length} serviço(s) dependente(s) — ${esc(dep.join(", "))}.` : "nenhum serviço depende dele.");
            } else {
                $("tiMapFoot").innerHTML = mapEl.dataset.summary || "";
            }
        }

        // ============================================================
        // LINHA DO TEMPO
        // ============================================================
        function eventsFor(i) {
            const m = 60000;
            const t0 = NOW - i.hoursAgo * 3600000;
            const ev = [{ t: t0, cls: "alert", tag: "Alerta", title: "Alerta disparado em " + i.service, text: `${i.title} · SEV-${i.sev}.` }];
            if (i.ackMin != null) {
                ev.push({ t: t0 + i.ackMin * m, cls: "", tag: "Reconhecido", title: i.id + " reconhecido", text: i.owner === "Automático" ? "Runbook automático acionado." : "Responsável: " + i.owner + "." });
            }
            if (i.hyp) {
                ev.push({ t: t0 + ((i.ackMin || 0) + 2) * m, cls: "", tag: "Copiloto", title: "Hipótese de causa raiz", text: i.hyp.strong + "." });
            }
            const mit = i.mitigateMin != null ? i.mitigateMin : (i.resolveMin != null ? Math.round(i.resolveMin * 0.7) : null);
            if (mit != null) {
                ev.push({ t: t0 + mit * m, cls: "mitigate", tag: "Mitigação", title: "Impacto mitigado", text: "Ação aplicada: " + ACTIONS[i.cause] + "." });
            }
            if (i.status === "resolved") {
                ev.push({ t: t0 + i.resolveMin * m, cls: "resolved", tag: "Resolvido", title: i.id + " resolvido", text: `Causa raiz: ${i.cause} · duração ${fmtMin(i.resolveMin)}.` });
            }
            return ev.filter((e) => e.t <= NOW).map((e) => Object.assign(e, { inc: i.id }));
        }

        function renderTimeline() {
            const src = st.sel && byId[st.sel] ? [byId[st.sel]] : boardItems();
            const ev = [].concat.apply([], src.map(eventsFor)).sort((a, b) => b.t - a.t).slice(0, st.sel ? 20 : 14);
            $("tiTimelineTag").textContent = st.sel || "Ao vivo";
            $("tiTimeline").innerHTML = ev.length
                ? ev.map((e) => `
                    <div class="ti-event ${e.cls}">
                        <time>${fmtT(e.t)}</time>
                        <div class="ti-event-body">
                            <small>${e.tag}${st.sel ? "" : " · " + e.inc}</small>
                            <strong>${esc(e.title)}</strong>
                            <p>${esc(e.text)}</p>
                        </div>
                    </div>`).join("")
                : '<div class="ti-empty">Sem eventos para os filtros atuais.</div>';
        }

        // ============================================================
        // GRÁFICOS
        // ============================================================
        const C = { azul: "#3984ff", verde: "#34d399", roxo: "#a78bfa", laranja: "#fb923c", vermelho: "#f87171", amarelo: "#fbbf24", texto: "#94a3b8", grade: "rgba(148,163,184,0.12)" };
        const charts = {};

        function chartOpts(extra) {
            const o = {
                responsive: true,
                maintainAspectRatio: false,
                animation: { duration: 500 },
                interaction: { intersect: false, mode: "index" },
                plugins: {
                    datalabels: { display: false },
                    legend: { position: "top", labels: { color: C.texto, usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8, padding: 16, font: { size: 12 } } },
                    tooltip: { backgroundColor: "#111a2a", titleColor: "#f1f5f9", bodyColor: "#f1f5f9", borderColor: "rgba(57,132,255,0.35)", borderWidth: 1, padding: 12, cornerRadius: 10 }
                },
                scales: {
                    x: { ticks: { color: C.texto, maxRotation: 0, autoSkip: true, font: { size: 11 } }, grid: { display: false }, border: { display: false } },
                    y: { beginAtZero: true, ticks: { color: C.texto, precision: 0, font: { size: 11 } }, grid: { color: C.grade, drawTicks: false }, border: { display: false } }
                }
            };
            Object.keys(extra || {}).forEach((k) => {
                o[k] = k === "plugins" ? Object.assign({}, o.plugins, extra.plugins) : extra[k];
            });
            return o;
        }

        function buildCharts() {
            if (typeof Chart === "undefined") {
                console.error("Chart.js não foi carregado.");
                return;
            }
            const stackedScales = chartOpts().scales;
            stackedScales.x.stacked = true;
            stackedScales.y.stacked = true;

            charts.time = new Chart($("tiTimeChart"), {
                type: "bar",
                data: { labels: [], datasets: [
                    { label: "SEV-1", data: [], backgroundColor: C.vermelho, borderRadius: 4, maxBarThickness: 36 },
                    { label: "SEV-2", data: [], backgroundColor: C.amarelo, borderRadius: 4, maxBarThickness: 36 },
                    { label: "SEV-3", data: [], backgroundColor: C.azul, borderRadius: 4, maxBarThickness: 36 }
                ] },
                options: chartOpts({ scales: stackedScales })
            });

            const hScales = chartOpts().scales;
            charts.service = new Chart($("tiServiceChart"), {
                type: "bar",
                data: { labels: [], datasets: [{ label: "MTTR (min)", data: [], backgroundColor: C.verde, borderRadius: 6, maxBarThickness: 22 }] },
                options: chartOpts({ indexAxis: "y", scales: { x: Object.assign(hScales.y, {}), y: Object.assign(hScales.x, {}) }, plugins: { legend: { display: false } } })
            });

            charts.cause = new Chart($("tiCauseChart"), {
                type: "doughnut",
                data: { labels: [], datasets: [{ data: [], backgroundColor: [C.azul, C.verde, C.roxo, C.laranja, C.amarelo, C.vermelho], borderColor: "#111a2a", borderWidth: 4, borderRadius: 8, spacing: 2, hoverOffset: 10 }] },
                options: chartOpts({
                    scales: {}, cutout: "68%", interaction: { mode: "nearest", intersect: true },
                    plugins: { legend: { position: "bottom", labels: { color: C.texto, usePointStyle: true, pointStyle: "circle", boxWidth: 8, boxHeight: 8, padding: 14, font: { size: 12 } } } }
                })
            });

            charts.trend = new Chart($("tiTrendChart"), {
                type: "line",
                data: { labels: [], datasets: [
                    { label: "MTTA", data: [], borderColor: C.roxo, backgroundColor: C.roxo, borderWidth: 3, tension: 0.35, pointRadius: 3, spanGaps: true },
                    { label: "MTTR", data: [], borderColor: C.verde, backgroundColor: C.verde, borderWidth: 3, tension: 0.35, pointRadius: 3, spanGaps: true }
                ] },
                options: chartOpts()
            });
        }

        function bucketInfo() {
            const n = st.range === 24 ? 8 : st.range === 168 ? 7 : 15;
            return { n, size: st.range / n };
        }

        function renderCharts() {
            if (!charts.time) return;
            const cur = win(0, st.range);
            const { n, size } = bucketInfo();

            const labels = [];
            const sev = [[], [], []];
            const mtta = [];
            const mttr = [];
            for (let k = 0; k < n; k++) {
                const from = (n - k - 1) * size;
                const to = (n - k) * size;
                const inB = cur.filter((i) => i.hoursAgo >= from && i.hoursAgo < to);
                const startT = new Date(NOW - to * 3600000);
                labels.push(st.range === 24
                    ? startT.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" })
                    : startT.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }));
                [1, 2, 3].forEach((s) => sev[s - 1].push(inB.filter((i) => i.sev === s).length));
                const a = avg(inB.filter((i) => i.ackMin != null).map((i) => i.ackMin));
                const r = avg(inB.filter((i) => i.status === "resolved").map((i) => i.resolveMin));
                mtta.push(a == null ? null : Math.round(a));
                mttr.push(r == null ? null : Math.round(r));
            }

            charts.time.data.labels = labels;
            sev.forEach((d, idx) => (charts.time.data.datasets[idx].data = d));
            charts.time.update();

            charts.trend.data.labels = labels;
            charts.trend.data.datasets[0].data = mtta;
            charts.trend.data.datasets[1].data = mttr;
            charts.trend.update();

            const bySvc = {};
            cur.filter((i) => i.status === "resolved").forEach((i) => (bySvc[i.service] = (bySvc[i.service] || []).concat(i.resolveMin)));
            const rows = Object.entries(bySvc).map(([k, v]) => [k, Math.round(avg(v))]).sort((a, b) => b[1] - a[1]).slice(0, 8);
            charts.service.data.labels = rows.map((r) => r[0]);
            charts.service.data.datasets[0].data = rows.map((r) => r[1]);
            charts.service.update();

            const byCause = {};
            cur.forEach((i) => (byCause[i.cause] = (byCause[i.cause] || 0) + 1));
            const causes = Object.entries(byCause).sort((a, b) => b[1] - a[1]);
            charts.cause.data.labels = causes.map((c) => c[0]);
            charts.cause.data.datasets[0].data = causes.map((c) => c[1]);
            charts.cause.update();
        }

        // ============================================================
        // TABELA
        // ============================================================
        const COLS = [
            ["ID", ""], ["Incidente", ""], ["Serviço", ""], ["Sev.", ""], ["Status", ""],
            ["Equipe", ""], ["Responsável", ""], ["Aberto em", ""], ["MTTA", "num"], ["MTTR", "num"]
        ];

        function tableRows() {
            const q = norm(st.q);
            return win(0, st.range)
                .filter((i) => st.status === "all" || i.status === st.status)
                .filter((i) => !q || norm(`${i.id} ${i.title} ${i.service} ${i.owner}`).includes(q))
                .sort((a, b) => a.hoursAgo - b.hoursAgo);
        }

        function renderTable() {
            const rows = tableRows();
            const MAX = 40;
            const table = $("tiTable");
            table.querySelector("thead").innerHTML = "<tr>" + COLS.map((c) => `<th class="${c[1]}">${c[0]}</th>`).join("") + "</tr>";
            table.querySelector("tbody").innerHTML = rows.slice(0, MAX).map((i) => `
                <tr>
                    <td>${i.id}</td>
                    <td>${esc(i.title)}</td>
                    <td>${esc(i.service)}</td>
                    <td><span class="ti-sev s${i.sev}">SEV-${i.sev}</span></td>
                    <td><span class="ti-pill ${STATUS[i.status].pill}">${STATUS[i.status].label}</span></td>
                    <td>${SV[i.service].team}</td>
                    <td>${esc(i.owner)}</td>
                    <td>${new Date(NOW - i.hoursAgo * 3600000).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}</td>
                    <td class="num">${fmtMin(i.ackMin)}</td>
                    <td class="num">${fmtMin(i.resolveMin)}</td>
                </tr>`).join("") || `<tr><td colspan="10" class="ti-empty">Nenhum incidente encontrado.</td></tr>`;

            const a = avg(rows.filter((i) => i.ackMin != null).map((i) => i.ackMin));
            const r = avg(rows.filter((i) => i.resolveMin != null).map((i) => i.resolveMin));
            table.querySelector("tfoot").innerHTML =
                `<tr><td colspan="8">Total · ${rows.length} incidente(s)</td><td class="num">${fmtMin(a)}</td><td class="num">${fmtMin(r)}</td></tr>`;

            $("tiCount").textContent = `${rows.length} incidente(s) encontrado(s)` + (rows.length > MAX ? ` · exibindo os ${MAX} mais recentes` : "") + ".";
        }

        // ============================================================
        // EXPORTAR CSV
        // ============================================================
        $("tiExport").addEventListener("click", function () {
            const rows = tableRows();
            if (!rows.length) { alert("Não há incidentes para exportar."); return; }
            const data = [["ID", "Incidente", "Serviço", "Severidade", "Status", "Equipe", "Responsável", "Aberto em", "MTTA (min)", "MTTR (min)", "Causa raiz"]]
                .concat(rows.map((i) => [
                    i.id, i.title, i.service, "SEV-" + i.sev, STATUS[i.status].label, SV[i.service].team, i.owner,
                    new Date(NOW - i.hoursAgo * 3600000).toLocaleString("pt-BR"),
                    i.ackMin == null ? "" : i.ackMin, i.resolveMin == null ? "" : i.resolveMin, i.cause
                ]));
            const csv = data.map((l) => l.map((v) => '"' + String(v).replace(/"/g, '""') + '"').join(";")).join("\r\n");
            const url = URL.createObjectURL(new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" }));
            const a = document.createElement("a");
            a.href = url; a.download = "ti-incidentes.csv";
            document.body.appendChild(a); a.click(); a.remove();
            URL.revokeObjectURL(url);
        });

        // ============================================================
        // RENDER E EVENTOS
        // ============================================================
        function renderSelection() {
            renderBoard();
            renderMap();
            renderTimeline();
        }

        function renderAll() {
            renderKpis();
            renderMetrics();
            renderOnCall();
            renderCopilot();
            renderSelection();
            renderCharts();
            renderTable();
        }

        function selectIncident(id) {
            st.sel = st.sel === id ? null : id;
            st.svc = null;
            renderSelection();
        }

        $("tiBoard").addEventListener("click", (e) => {
            const b = e.target.closest(".ti-incident");
            if (b) selectIncident(b.dataset.id);
        });

        $("tiCopilot").addEventListener("click", (e) => {
            const b = e.target.closest("button[data-id]");
            if (!b) return;
            st.sel = b.dataset.id;
            st.svc = null;
            renderSelection();
            document.querySelector(".ti-layout").scrollIntoView({ behavior: "smooth", block: "start" });
        });

        function onFilter() {
            st.range = Number($("tiRange").value);
            st.service = $("tiService").value;
            st.sev = $("tiSeverity").value;
            st.team = $("tiTeam").value;
            st.sel = null;
            st.svc = null;
            renderAll();
        }
        ["tiRange", "tiService", "tiSeverity", "tiTeam"].forEach((id) => $(id).addEventListener("change", onFilter));

        $("tiSearch").addEventListener("input", function () { st.q = this.value; renderTable(); });
        $("tiStatus").addEventListener("change", function () { st.status = this.value; renderTable(); });
        $("tiClear").addEventListener("click", function () {
            st.q = ""; st.status = "all";
            $("tiSearch").value = ""; $("tiStatus").value = "all";
            renderTable();
        });

        // Redimensiona os gráficos ao abrir a página de TI
        const menuTI = document.querySelector('.menu-item[data-page="it"]');
        if (menuTI) {
            menuTI.addEventListener("click", function () {
                setTimeout(function () { Object.values(charts).forEach((c) => c.resize()); }, 120);
            });
        }

        buildCharts();
        renderAll();
    });
})();
