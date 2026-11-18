/* ==========================================================
   DataOps | Esqueci a senha (Supabase Auth)
========================================================== */

import * as auth from "../services/authService.js";

const form = document.getElementById("resetForm");
const campoEmail = document.getElementById("resetEmail");
const mensagem = document.getElementById("resetMessage");
const botao = form.querySelector("button[type='submit']");

function mostrar(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.classList.toggle("success", tipo === "success");
    mensagem.hidden = !texto;
}

let enviando = false;

form.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (enviando) return;

    enviando = true;
    botao.disabled = true;
    mostrar("");

    // O link do e-mail leva à página que define a nova senha.
    // Esta URL precisa estar em Authentication > URL Configuration > Redirect URLs.
    const destino = new URL("cadastro.html", window.location.href).href;

    const resultado = await auth.enviarRecuperacao(campoEmail.value, destino);

    if (resultado.ok) {
        mostrar("Se este e-mail tiver acesso ao DataOps, você receberá as instruções em instantes.", "success");
        // Mantém o botão bloqueado por alguns segundos para evitar reenvios em série.
        setTimeout(function () {
            botao.disabled = false;
            enviando = false;
        }, 30000);
        return;
    }

    mostrar(resultado.message);
    botao.disabled = false;
    enviando = false;
});
