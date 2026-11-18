/* ==========================================================
   DataOps | Página de login (Supabase Auth)
========================================================== */

import * as auth from "../services/authService.js";

const form = document.getElementById("loginForm");
const campoEmail = document.getElementById("loginUser");
const campoSenha = document.getElementById("loginPassword");
const mensagem = document.getElementById("loginMessage");
const botao = form.querySelector("button[type='submit']");

const MOTIVOS = {
    sessao: "Sua sessão expirou. Entre novamente.",
    convite: "O link do convite é inválido ou expirou. Peça um novo convite."
};

function mostrar(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.classList.toggle("success", tipo === "success");
    mensagem.hidden = !texto;
}

function irParaDashboard() {
    sessionStorage.removeItem("introPlayed");
    window.location.href = "dashboard.html";
}

const motivo = new URLSearchParams(window.location.search).get("motivo");
if (motivo && MOTIVOS[motivo]) mostrar(MOTIVOS[motivo]);

// Quem já está autenticado vai direto ao painel.
if (await auth.getSession()) {
    irParaDashboard();
}

let enviando = false;

form.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (enviando) return;

    enviando = true;
    botao.disabled = true;
    const textoOriginal = botao.textContent;
    botao.textContent = "Entrando...";
    mostrar("");

    const resultado = await auth.entrar(campoEmail.value, campoSenha.value);

    if (resultado.ok) {
        irParaDashboard();
        return;
    }

    mostrar(resultado.message);
    campoSenha.value = "";
    campoSenha.focus();
    botao.disabled = false;
    botao.textContent = textoOriginal;
    enviando = false;
});
