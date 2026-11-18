/* ==========================================================
   DataOps | Inicialização protegida do dashboard (módulo)

   1) Exige sessão do Supabase Auth; sem ela, volta ao login.
   2) Confirma no servidor que o usuário continua válido.
   3) Libera a tela e resolve window.DataOpsReady.
   4) Reage a logout em outra aba e a sessão expirada.

   Importante: isto só controla a INTERFACE. A proteção real dos dados
   é o RLS do banco: sem login o Supabase não devolve nenhum dado.
========================================================== */

import { supabase } from "./supabaseClient.js";
import * as auth from "./authService.js";
import * as data from "./dataService.js";

const LOGIN = "Login.html";

function irParaLogin(motivo) {
    window.location.replace(motivo ? LOGIN + "?motivo=" + motivo : LOGIN);
}

function falhar(motivo) {
    if (window.__dataOpsReject) window.__dataOpsReject(new Error("Sem sessão válida"));
    irParaLogin(motivo);
}

const sessao = await auth.getSession();

if (!sessao) {
    falhar();
} else {
    const verificacao = await auth.verificarUsuario();

    if (!verificacao.ok && verificacao.definitivo) {
        await auth.sair();
        falhar("sessao");
    } else {
        // Falha só de comunicação não derruba a sessão: as consultas mostrarão o erro.
        const user = verificacao.ok ? verificacao.user : sessao.user;
        const api = { supabase, auth, data, user };

        window.DataOps = api;
        document.documentElement.removeAttribute("data-auth");
        window.__dataOpsResolve(api);

        auth.aoMudarSessao(function (evento) {
            if (evento === "SIGNED_OUT" && !window.__dataOpsSaindo) irParaLogin("sessao");
        });
    }
}
