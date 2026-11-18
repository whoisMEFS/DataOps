/* ==========================================================
   DataOps | Definir acesso (convite) e redefinir senha (recuperação)
   Página: cadastro.html

   O cadastro público está desativado: só entra quem foi convidado.
   - Convite     (#type=invite)   -> nome + senha
   - Recuperação (#type=recovery) -> só a nova senha
========================================================== */

// Lê o hash ANTES de o cliente Supabase consumi-lo.
const params = new URLSearchParams(window.location.hash.replace(/^#/, ""));
const tipoUrl = params.get("type");
const erroUrl = params.get("error_code") || params.get("error");

const { supabase } = await import("../services/supabaseClient.js");
const auth = await import("../services/authService.js");

const titulo = document.getElementById("inviteTitle");
const form = document.getElementById("inviteForm");
const caixaNome = document.getElementById("inviteNameBox");
const campoNome = document.getElementById("inviteName");
const campoEmail = document.getElementById("inviteEmail");
const campoSenha = document.getElementById("invitePassword");
const campoConfirma = document.getElementById("invitePasswordConfirm");
const mensagem = document.getElementById("inviteMessage");
const botao = form.querySelector("button[type='submit']");

const MIN_SENHA = 8;

function mostrar(texto, tipo) {
    mensagem.textContent = texto;
    mensagem.classList.toggle("success", tipo === "success");
    mensagem.hidden = !texto;
}

function bloquearFormulario() {
    form.querySelectorAll("input, button").forEach(function (el) { el.disabled = true; });
}

function irParaDashboard() {
    sessionStorage.removeItem("introPlayed");
    window.location.href = "dashboard.html";
}

const sessao = await auth.getSession();

if (erroUrl || !sessao) {
    bloquearFormulario();
    mostrar("O link é inválido ou expirou. Peça um novo convite ou use \"Esqueci a senha\" na tela de login.");
    throw new Error("Link inválido ou sem sessão");
}

// Sem "type" na URL (ex.: página recarregada), decide pelo estado da conta.
const recuperacao = tipoUrl === "recovery";

campoEmail.value = sessao.user.email || "";
campoEmail.readOnly = true;

if (recuperacao) {
    titulo.textContent = "Nova senha";
    caixaNome.hidden = true;
    campoNome.required = false;
    botao.textContent = "Salvar nova senha";
} else {
    titulo.textContent = "Ativar acesso";
    botao.textContent = "Ativar acesso";
    campoNome.value = (sessao.user.user_metadata && sessao.user.user_metadata.full_name) || "";
}

// Limpa o hash da barra de endereço (os tokens já foram consumidos pelo SDK).
if (window.location.hash) {
    history.replaceState(null, "", window.location.pathname + window.location.search);
}

let enviando = false;

form.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    if (enviando) return;

    const nome = campoNome.value.trim();
    const senha = campoSenha.value;

    if (!recuperacao && !nome) {
        mostrar("Informe o seu nome completo.");
        campoNome.focus();
        return;
    }

    if (senha.length < MIN_SENHA) {
        mostrar("A senha precisa ter pelo menos " + MIN_SENHA + " caracteres.");
        campoSenha.focus();
        return;
    }

    if (senha !== campoConfirma.value) {
        mostrar("As senhas não conferem.");
        campoConfirma.focus();
        return;
    }

    enviando = true;
    botao.disabled = true;
    mostrar("");

    const resultado = await auth.definirSenha({
        senha: senha,
        nomeCompleto: recuperacao ? "" : nome.slice(0, 60)
    });

    if (!resultado.ok) {
        mostrar(resultado.message);
        botao.disabled = false;
        enviando = false;
        return;
    }

    if (!recuperacao) {
        const perfil = await auth.salvarNomeNoPerfil(resultado.user.id, nome.slice(0, 60));

        if (!perfil.ok) {
            mostrar("Senha definida, mas não foi possível salvar o seu nome. Você pode editá-lo em Configurações.", "success");
            setTimeout(irParaDashboard, 3500);
            return;
        }
    }

    mostrar("Pronto! Entrando no painel...", "success");
    setTimeout(irParaDashboard, 800);
});
