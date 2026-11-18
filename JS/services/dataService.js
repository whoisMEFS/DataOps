/* ==========================================================
   DataOps | Serviço de dados (Supabase)

   Único ponto de acesso às consultas compartilhadas entre telas.
   Nenhuma função devolve dados inventados: em caso de falha ela
   LANÇA um Error com mensagem amigável (sem detalhes internos), e
   quem chamou decide como mostrar o erro.
========================================================== */

import { supabase } from "./supabaseClient.js";
import { lerCsv } from "./csv.js";

export { lerCsv };

/* ---------- Erros ---------- */

export function traduzirErro(error, padrao) {
    const texto = String((error && error.message) || "");

    if (error && (error.code === "42501" || /row-level security/i.test(texto))) {
        return "Você não tem permissão para realizar esta operação.";
    }
    if (error && (error.code === "PGRST301" || error.code === "PGRST303" || /jwt/i.test(texto))) {
        return "Sua sessão expirou. Entre novamente.";
    }
    if (error && error.code === "23514") {
        return "Algum dado enviado não é válido. Confira o arquivo e tente de novo.";
    }
    if (error && error.code === "23505") {
        return "Já existe um registro com esse identificador.";
    }
    if (/failed to fetch|networkerror|load failed|fetch failed/i.test(texto)) {
        return "Sem conexão com o servidor. Verifique sua internet e tente de novo.";
    }

    return padrao || "Não foi possível concluir a operação. Tente novamente.";
}

// Marca erros cuja mensagem já é segura e clara para mostrar ao usuário.
export function erroAmigavel(mensagem) {
    const erro = new Error(mensagem);
    erro.amigavel = true;
    return erro;
}

function lancar(error, padrao) {
    // Detalhe técnico fica só no console, nunca na tela.
    console.error("DataOps:", error);
    throw erroAmigavel(traduzirErro(error, padrao));
}

/* ---------- Status ---------- */

export const ROTULO_STATUS = {
    concluido: "Concluído",
    pendente: "Pendente",
    em_andamento: "Em andamento",
    erro: "Erro",
    outro: "Outro"
};

// Mesmos sinônimos que o painel já reconhecia antes da migração.
const GRUPOS_STATUS = {
    concluido: [
        "concluido", "concluida", "concluidos", "concluidas", "concluido com sucesso",
        "finalizado", "finalizada", "finalizados", "finalizadas",
        "completed", "complete", "done", "success", "sucesso"
    ],
    pendente: ["pendente", "pendentes", "pending", "aguardando"],
    em_andamento: [
        "em andamento", "em_andamento", "andamento", "processando",
        "em processamento", "in progress", "in_progress", "processing"
    ],
    erro: [
        "erro", "error", "falha", "falhou", "falhado", "falhada", "com erro",
        "erro de processamento", "failed", "failure", "rejected", "rejeitado", "rejeitada"
    ]
};

export function normalizarStatus(texto) {
    const limpo = String(texto || "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .trim()
        .toLowerCase()
        .replace(/\s+/g, " ");

    for (const [canonico, sinonimos] of Object.entries(GRUPOS_STATUS)) {
        if (sinonimos.includes(limpo)) return canonico;
    }

    return "outro";
}

/* ---------- Registros (Central de Dados) ---------- */

const TAMANHO_PAGINA = 1000;      // limite por consulta do Supabase
const LIMITE_REGISTROS = 10000;   // teto de linhas carregadas na tabela

export async function listarRegistros() {
    const registros = [];

    for (let de = 0; de < LIMITE_REGISTROS; de += TAMANHO_PAGINA) {
        const { data, error } = await supabase
            .from("records")
            .select("external_id, title, category, status, sector")
            .order("created_at", { ascending: true })
            .order("id", { ascending: true })
            .range(de, de + TAMANHO_PAGINA - 1);

        if (error) lancar(error, "Não foi possível carregar os registros.");

        registros.push(...data);

        if (data.length < TAMANHO_PAGINA) break;
    }

    return { registros: registros, truncado: registros.length >= LIMITE_REGISTROS };
}

/*
 * Importa linhas já lidas do CSV para um setor.
 * linhas: array de { id, registro, categoria, status }
 * Devolve { importados, duplicados, invalidos, statusDesconhecidos }.
 *
 * Duplicados (mesmo setor + mesmo id) são ignorados pelo banco.
 * Cada lote é gravado de forma atômica; arquivos até 1000 linhas
 * são um único lote.
 */
export async function importarRegistros(setor, linhas) {
    const vistos = new Set();
    const validos = [];
    let invalidos = 0;
    let duplicadosNoArquivo = 0;
    let statusDesconhecidos = 0;

    linhas.forEach(function (linha) {
        const externalId = String(linha.id || "").trim();
        const titulo = String(linha.registro || "").trim();
        const categoria = String(linha.categoria || "").trim() || "Sem categoria";

        if (!externalId || externalId.length > 60 || !titulo || titulo.length > 200 || categoria.length > 80) {
            invalidos++;
            return;
        }

        if (vistos.has(externalId)) {
            duplicadosNoArquivo++;
            return;
        }
        vistos.add(externalId);

        const status = normalizarStatus(linha.status);
        if (status === "outro") statusDesconhecidos++;

        validos.push({
            external_id: externalId,
            title: titulo,
            category: categoria,
            status: status,
            sector: setor
        });
    });

    let importados = 0;

    for (let i = 0; i < validos.length; i += TAMANHO_PAGINA) {
        const lote = validos.slice(i, i + TAMANHO_PAGINA);

        const { data, error } = await supabase
            .from("records")
            .upsert(lote, { onConflict: "sector,external_id", ignoreDuplicates: true })
            .select("id");

        if (error) {
            const erroParcial = erroAmigavel(
                traduzirErro(error, "Não foi possível gravar os registros.") +
                (importados > 0 ? " " + importados + " registro(s) já tinham sido gravados antes da falha." : "")
            );
            console.error("DataOps:", error);
            throw erroParcial;
        }

        importados += data.length;
    }

    return {
        importados: importados,
        duplicados: duplicadosNoArquivo + (validos.length - importados),
        invalidos: invalidos,
        statusDesconhecidos: statusDesconhecidos
    };
}

/* ---------- Indicadores (calculados no banco) ---------- */

export async function resumoGeral() {
    const { data, error } = await supabase.rpc("rpc_overview_summary");
    if (error) lancar(error, "Não foi possível carregar os indicadores.");

    return data[0];
}

export async function registrosPorCategoria() {
    const { data, error } = await supabase.rpc("rpc_overview_by_category");
    if (error) lancar(error, "Não foi possível carregar os dados por categoria.");

    return data;
}

export async function serieDoPeriodo(periodo) {
    const { data, error } = await supabase.rpc("rpc_overview_series", { p_period: periodo });
    if (error) lancar(error, "Não foi possível carregar a evolução dos dados.");

    return data;
}

export async function registrosRecentes(limite = 5) {
    const { data, error } = await supabase
        .from("records")
        .select("external_id, title, category, status, sector, created_at")
        .order("created_at", { ascending: false })
        .order("id", { ascending: false })
        .limit(limite);

    if (error) lancar(error, "Não foi possível carregar as atividades recentes.");

    return data;
}
