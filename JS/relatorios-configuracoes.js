/* =====================================================
   DATAOPS | CENTRAL DE RELATÓRIOS + NOTIFICAÇÕES
   Arquivo único
   Recursos:
   - Cards por departamento
   - Exportação CSV
   - Contagem de registros
   - Central de notificações
   - Marcar como lida e limpar notificações
   - Preferências persistentes no localStorage
===================================================== */

document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    /* =====================================================
       1. CENTRAL DE RELATÓRIOS
    ===================================================== */

    const departmentSelect = document.getElementById("reportDepartment");
    const formatSelect = document.getElementById("reportFormat");
    const exportButton = document.getElementById("generateReport");
    const reportMessage = document.getElementById("reportMessage");

    const departments = [
        {
            id: "finance",
            name: "Financeiro",
            description: "Relatórios financeiros e registros de pagamentos.",
            icon: "bx-wallet"
        },
        {
            id: "commercial",
            name: "Comercial",
            description: "Relatórios de vendas e desempenho comercial.",
            icon: "bx-line-chart"
        },
        {
            id: "logistics",
            name: "Logística",
            description: "Relatórios de operações, entregas e estoque.",
            icon: "bx-package"
        },
        {
            id: "it",
            name: "Tecnologia da Informação",
            description: "Relatórios de tecnologia e infraestrutura.",
            icon: "bx-server"
        },
        {
            id: "all",
            name: "Relatório Geral",
            description: "Exportação de registros de todos os departamentos.",
            icon: "bx-data"
        }
    ];

    const departmentAliases = {
        finance: ["finance", "financeiro", "financas", "finanças"],
        commercial: ["commercial", "comercial", "vendas"],
        logistics: ["logistics", "logistica", "logística"],
        it: ["it", "ti", "tecnologia", "tecnologia da informação"]
    };

    function showReportMessage(text, isError = false) {
        if (!reportMessage) return;

        reportMessage.textContent = text;
        reportMessage.classList.toggle("error", isError);
        reportMessage.classList.toggle("success", !isError);

        reportMessage.style.color = isError ? "#ff6b6b" : "#39d98a";
    }

    function normalizeDepartment(value) {
        return String(value ?? "")
            .trim()
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");
    }

    function rowMatchesDepartment(row, departmentId) {
        if (departmentId === "all") return true;

        const rawValue =
            row.dataset.setor ??
            row.dataset.department ??
            row.dataset.departamento ??
            row.getAttribute("data-setor") ??
            "";

        const normalizedValue = normalizeDepartment(rawValue);
        const aliases = departmentAliases[departmentId] || [departmentId];

        return aliases.some(alias =>
            normalizeDepartment(alias) === normalizedValue
        );
    }

    function getDepartmentRows(departmentId, showError = true) {
        const tableBody = document.getElementById("dataTableBody");

        if (!tableBody) {
            if (showError) {
                showReportMessage(
                    "A tabela da Central de Dados não foi encontrada.",
                    true
                );
            }

            return null;
        }

        const rows = Array.from(tableBody.querySelectorAll("tr"));

        // Ignora linhas de tabela que não tenham células de dados.
        const dataRows = rows.filter(row => row.querySelectorAll("td").length > 0);

        return dataRows.filter(row =>
            rowMatchesDepartment(row, departmentId)
        );
    }

    function escapeCSV(value) {
        return `"${String(value ?? "").replace(/"/g, '""')}"`;
    }

    function downloadCSV(filename, rows) {
        const csv = "\uFEFF" + rows
            .map(row => row.map(escapeCSV).join(";"))
            .join("\r\n");

        const blob = new Blob([csv], {
            type: "text/csv;charset=utf-8;"
        });

        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");

        link.href = url;
        link.download = filename;
        link.style.display = "none";

        document.body.appendChild(link);
        link.click();
        link.remove();

        window.setTimeout(() => {
            URL.revokeObjectURL(url);
        }, 1000);
    }

    function exportDepartment(departmentId) {
        const format = formatSelect?.value || "csv";

        if (format !== "csv") {
            showReportMessage("Formato não suportado.", true);
            return;
        }

        const department = departments.find(item => item.id === departmentId);

        if (!department) {
            showReportMessage("Departamento inválido.", true);
            return;
        }

        const filteredRows = getDepartmentRows(departmentId);

        if (filteredRows === null) return;

        const csvRows = [
            ["ID", "Registro", "Categoria", "Status"]
        ];

        filteredRows.forEach(row => {
            const cells = Array.from(row.querySelectorAll("td"));

            if (cells.length < 4) return;

            csvRows.push(
                cells.slice(0, 4).map(cell => cell.innerText.trim())
            );
        });

        if (csvRows.length === 1) {
            showReportMessage(
                `Não existem registros para ${department.name}.`,
                true
            );
            return;
        }

        const date = new Date().toLocaleDateString("sv-SE");

        const departmentSlug = {
            finance: "financeiro",
            commercial: "comercial",
            logistics: "logistica",
            it: "ti",
            all: "todos-departamentos"
        }[departmentId];

        const filename =
            `dataops-relatorio-${departmentSlug}-${date}.csv`;

        downloadCSV(filename, csvRows);

        showReportMessage(
            `${department.name}: ${csvRows.length - 1} registro(s) exportado(s).`
        );

        // Integração opcional com a central de notificações.
        window.DataOpsNotifications?.add({
            category: "reports",
            title: "Relatório exportado",
            message: `${department.name}: ${csvRows.length - 1} registro(s) exportado(s).`,
            icon: "bx-download"
        });
    }

    function updateDepartmentCounts() {
        departments.forEach(department => {
            const card = document.querySelector(
                `.department-report-card[data-department="${department.id}"]`
            );

            if (!card) return;

            const countElement = card.querySelector(
                ".department-report-count"
            );

            if (!countElement) return;

            const rows = getDepartmentRows(department.id, false);

            if (rows === null) {
                countElement.textContent = "Tabela indisponível";
                return;
            }

            countElement.textContent =
                `${rows.length} registro(s) disponível(is)`;
        });
    }

    function hideOldReportControls() {
        [departmentSelect, formatSelect, exportButton].forEach(element => {
            if (!element) return;

            const wrapper = element.closest(
                ".form-group, .form-control-group"
            );

            if (wrapper) {
                wrapper.hidden = true;
            } else {
                element.hidden = true;
            }
        });
    }

    function createDepartmentCards() {
        const reportSection = document.getElementById("reports");

        if (!reportSection) {
            console.warn("DataOps: seção de relatórios não encontrada.");
            return;
        }

        // Evita criar cards duplicados.
        document.getElementById("departmentReportCards")?.remove();

        const cardsContainer = document.createElement("div");

        cardsContainer.id = "departmentReportCards";
        cardsContainer.className = "department-report-grid";

        departments.forEach(department => {
            const card = document.createElement("article");

            card.className = "department-report-card";
            card.dataset.department = department.id;

            const iconWrapper = document.createElement("div");
            iconWrapper.className = "department-report-icon";

            const icon = document.createElement("i");
            icon.className = `bx ${department.icon}`;
            icon.setAttribute("aria-hidden", "true");

            iconWrapper.appendChild(icon);

            const title = document.createElement("h3");
            title.textContent = department.name;

            const description = document.createElement("p");
            description.textContent = department.description;

            const count = document.createElement("span");
            count.className = "department-report-count";
            count.textContent = "Carregando registros...";

            const button = document.createElement("button");
            button.type = "button";
            button.className = "department-report-button";
            button.innerHTML =
                '<i class="bx bx-download" aria-hidden="true"></i> Exportar CSV';

            button.setAttribute(
                "aria-label",
                `Exportar relatório CSV: ${department.name}`
            );

            button.addEventListener("click", () => {
                exportDepartment(department.id);
            });

            card.append(
                iconWrapper,
                title,
                description,
                count,
                button
            );

            cardsContainer.appendChild(card);
        });

        /*
         * Coloca os cards antes do painel antigo, se existir.
         * Se o painel estiver dentro de outro elemento, usa o
         * pai real dele para evitar erros de inserção.
         */
        const existingPanel = reportSection.querySelector(".panel");

        if (existingPanel?.parentNode) {
            existingPanel.parentNode.insertBefore(
                cardsContainer,
                existingPanel
            );
        } else {
            reportSection.appendChild(cardsContainer);
        }

        hideOldReportControls();
        updateDepartmentCounts();
    }

    if (departmentSelect && exportButton) {
        exportButton.addEventListener("click", () => {
            exportDepartment(departmentSelect.value || "all");
        });

        createDepartmentCards();

        /*
         * Atualiza as contagens quando os registros da tabela
         * forem alterados por outros scripts.
         */
        const tableBody = document.getElementById("dataTableBody");

        if (tableBody && "MutationObserver" in window) {
            const tableObserver = new MutationObserver(() => {
                updateDepartmentCounts();
            });

            tableObserver.observe(tableBody, {
                childList: true,
                subtree: true,
                characterData: true,
                attributes: true
            });
        }

        console.log("DataOps: Central de Relatórios inicializada.");
    } else {
        console.warn(
            "DataOps: controles de relatórios não encontrados. A central de relatórios não foi inicializada."
        );
    }

    /* =====================================================
       2. CENTRAL DE NOTIFICAÇÕES
    ===================================================== */

    const notificationButton = document.getElementById("notificationButton");
    const notificationPanel = document.getElementById("notificationPanel");
    const notificationClose = document.getElementById("notificationClose");
    const notificationCount = document.getElementById("notificationCount");
    const notificationSummary = document.getElementById("notificationSummary");
    const notificationList = document.getElementById("notificationList");
    const markAllButton = document.getElementById("markAllNotificationsRead");
    const clearButton = document.getElementById("clearNotifications");

    const NOTIFICATIONS_KEY = "dataops_notifications_v1";
    const PREFERENCES_KEY = "dataops_notification_preferences_v1";

    // Todas as categorias que existem na tela de Configurações.
    const defaultPreferences = {
        reports: true,
        alerts: true,
        data: true,
        email: false
    };

    function loadPreferences() {
        try {
            const saved = localStorage.getItem(PREFERENCES_KEY);
            const parsed = saved ? JSON.parse(saved) : {};

            return {
                ...defaultPreferences,
                ...(parsed && typeof parsed === "object" && !Array.isArray(parsed)
                    ? parsed
                    : {})
            };
        } catch (error) {
            console.error("Erro ao carregar preferências:", error);
            return { ...defaultPreferences };
        }
    }

    let notificationPreferences = loadPreferences();

    function savePreferences() {
        try {
            localStorage.setItem(
                PREFERENCES_KEY,
                JSON.stringify(notificationPreferences)
            );
        } catch (error) {
            console.error("Erro ao salvar preferências:", error);
        }
    }

    function loadNotifications() {
        try {
            const saved = localStorage.getItem(NOTIFICATIONS_KEY);

            if (saved !== null) {
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (error) {
            console.error("Erro ao carregar notificações:", error);
        }

        return [
            {
                id: "demo-1",
                category: "alerts",
                icon: "bx-wallet",
                title: "Financeiro",
                message: "Exemplo de notificação do departamento financeiro.",
                createdAt: Date.now() - 5 * 60000,
                read: false
            },
            {
                id: "demo-2",
                category: "alerts",
                icon: "bx-package",
                title: "Logística",
                message: "Exemplo de notificação do departamento de logística.",
                createdAt: Date.now() - 30 * 60000,
                read: false
            },
            {
                id: "demo-3",
                category: "alerts",
                icon: "bx-server",
                title: "Tecnologia da Informação",
                message: "Exemplo de notificação da área de TI.",
                createdAt: Date.now() - 2 * 60 * 60000,
                read: true
            }
        ];
    }

    let notifications = loadNotifications();

    function saveNotifications() {
        try {
            localStorage.setItem(
                NOTIFICATIONS_KEY,
                JSON.stringify(notifications)
            );
        } catch (error) {
            console.error("Erro ao salvar notificações:", error);
        }
    }

    function isNotificationEnabled(category) {
        return notificationPreferences[category] !== false;
    }

    function getVisibleNotifications() {
        return notifications.filter(notification =>
            isNotificationEnabled(notification.category)
        );
    }

    function formatNotificationTime(timestamp) {
        const date = Number(timestamp) || Date.now();
        const minutes = Math.floor(
            Math.max(0, Date.now() - date) / 60000
        );

        if (minutes < 1) return "Agora mesmo";
        if (minutes < 60) return `Há ${minutes} min`;

        const hours = Math.floor(minutes / 60);

        if (hours < 24) return `Há ${hours} h`;

        const days = Math.floor(hours / 24);

        if (days < 7) {
            return `Há ${days} dia${days === 1 ? "" : "s"}`;
        }

        return new Date(date).toLocaleDateString("pt-BR");
    }

    function createNotificationElement(tag, className = "", text = "") {
        const element = document.createElement(tag);

        if (className) element.className = className;
        if (text) element.textContent = text;

        return element;
    }

    function renderNotifications() {
        if (
            !notificationButton ||
            !notificationPanel ||
            !notificationCount ||
            !notificationSummary ||
            !notificationList
        ) {
            return;
        }

        const visible = getVisibleNotifications();
        const unread = visible.filter(item => !item.read).length;

        notificationCount.textContent = unread > 99 ? "99+" : String(unread);
        notificationCount.hidden = unread === 0;

        notificationSummary.textContent = unread === 0
            ? "Você está em dia com as notificações."
            : `Você tem ${unread} notificação(ões) não lida(s).`;

        notificationList.replaceChildren();

        if (visible.length === 0) {
            const empty = createNotificationElement("div", "notification-empty");

            const icon = createNotificationElement("i", "bx bx-check-circle");
            icon.setAttribute("aria-hidden", "true");

            const title = createNotificationElement("h3", "", "Tudo em dia!");

            const description = createNotificationElement(
                "p",
                "",
                "Nenhuma notificação disponível."
            );

            empty.append(icon, title, description);
            notificationList.appendChild(empty);
            return;
        }

        visible.forEach(notification => {
            const item = createNotificationElement(
                "article",
                `notification-item${notification.read ? "" : " unread"}`
            );

            item.tabIndex = 0;
            item.setAttribute("role", "button");
            item.setAttribute(
                "aria-label",
                `${notification.title || "Notificação"}. ${
                    notification.read ? "Lida" : "Não lida"
                }. Marcar como lida.`
            );

            const iconBox = createNotificationElement("div", "notification-icon");

            const icon = createNotificationElement(
                "i",
                `bx ${notification.icon || "bx-bell"}`
            );

            icon.setAttribute("aria-hidden", "true");
            iconBox.appendChild(icon);

            const content = createNotificationElement("div", "notification-content");

            const title = createNotificationElement(
                "h3",
                "",
                notification.title || "Notificação"
            );

            const description = createNotificationElement(
                "p",
                "",
                notification.message || ""
            );

            const time = createNotificationElement(
                "span",
                "notification-time",
                formatNotificationTime(notification.createdAt)
            );

            content.append(title, description, time);
            item.append(iconBox, content);

            function markAsRead() {
                const current = notifications.find(entry =>
                    entry.id === notification.id
                );

                if (!current || current.read) return;

                current.read = true;
                saveNotifications();
                renderNotifications();
            }

            item.addEventListener("click", markAsRead);

            item.addEventListener("keydown", event => {
                if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    markAsRead();
                }
            });

            notificationList.appendChild(item);
        });
    }

function positionNotificationPanel() {
    if (!notificationPanel || !notificationButton) return;

    const rect = notificationButton.getBoundingClientRect();

    notificationPanel.style.top = `${Math.round(rect.bottom + 12)}px`;
    notificationPanel.style.right =
        `${Math.max(12, Math.round(window.innerWidth - rect.right))}px`;
}

function openNotificationPanel() {
    if (!notificationPanel || !notificationButton) return;

    notificationPanel.hidden = false;
    notificationPanel.classList.add("active");
    notificationButton.setAttribute("aria-expanded", "true");

    positionNotificationPanel();
    renderNotifications();
}

window.addEventListener("resize", () => {
    if (notificationPanel && !notificationPanel.hidden) {
        positionNotificationPanel();
    }
});

    function closeNotificationPanel() {
        if (!notificationPanel || !notificationButton) return;

        notificationPanel.hidden = true;
        notificationPanel.classList.remove("active");
        notificationButton.setAttribute("aria-expanded", "false");
    }

    /* ---------- Inicialização do painel ---------- */
    document.body.appendChild(notificationPanel);

    if (
        notificationButton &&
        notificationPanel &&
        notificationCount &&
        notificationSummary &&
        notificationList
    ) {
        notificationPanel.hidden = true;
        notificationButton.setAttribute("aria-expanded", "false");

        notificationButton.addEventListener("click", event => {
            event.preventDefault();
            event.stopPropagation();

            if (notificationPanel.hidden) {
                openNotificationPanel();
            } else {
                closeNotificationPanel();
            }
        });

        if (notificationClose) {
            notificationClose.addEventListener("click", event => {
                event.preventDefault();
                event.stopPropagation();
                closeNotificationPanel();
            });
        }

        document.addEventListener("click", event => {
            if (
                !notificationPanel.hidden &&
                !notificationPanel.contains(event.target) &&
                !notificationButton.contains(event.target)
            ) {
                closeNotificationPanel();
            }
        });

        document.addEventListener("keydown", event => {
            if (event.key === "Escape" && !notificationPanel.hidden) {
                closeNotificationPanel();
                notificationButton.focus();
            }
        });

        if (markAllButton) {
            markAllButton.addEventListener("click", event => {
                event.stopPropagation();

                const visibleIds = new Set(
                    getVisibleNotifications().map(item => item.id)
                );

                notifications.forEach(item => {
                    if (visibleIds.has(item.id)) item.read = true;
                });

                saveNotifications();
                renderNotifications();
            });
        }

        if (clearButton) {
            clearButton.addEventListener("click", event => {
                event.stopPropagation();

                const visible = getVisibleNotifications();

                if (visible.length === 0) return;

                if (!window.confirm("Deseja limpar as notificações exibidas?")) {
                    return;
                }

                const visibleIds = new Set(visible.map(item => item.id));

                notifications = notifications.filter(
                    item => !visibleIds.has(item.id)
                );

                saveNotifications();
                renderNotifications();
            });
        }

        console.log("DataOps: Central de Notificações inicializada.");
    } else {
        console.error("DataOps: elementos essenciais ausentes:", {
            notificationButton: !!notificationButton,
            notificationPanel: !!notificationPanel,
            notificationCount: !!notificationCount,
            notificationSummary: !!notificationSummary,
            notificationList: !!notificationList
        });
    }

    /* ---------- Preferências (checkboxes com data-notif) ---------- */

    document.querySelectorAll("[data-notif]").forEach(checkbox => {
        const category = checkbox.dataset.notif;

        if (!Object.prototype.hasOwnProperty.call(defaultPreferences, category)) {
            console.warn(
                `DataOps: categoria de notificação desconhecida: "${category}".`
            );
            return;
        }

        checkbox.checked = notificationPreferences[category] !== false;

        checkbox.addEventListener("change", () => {
            notificationPreferences[category] = checkbox.checked;

            savePreferences();
            renderNotifications();
        });
    });

    /* ---------- API global para outros scripts ---------- */

    window.DataOpsNotifications = {
        add({
            category = "alerts",
            title,
            message,
            icon = "bx-bell"
        } = {}) {
            if (!title || !message) {
                console.error(
                    "DataOps: informe o título e a mensagem da notificação."
                );
                return null;
            }

            const notification = {
                id: `notification-${Date.now()}-${Math.random()
                    .toString(36)
                    .slice(2, 8)}`,
                category,
                title,
                message,
                icon,
                createdAt: Date.now(),
                read: false
            };

            notifications.unshift(notification);

            saveNotifications();
            renderNotifications();

            return notification.id;
        },

        refresh() {
            notificationPreferences = loadPreferences();

            document.querySelectorAll("[data-notif]").forEach(checkbox => {
                const category = checkbox.dataset.notif;

                if (Object.prototype.hasOwnProperty.call(defaultPreferences, category)) {
                    checkbox.checked = notificationPreferences[category] !== false;
                }
            });

            renderNotifications();
        },

        markAllAsRead() {
            notifications.forEach(item => {
                if (isNotificationEnabled(item.category)) {
                    item.read = true;
                }
            });

            saveNotifications();
            renderNotifications();
        },

        getAll() {
            return notifications.map(item => ({ ...item }));
        }
    };

    renderNotifications();

});

