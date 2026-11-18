/* =========================================================
   DataOps | Sair da conta
   - Botão #logoutButton abre uma confirmação
   - Ao confirmar: limpa a sessão e volta para a tela de login
   ========================================================= */

(() => {
    "use strict";

    /* Página de login (mesma pasta do dashboard.html) */
    const LOGIN_PAGE = "Login.html";

    /*
     * Chaves da SESSÃO que serão apagadas ao sair.
     * Ajuste para as chaves que o seu Login.html grava.
     * Preferências (dataops_prefs) e registros NÃO são apagados.
     */
    const SESSION_KEYS = [
        "dataops_session",
        "dataops_user",
        "dataops_logged",
        "dataops_token",
        "isLoggedIn",
        "loggedUser",
        "usuarioLogado"
    ];

    let dialog = null;

    function buildDialog() {
        if (dialog) return dialog;

        dialog = document.createElement("dialog");
        dialog.className = "logout-dialog";
        dialog.setAttribute("aria-labelledby", "logoutTitle");

        dialog.innerHTML = `
            <div class="logout-dialog-icon" aria-hidden="true">
                <i class="bx bx-log-out"></i>
            </div>

            <h2 id="logoutTitle">Sair da conta?</h2>

            <p>
                Você voltará para a tela de login. Suas preferências e os
                dados continuam salvos na sua conta.
            </p>

            <div class="logout-dialog-actions">
                <button type="button" class="logout-cancel">Cancelar</button>
                <button type="button" class="logout-confirm">
                    <i class="bx bx-log-out" aria-hidden="true"></i> Sair
                </button>
            </div>
        `;

        dialog.querySelector(".logout-cancel")
            .addEventListener("click", () => dialog.close());

        dialog.querySelector(".logout-confirm")
            .addEventListener("click", logout);

        /* clicar fora da caixa fecha */
        dialog.addEventListener("click", event => {
            if (event.target === dialog) dialog.close();
        });

        document.body.appendChild(dialog);

        return dialog;
    }

    async function logout() {
        /* Evita que o aviso de "sessão expirada" apareça num logout normal. */
        window.__dataOpsSaindo = true;

        try {
            const api = await window.DataOpsReady;
            await api.auth.sair();
        } catch (error) {
            console.error("DataOps: erro ao encerrar a sessão:", error);
        }

        /* Limpeza de chaves antigas (versões anteriores guardavam sessão local). */
        try {
            SESSION_KEYS.forEach(key => {
                localStorage.removeItem(key);
                sessionStorage.removeItem(key);
            });

            sessionStorage.clear();
        } catch (error) {
            console.error("DataOps: erro ao limpar a sessão:", error);
        }

        window.location.replace(LOGIN_PAGE);
    }

    function openDialog() {
        const element = buildDialog();

        if (typeof element.showModal === "function") {
            element.showModal();
            element.querySelector(".logout-cancel").focus();
        } else if (window.confirm("Sair da conta?")) {
            logout();
        }
    }

    /*
     * Captura o clique antes de qualquer outro script, para este
     * botão ter um único comportamento.
     */
    document.addEventListener("click", event => {
        const button = event.target.closest("#logoutButton");

        if (!button) return;

        event.preventDefault();
        event.stopImmediatePropagation();

        openDialog();
    }, true);
})();
