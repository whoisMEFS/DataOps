/* ==========================================
   DATAOPS | CENTRAL DE NOTIFICAÇÕES
========================================== */

(() => {
    "use strict";

    const button = document.getElementById("notificationButton");
    const panel = document.getElementById("notificationPanel");
    const closeButton = document.getElementById("notificationClose");
    const count = document.getElementById("notificationCount");
    const summary = document.getElementById("notificationSummary");
    const list = document.getElementById("notificationList");
    const markAllButton = document.getElementById("markAllNotificationsRead");
    const clearButton = document.getElementById("clearNotifications");

    if (
        !button ||
        !panel ||
        !closeButton ||
        !count ||
        !summary ||
        !list ||
        !markAllButton ||
        !clearButton
    ) {
        console.error(
            "DataOps: não foi possível encontrar todos os elementos das notificações."
        );
        return;
    }

    const STORAGE_KEY = "dataops_notifications_v1";
    const SETTINGS_KEY = "dataops_notification_preferences_v1";

    // Notificações demonstrativas, não são dados reais do sistema.
    const initialNotifications = [
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

    function loadNotifications() {
        try {
            const saved = localStorage.getItem(STORAGE_KEY);

            if (saved !== null) {
                const parsed = JSON.parse(saved);
                return Array.isArray(parsed) ? parsed : [];
            }
        } catch (error) {
            console.error("Erro ao carregar notificações:", error);
        }

        return initialNotifications.map(item => ({ ...item }));
    }

    let notifications = loadNotifications();

    function loadPreferences() {
        const defaults = {
            reports: true,
            alerts: true,
            data: true
        };

        try {
            const saved = JSON.parse(
                localStorage.getItem(SETTINGS_KEY) || "{}"
            );

            return { ...defaults, ...saved };
        } catch {
            return defaults;
        }
    }

    function isEnabled(category) {
        const preferences = loadPreferences();

        const checkbox = document.querySelector(
            `[data-notif="${category}"]`
        );

        if (checkbox) {
            return checkbox.checked;
        }

        return preferences[category] !== false;
    }

    function getVisibleNotifications() {
        return notifications.filter(item => isEnabled(item.category));
    }

    function formatTime(timestamp) {
        const minutes = Math.floor(
            Math.max(0, Date.now() - timestamp) / 60000
        );

        if (minutes < 1) return "Agora mesmo";
        if (minutes < 60) return `Há ${minutes} min`;

        const hours = Math.floor(minutes / 60);

        if (hours < 24) return `Há ${hours} h`;

        const days = Math.floor(hours / 24);

        if (days < 7) {
            return `Há ${days} dia${days > 1 ? "s" : ""}`;
        }

        return new Date(timestamp).toLocaleDateString("pt-BR");
    }

    function createElement(tag, className, text) {
        const element = document.createElement(tag);

        if (className) {
            element.className = className;
        }

        if (text !== undefined) {
            element.textContent = text;
        }

        return element;
    }

    function renderNotifications() {
        const visible = getVisibleNotifications();

        const unread = visible.filter(item => !item.read).length;

        // Contador do sino.
        count.hidden = unread === 0;
        count.textContent = unread > 99 ? "99+" : String(unread);

        // Resumo do painel.
        summary.textContent = unread === 0
            ? "Você está em dia com as notificações."
            : `Você tem ${unread} notificação${unread > 1 ? "ões" : ""} não lida${unread > 1 ? "s" : ""}.`;

        list.replaceChildren();

        // Estado vazio.
        if (visible.length === 0) {
            const empty = createElement("div", "notification-empty");

            const icon = createElement("i", "bx bx-check-circle");
            icon.setAttribute("aria-hidden", "true");

            const title = createElement("h3", "", "Tudo em dia!");

            const message = createElement(
                "p",
                "",
                "Nenhuma notificação disponível para as preferências selecionadas."
            );

            empty.append(icon, title, message);
            list.appendChild(empty);

            return;
        }

        // Criar os cartões.
        visible.forEach(notification => {
            const item = createElement(
                "article",
                `notification-item${notification.read ? "" : " unread"}`
            );

            item.tabIndex = 0;

            const iconBox = createElement("div", "notification-icon");

            const icon = createElement(
                "i",
                `bx ${notification.icon || "bx-bell"}`
            );

            icon.setAttribute("aria-hidden", "true");
            iconBox.appendChild(icon);

            const content = createElement("div", "notification-content");

            const title = createElement(
                "h3",
                "",
                notification.title
            );

            const message = createElement(
                "p",
                "",
                notification.message
            );

            const time = createElement(
                "span",
                "notification-time",
                formatTime(notification.createdAt)
            );

            content.append(title, message, time);
            item.append(iconBox, content);

            function markAsRead() {
                const current = notifications.find(
                    entry => entry.id === notification.id
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

            list.appendChild(item);
        });
    }

    function saveNotifications() {
        try {
            localStorage.setItem(
                STORAGE_KEY,
                JSON.stringify(notifications)
            );
        } catch (error) {
            console.error("Erro ao salvar notificações:", error);
        }
    }

    function openPanel() {
        panel.hidden = false;
        button.setAttribute("aria-expanded", "true");

        renderNotifications();
    }

    function closePanel() {
        panel.hidden = true;
        button.setAttribute("aria-expanded", "false");
    }

    // Abrir e fechar pelo sino.
    button.addEventListener("click", event => {
        event.stopPropagation();

        if (panel.hidden) {
            openPanel();
        } else {
            closePanel();
        }
    });

    closeButton.addEventListener("click", closePanel);

    // Fechar clicando fora.
    document.addEventListener("click", event => {
        if (
            !panel.hidden &&
            !panel.contains(event.target) &&
            !button.contains(event.target)
        ) {
            closePanel();
        }
    });

    // Fechar com Escape.
    document.addEventListener("keydown", event => {
        if (event.key === "Escape" && !panel.hidden) {
            closePanel();
            button.focus();
        }
    });

    // Marcar todas como lidas.
    markAllButton.addEventListener("click", () => {
        const visibleIds = new Set(
            getVisibleNotifications().map(item => item.id)
        );

        notifications.forEach(item => {
            if (visibleIds.has(item.id)) {
                item.read = true;
            }
        });

        saveNotifications();
        renderNotifications();
    });

    // Limpar notificações.
    clearButton.addEventListener("click", () => {
        if (!window.confirm("Deseja limpar as notificações exibidas?")) {
            return;
        }

        const visibleIds = new Set(
            getVisibleNotifications().map(item => item.id)
        );

        notifications = notifications.filter(
            item => !visibleIds.has(item.id)
        );

        saveNotifications();
        renderNotifications();
    });

    // Integrar com as configurações.
    document.querySelectorAll("[data-notif]").forEach(checkbox => {
        checkbox.addEventListener("change", () => {
            const preferences = loadPreferences();
            const category = checkbox.dataset.notif;

            if (Object.hasOwn(preferences, category)) {
                preferences[category] = checkbox.checked;

                try {
                    localStorage.setItem(
                        SETTINGS_KEY,
                        JSON.stringify(preferences)
                    );
                } catch (error) {
                    console.error(
                        "Erro ao salvar preferências:",
                        error
                    );
                }
            }

            renderNotifications();
        });
    });

    // API para adicionar notificações a partir de outros scripts.
    window.DataOpsNotifications = {
        add({ category = "alerts", title, message, icon = "bx-bell" }) {
            if (!title || !message) {
                console.error("Informe o título e a mensagem.");
                return;
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

        refresh: renderNotifications
    };

    renderNotifications();

    console.log("DataOps: central de notificações inicializada.");
})();