/* ==========================================================
   DataOps | Pronto para uso (script clássico, sem módulo)

   Cria window.DataOpsReady, uma Promise que só resolve depois que
   a sessão foi verificada. Os scripts do dashboard fazem:

       const api = await window.DataOpsReady;

   Se não houver sessão válida a Promise é rejeitada e o usuário
   é enviado ao login.
========================================================== */
(function () {
    "use strict";

    window.DataOpsReady = new Promise(function (resolve, reject) {
        window.__dataOpsResolve = resolve;
        window.__dataOpsReject = reject;
    });

    // Evita aviso de "rejeição não tratada" no console.
    window.DataOpsReady.catch(function () { /* tratado por quem usa */ });

    // Fail-closed: se a verificação não terminar, o painel continua oculto
    // e o usuário recebe uma mensagem clara em vez de uma tela vazia.
    setTimeout(function () {
        if (document.documentElement.getAttribute("data-auth") !== "pending") return;

        document.documentElement.setAttribute("data-auth", "error");

        var aviso = document.createElement("div");
        aviso.setAttribute("role", "alert");
        aviso.style.cssText =
            "position:fixed;inset:0;z-index:100000;display:grid;place-items:center;" +
            "background:#0b1220;color:#fff;font:16px system-ui,sans-serif;padding:24px;text-align:center;";
        aviso.textContent =
            "Não foi possível verificar o seu acesso. Verifique a conexão e recarregue a página.";
        document.body.appendChild(aviso);
    }, 12000);
})();