/* =====================================================
   DATAOPS | CONFIGURAÇÕES
   Perfil, aparência, sistema, restaurar e informações
===================================================== */
document.addEventListener("DOMContentLoaded", () => {
    "use strict";

    if (!document.getElementById("settings")) return;

    const PREFS_KEY = "dataops_prefs";
    const PROFILE_KEY = "dataops_profile";
    const NOTIF_PREFS_KEY = "dataops_notification_preferences_v1";
    const NOTIFS_KEY = "dataops_notifications_v1";
    const DATA_KEY = "dataops_registros_importados";

    const defaultPrefs = {
        theme: "dark",
        reduceMotion: false,
        autoRefresh: false,
        defaultPeriod: "week",
        defaultFormat: "csv"
    };

    const deptNames = {
        finance: "Financeiro",
        commercial: "Comercial",
        logistics: "Logística",
        it: "TI",
        other: "Outro"
    };

    const $ = id => document.getElementById(id);
    const root = document.documentElement;

    /* ---------- Armazenamento ---------- */

    function readJSON(key, fallback) {
        try {
            const raw = localStorage.getItem(key);
            if (raw === null) return fallback;
            const parsed = JSON.parse(raw);
            return parsed ?? fallback;
        } catch (e) {
            return fallback;
        }
    }

    function writeJSON(key, value) {
        try {
            localStorage.setItem(key, JSON.stringify(value));
            return true;
        } catch (e) {
            return false;
        }
    }

    let prefs = { ...defaultPrefs, ...readJSON(PREFS_KEY, {}) };
    let profile = { name: "", email: "", role: "", dept: "", ...readJSON(PROFILE_KEY, {}) };

    function savePrefs() {
        if (!writeJSON(PREFS_KEY, prefs)) {
            showMessage("Não foi possível salvar as preferências neste navegador.", true);
        }
    }

    /* ---------- Mensagem de status ---------- */

    const messageEl = $("settingsMessage");
    let messageTimer = null;

    function showMessage(text, isError = false) {
        if (!messageEl) return;

        clearTimeout(messageTimer);
        messageEl.textContent = text;
        messageEl.classList.toggle("error", isError);
        messageEl.classList.toggle("success", !isError);

        messageTimer = setTimeout(() => {
            messageEl.textContent = "";
            messageEl.classList.remove("error", "success");
        }, 4000);
    }

    /* ---------- Gráficos (Chart.js) ---------- */

    function getCharts() {
        return (typeof Chart !== "undefined" && Chart.instances)
            ? Object.values(Chart.instances)
            : [];
    }

    /* ---------- Tema ---------- */

    const systemLight = window.matchMedia("(prefers-color-scheme: light)");

    function resolveTheme() {
        if (prefs.theme === "auto") return systemLight.matches ? "light" : "dark";
        return prefs.theme === "light" ? "light" : "dark";
    }

    function applyTheme() {
        const theme = resolveTheme();
        root.setAttribute("data-theme", theme);

        const ring = theme === "light" ? "#ffffff" : "#111a2a";

        getCharts().forEach(chart => {
            const type = chart.config.type;

            chart.config.data.datasets.forEach(dataset => {
                if (type === "doughnut") dataset.borderColor = ring;
                if (type === "line") dataset.pointBorderColor = ring;
            });

            chart.update("none");
        });
    }

    if (systemLight.addEventListener) {
        systemLight.addEventListener("change", () => {
            if (prefs.theme === "auto") applyTheme();
        });
    }

    /* ---------- Reduzir animações ---------- */

    function applyMotion() {
        const animation = prefs.reduceMotion
            ? false
            : { duration: 650, easing: "easeOutQuart" };

        root.classList.toggle("reduce-motion", prefs.reduceMotion);

        if (typeof Chart !== "undefined") Chart.defaults.animation = animation;

        getCharts().forEach(chart => {
            chart.options.animation = animation;
        });
    }

    /* ---------- Período e formato padrão ---------- */

    function applyDefaultPeriod() {
        const filter = $("periodFilter");

        if (filter && filter.value !== prefs.defaultPeriod) {
            filter.value = prefs.defaultPeriod;
            filter.dispatchEvent(new Event("change", { bubbles: true }));
        }
    }

    function applyDefaultFormat() {
        const select = $("reportFormat");
        if (!select) return;

        const available = Array.from(select.options).some(
            option => option.value === prefs.defaultFormat && !option.disabled
        );

        if (available) select.value = prefs.defaultFormat;
    }

    /* ---------- Atualização automática (60 s) ---------- */

    let refreshTimer = null;

    function markUpdated() {
        const badge = document.querySelector(".status-badge");
        if (!badge) return;

        let stamp = document.getElementById("lastUpdate");

        if (!stamp) {
            stamp = document.createElement("span");
            stamp.id = "lastUpdate";
            stamp.className = "last-update";
            badge.insertAdjacentElement("afterend", stamp);
        }

        if (!prefs.autoRefresh) {
            stamp.hidden = true;
            return;
        }

        stamp.hidden = false;
        stamp.textContent = "Atualizado às " + new Date().toLocaleTimeString("pt-BR");
        stamp.classList.remove("flash");
        void stamp.offsetWidth;
        stamp.classList.add("flash");
    }

    function refreshDashboard() {
        $("periodFilter")?.dispatchEvent(new Event("change", { bubbles: true }));

        getCharts().forEach(chart => {
            if (!prefs.reduceMotion) chart.reset();
            chart.update();
        });

        const cards = document.querySelectorAll("#overview .stat-card");
        cards.forEach(card => card.classList.remove("refresh-pulse"));
        void document.body.offsetWidth;
        cards.forEach(card => card.classList.add("refresh-pulse"));

        markUpdated();
    }

    function applyAutoRefresh() {
        clearInterval(refreshTimer);
        refreshTimer = null;

        markUpdated();

        if (!prefs.autoRefresh) return;

        refreshTimer = setInterval(() => {
            if (!document.hidden) refreshDashboard();
        }, 60000);
    }

    /* ---------- Alertas do sistema (preferência de notificação) ---------- */

    function applyAlertsVisibility() {
        const saved = readJSON(NOTIF_PREFS_KEY, {});
        const enabled = !saved || saved.alerts !== false;

        root.classList.toggle("hide-smart-alerts", !enabled);
    }

    document.querySelectorAll('[data-notif="alerts"]').forEach(checkbox => {
        checkbox.addEventListener("change", applyAlertsVisibility);
    });

    /* ---------- Aviso de "Atualizações de dados" ---------- */

    const dataBody = $("dataTableBody");

    if (dataBody && "MutationObserver" in window) {
        let added = 0;
        let timer = null;

        new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (
                        node.nodeType === 1 &&
                        node.tagName === "TR" &&
                        node.dataset.importado === "true"
                    ) {
                        added++;
                    }
                });
            });

            if (!added) return;

            clearTimeout(timer);

            timer = setTimeout(() => {
                window.DataOpsNotifications?.add({
                    category: "data",
                    title: "Central de Dados atualizada",
                    message: `${added} novo(s) registro(s) importado(s).`,
                    icon: "bx-data"
                });

                added = 0;
            }, 400);
        }).observe(dataBody, { childList: true });
    }

    /* ---------- Perfil ---------- */

    const fields = {
        name: $("profileName"),
        email: $("profileEmail"),
        role: $("profileRole"),
        dept: $("profileDept")
    };

    const editBtn = $("profileEdit");
    const saveBtn = $("profileSave");
    const cancelBtn = $("profileCancel");
    const profileForm = $("profileForm");

    function getInitials(name) {
        const parts = String(name || "").trim().split(/\s+/).filter(Boolean);

        if (!parts.length) return "U";

        const first = parts[0][0];
        const last = parts.length > 1 ? parts[parts.length - 1][0] : "";

        return (first + last).toUpperCase();
    }

    function renderProfile() {
        const initials = getInitials(profile.name);
        const roleText = [profile.role, deptNames[profile.dept]]
            .filter(Boolean)
            .join(" · ");

        if ($("profileAvatar")) $("profileAvatar").textContent = initials;
        if ($("profileDisplayName")) $("profileDisplayName").textContent = profile.name || "Usuário";
        if ($("profileDisplayRole")) $("profileDisplayRole").textContent = roleText || "Cargo não informado";

        // Menu lateral
        const sidebarAvatar = document.querySelector(".sidebar .user-avatar");
        const sidebarName = $("userName");
        const sidebarRole = document.querySelector(".sidebar .user-info span");

        if (sidebarAvatar) sidebarAvatar.textContent = initials;
        if (sidebarName) sidebarName.textContent = profile.name || "Usuário";
        if (sidebarRole) sidebarRole.textContent = profile.role || "DataOps";
    }

    function fillProfileForm() {
        if (!fields.name) return;

        fields.name.value = profile.name || "";
        fields.email.value = profile.email || "";
        fields.role.value = profile.role || "";
        fields.dept.value = profile.dept || "";
    }

    function setEditing(editing) {
        Object.values(fields).forEach(field => {
            if (field) field.disabled = !editing;
        });

        if (editBtn) editBtn.hidden = editing;
        if (saveBtn) saveBtn.hidden = !editing;
        if (cancelBtn) cancelBtn.hidden = !editing;

        if (editing && fields.name) fields.name.focus();
    }

    if (profileForm && fields.name) {
        editBtn?.addEventListener("click", () => setEditing(true));

        cancelBtn?.addEventListener("click", () => {
            fillProfileForm();
            setEditing(false);
        });

        profileForm.addEventListener("submit", event => {
            event.preventDefault();

            const name = fields.name.value.trim().replace(/\s+/g, " ");
            const email = fields.email.value.trim();
            const role = fields.role.value.trim().replace(/\s+/g, " ");
            const dept = fields.dept.value;

            if (!name) {
                showMessage("Informe o nome completo.", true);
                fields.name.focus();
                return;
            }

            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) {
                showMessage("Informe um e-mail válido.", true);
                fields.email.focus();
                return;
            }

            const next = { name, email, role, dept };

            if (!writeJSON(PROFILE_KEY, next)) {
                showMessage("Não foi possível salvar o perfil neste navegador.", true);
                return;
            }

            profile = next;
            renderProfile();
            fillProfileForm();
            setEditing(false);
            showMessage("Perfil salvo neste navegador.");
        });
    }

    /* ---------- Controles de preferências ---------- */

    const autoRefreshInput = $("autoRefresh");
    const reduceMotionInput = $("reduceMotion");
    const periodSelect = $("defaultPeriod");
    const formatSelect = $("defaultFormat");
    const themeRadios = document.querySelectorAll('input[name="theme"]');

    function syncControls() {
        themeRadios.forEach(radio => {
            radio.checked = radio.value === prefs.theme;
        });

        if (autoRefreshInput) autoRefreshInput.checked = !!prefs.autoRefresh;
        if (reduceMotionInput) reduceMotionInput.checked = !!prefs.reduceMotion;
        if (periodSelect) periodSelect.value = prefs.defaultPeriod;
        if (formatSelect) formatSelect.value = prefs.defaultFormat;
    }

    themeRadios.forEach(radio => {
        radio.addEventListener("change", () => {
            if (!radio.checked) return;

            prefs.theme = radio.value;
            savePrefs();
            applyTheme();

            const names = { light: "Claro", dark: "Escuro", auto: "Automático" };
            showMessage(`Tema ${names[prefs.theme]} aplicado.`);
        });
    });

    autoRefreshInput?.addEventListener("change", () => {
        prefs.autoRefresh = autoRefreshInput.checked;
        savePrefs();
        applyAutoRefresh();

        if (prefs.autoRefresh) {
            refreshDashboard();
            showMessage("Atualização automática ativada. Veja o horário ao lado de \"Sistema ativo\" no topo.");
        } else {
            showMessage("Atualização automática desativada.");
        }
    });

    reduceMotionInput?.addEventListener("change", () => {
        prefs.reduceMotion = reduceMotionInput.checked;
        savePrefs();
        applyMotion();

        if (prefs.reduceMotion) {
            showMessage("Animações reduzidas: transições e gráficos passam a aparecer sem movimento.");
        } else {
            getCharts().forEach(chart => {
                chart.reset();
                chart.update();
            });
            showMessage("Animações restauradas. Os gráficos voltam a animar ao abrir cada tela.");
        }
    });

    periodSelect?.addEventListener("change", () => {
        prefs.defaultPeriod = periodSelect.value;
        savePrefs();
        applyDefaultPeriod();

        const names = { week: "Últimos 7 dias", month: "Últimos 30 dias", year: "Últimos 12 meses" };
        const hasImported = document.querySelector('#dataTableBody tr[data-importado="true"]');

        showMessage(
            hasImported
                ? `Período salvo: ${names[prefs.defaultPeriod]}. Como há registros importados, os gráficos da Visão geral agrupam por categoria e ignoram o período.`
                : `Período padrão: ${names[prefs.defaultPeriod]}. Já aplicado na Visão geral e em Análises.`
        );
    });

    formatSelect?.addEventListener("change", () => {
        prefs.defaultFormat = formatSelect.value;
        savePrefs();
        applyDefaultFormat();
        showMessage("Formato padrão de exportação atualizado.");
    });

    /* ---------- Restaurar preferências ---------- */

    $("restoreSettings")?.addEventListener("click", () => {
        const confirmed = window.confirm(
            "Restaurar as preferências desta tela?\n\nPerfil e registros da Central de Dados não serão afetados."
        );

        if (!confirmed) return;

        prefs = { ...defaultPrefs };
        savePrefs();

        try {
            localStorage.removeItem(NOTIF_PREFS_KEY);
        } catch (e) { /* sem localStorage */ }

        window.DataOpsNotifications?.refresh();

        syncControls();
        applyTheme();
        applyMotion();
        applyDefaultPeriod();
        applyDefaultFormat();
        applyAutoRefresh();
        applyAlertsVisibility();

        showMessage("Preferências restauradas para o padrão.");
    });

    /* ---------- Informações do sistema ---------- */

    function getBrowserName() {
        const ua = navigator.userAgent;

        if (/Edg\//.test(ua)) return "Microsoft Edge";
        if (/OPR\//.test(ua)) return "Opera";
        if (/Firefox\//.test(ua)) return "Firefox";
        if (/Chrome\//.test(ua)) return "Google Chrome";
        if (/Safari\//.test(ua)) return "Safari";

        return "Não identificado";
    }

    function getStorageKB() {
        let chars = 0;

        try {
            for (let i = 0; i < localStorage.length; i++) {
                const key = localStorage.key(i);

                if (key && key.startsWith("dataops")) {
                    chars += key.length + (localStorage.getItem(key) || "").length;
                }
            }
        } catch (e) { /* sem localStorage */ }

        return ((chars * 2) / 1024).toFixed(1).replace(".", ",");
    }

    function buildSystemInfo() {
        const list = $("systemInfo");
        if (!list) return;

        const records = readJSON(DATA_KEY, []);
        const notifications = readJSON(NOTIFS_KEY, []);
        const themeNames = { light: "Claro", dark: "Escuro" };

        const rows = [
            ["Versão", "DataOps · painel demonstrativo"],
            ["Tema ativo", themeNames[resolveTheme()] + (prefs.theme === "auto" ? " (automático)" : "")],
            ["Idioma", "Português (Brasil)"],
            ["Registros importados", String(Array.isArray(records) ? records.length : 0)],
            ["Notificações salvas", String(Array.isArray(notifications) ? notifications.length : 0)],
            ["Armazenamento local usado", getStorageKB() + " KB"],
            ["Atualização automática", prefs.autoRefresh ? "Ativada (60 s)" : "Desativada"],
            ["Navegador", getBrowserName()],
            ["Servidor", "Nenhum · dados só neste navegador"]
        ];

        list.replaceChildren();

        rows.forEach(([label, value]) => {
            const row = document.createElement("div");
            const dt = document.createElement("dt");
            const dd = document.createElement("dd");

            dt.textContent = label;
            dd.textContent = value;

            row.append(dt, dd);
            list.appendChild(row);
        });
    }

    const infoToggle = $("systemInfoToggle");
    const infoList = $("systemInfo");

    infoToggle?.addEventListener("click", () => {
        if (!infoList) return;

        const opening = infoList.hidden;

        if (opening) buildSystemInfo();

        infoList.hidden = !opening;
        infoToggle.setAttribute("aria-expanded", String(opening));

        const label = Array.from(infoToggle.childNodes)
            .reverse()
            .find(node => node.nodeType === Node.TEXT_NODE);

        if (label) {
            label.textContent = opening
                ? " Ocultar informações do sistema"
                : " Ver informações do sistema";
        }
    });

    /* ---------- Mensagens dos toggles de notificação ---------- */

    const notifMessages = {
        reports: ["Avisos de relatórios ativados: você será avisado ao exportar.", "Avisos de relatórios desativados."],
        alerts: ["Alertas do sistema ativados: voltam a aparecer na Visão geral e na central.", "Alertas do sistema desativados: sumiram da Visão geral e da central de notificações."],
        data: ["Avisos de dados ativados: você será avisado ao importar registros.", "Avisos de dados desativados."],
        email: ["Preferência de e-mail salva neste navegador (o envio ainda não existe).", "Preferência de e-mail desativada."]
    };

    document.querySelectorAll("[data-notif]").forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            const pair = notifMessages[checkbox.dataset.notif];
            if (pair) showMessage(pair[checkbox.checked ? 0 : 1]);
        });
    });

    /* ---------- Inicialização ---------- */

    syncControls();
    renderProfile();
    fillProfileForm();
    setEditing(false);

    applyTheme();
    applyMotion();
    applyDefaultPeriod();
    applyDefaultFormat();
    applyAutoRefresh();
    applyAlertsVisibility();
});