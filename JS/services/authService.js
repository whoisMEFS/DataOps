/* ==========================================================
   DataOps | Serviço de autenticação (Supabase Auth)

   Centraliza login, logout, sessão, recuperação e definição de senha.
   As funções devolvem { ok, message, ... } e nunca expõem detalhes
   internos do servidor na mensagem mostrada ao usuário.
========================================================== */

import { supabase } from "./supabaseClient.js";

const PADRAO = "Não foi possível concluir a operação. Tente novamente.";

const MENSAGENS = {
    invalid_credentials: "E-mail ou senha incorretos.",
    email_not_confirmed: "Seu acesso ainda não foi ativado. Use o link do convite enviado ao seu e-mail.",
    user_banned: "Este acesso está desativado. Fale com o administrador.",
    over_request_rate_limit: "Muitas tentativas. Aguarde alguns minutos e tente de novo.",
    over_email_send_rate_limit: "Muitos e-mails solicitados. Aguarde alguns minutos e tente de novo.",
    same_password: "A nova senha precisa ser diferente da senha atual.",
    weak_password: "Senha fraca. Use pelo menos 8 caracteres, combinando letras e números.",
    session_not_found: "Sua sessão expirou. Entre novamente.",
    refresh_token_not_found: "Sua sessão expirou. Entre novamente.",
    refresh_token_already_used: "Sua sessão expirou. Entre novamente.",
    user_not_found: "Sua sessão expirou. Entre novamente."
};

export function mensagemDeErro(error, padrao = PADRAO) {
    if (!error) return padrao;

    if (error.code && MENSAGENS[error.code]) return MENSAGENS[error.code];

    // Sem rede / servidor inacessível
    if (error.name === "AuthRetryableFetchError" || error.status === 0) {
        return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
    }

    return padrao;
}

function erroDeSessao(error) {
    if (!error) return false;
    const codigos = ["session_not_found", "refresh_token_not_found", "refresh_token_already_used", "user_not_found", "bad_jwt"];
    return codigos.includes(error.code) || error.status === 401 || error.status === 403;
}

/* ---------- Sessão ---------- */

export async function getSession() {
    const { data, error } = await supabase.auth.getSession();
    if (error) return null;
    return data.session || null;
}

/*
 * Confirma no servidor que o usuário da sessão ainda existe e está ativo.
 * definitivo = true  -> a sessão é inválida (mandar para o login)
 * definitivo = false -> falha de comunicação (não é motivo para deslogar)
 */
export async function verificarUsuario() {
    const { data, error } = await supabase.auth.getUser();

    if (error || !data || !data.user) {
        return { ok: false, definitivo: erroDeSessao(error) || !error, error };
    }

    return { ok: true, user: data.user };
}

export function aoMudarSessao(callback) {
    const { data } = supabase.auth.onAuthStateChange((evento, sessao) => callback(evento, sessao));
    return () => data.subscription.unsubscribe();
}

/* ---------- Login / logout ---------- */

export async function entrar(email, senha) {
    const { data, error } = await supabase.auth.signInWithPassword({
        email: String(email || "").trim(),
        password: String(senha || "")
    });

    if (error) return { ok: false, message: mensagemDeErro(error, "Não foi possível entrar. Tente novamente.") };

    return { ok: true, user: data.user };
}

export async function sair() {
    // scope "local": encerra só este navegador, sem derrubar outros dispositivos.
    const { error } = await supabase.auth.signOut({ scope: "local" });
    return error ? { ok: false, message: mensagemDeErro(error) } : { ok: true };
}

/* ---------- Recuperação de senha ---------- */

export async function enviarRecuperacao(email, redirectTo) {
    const { error } = await supabase.auth.resetPasswordForEmail(String(email || "").trim(), { redirectTo });

    // Falhas de limite/rede são informadas; "e-mail inexistente" nunca é revelado.
    if (error && (error.code === "over_email_send_rate_limit" || error.code === "over_request_rate_limit"
        || error.name === "AuthRetryableFetchError" || error.status === 0)) {
        return { ok: false, message: mensagemDeErro(error) };
    }

    return { ok: true };
}

/* ---------- Definir senha (convite ou recuperação) ---------- */

export async function definirSenha({ senha, nomeCompleto }) {
    const atualizacao = { password: senha };
    if (nomeCompleto) atualizacao.data = { full_name: nomeCompleto };

    const { data, error } = await supabase.auth.updateUser(atualizacao);

    if (error) return { ok: false, message: mensagemDeErro(error, "Não foi possível salvar a senha. Tente novamente.") };

    return { ok: true, user: data.user };
}

export async function salvarNomeNoPerfil(userId, nomeCompleto) {
    const { error } = await supabase
        .from("profiles")
        .update({ full_name: nomeCompleto })
        .eq("id", userId);

    return error ? { ok: false, message: mensagemDeErro(error) } : { ok: true };
}
