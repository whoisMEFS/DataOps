/* ==========================================================
   DataOps | Leitor de CSV (sem dependências)

   - Aceita separador ";" ou "," (decidido pelo cabeçalho, como antes)
   - Aceita campos entre aspas, aspas duplas escapadas ("") e quebras
     de linha dentro de campos entre aspas
   - Ignora BOM e linhas totalmente vazias
========================================================== */

export function lerCsv(texto) {
    const conteudo = String(texto || "").replace(/^\uFEFF/, "");
    const primeiraLinha = conteudo.split(/\r?\n/, 1)[0] || "";
    const separador = primeiraLinha.includes(";") ? ";" : ",";

    const registros = [];
    let campo = "";
    let linha = [];
    let entreAspas = false;

    function fecharCampo() {
        linha.push(campo);
        campo = "";
    }

    function fecharLinha() {
        fecharCampo();

        // Descarta linhas em que todas as colunas estão vazias.
        if (linha.some(function (valor) { return valor.trim() !== ""; })) {
            registros.push(linha);
        }

        linha = [];
    }

    for (let i = 0; i < conteudo.length; i++) {
        const c = conteudo[i];

        if (entreAspas) {
            if (c === '"') {
                if (conteudo[i + 1] === '"') {
                    campo += '"';
                    i++;
                } else {
                    entreAspas = false;
                }
            } else {
                campo += c;
            }
            continue;
        }

        if (c === '"' && campo === "") {
            entreAspas = true;
        } else if (c === separador) {
            fecharCampo();
        } else if (c === "\n") {
            fecharLinha();
        } else if (c === "\r") {
            // CR isolado ou parte de CRLF: o LF seguinte fecha a linha.
            if (conteudo[i + 1] !== "\n") fecharLinha();
        } else {
            campo += c;
        }
    }

    if (campo !== "" || linha.length > 0) fecharLinha();

    const cabecalho = (registros.shift() || []).map(function (coluna) {
        return coluna.trim().toLowerCase();
    });

    return {
        separador: separador,
        cabecalho: cabecalho,
        linhas: registros,
        aspasAbertas: entreAspas
    };
}
